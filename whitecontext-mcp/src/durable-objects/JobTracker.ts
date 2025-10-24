import type { DurableObject } from "cloudflare:workers";
import type { StoredJob, StoredBatch } from "../types";

export class JobTracker implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  // Store a new job
  async storeJob(job: StoredJob): Promise<void> {
    await this.state.storage.put(`job:${job.job_id}`, job);

    // Add to history list (keep last 100 jobs)
    const history = (await this.state.storage.get<string[]>("job_history")) || [];
    history.unshift(job.job_id);
    if (history.length > 100) {
      history.pop();
    }
    await this.state.storage.put("job_history", history);
  }

  // Store a new batch
  async storeBatch(batch: StoredBatch): Promise<void> {
    await this.state.storage.put(`batch:${batch.batch_id}`, batch);

    // Add to batch history
    const history = (await this.state.storage.get<string[]>("batch_history")) || [];
    history.unshift(batch.batch_id);
    if (history.length > 100) {
      history.pop();
    }
    await this.state.storage.put("batch_history", history);
  }

  // Update job status
  async updateJobStatus(
    jobId: string,
    status: "processing" | "completed" | "failed",
    completedAt?: string
  ): Promise<void> {
    const job = await this.state.storage.get<StoredJob>(`job:${jobId}`);
    if (job) {
      job.status = status;
      if (completedAt) {
        job.completed_at = completedAt;
      }
      await this.state.storage.put(`job:${jobId}`, job);
    }
  }

  // Update batch status
  async updateBatchStatus(
    batchId: string,
    status: "processing" | "completed" | "failed",
    completedAt?: string
  ): Promise<void> {
    const batch = await this.state.storage.get<StoredBatch>(`batch:${batchId}`);
    if (batch) {
      batch.status = status;
      if (completedAt) {
        batch.completed_at = completedAt;
      }
      await this.state.storage.put(`batch:${batchId}`, batch);
    }
  }

  // Get job
  async getJob(jobId: string): Promise<StoredJob | null> {
    return (await this.state.storage.get<StoredJob>(`job:${jobId}`)) || null;
  }

  // Get batch
  async getBatch(batchId: string): Promise<StoredBatch | null> {
    return (await this.state.storage.get<StoredBatch>(`batch:${batchId}`)) || null;
  }

  // List recent jobs
  async listJobs(limit: number = 20): Promise<StoredJob[]> {
    const history = (await this.state.storage.get<string[]>("job_history")) || [];
    const jobs: StoredJob[] = [];

    for (const jobId of history.slice(0, limit)) {
      const job = await this.getJob(jobId);
      if (job) {
        jobs.push(job);
      }
    }

    return jobs;
  }

  // List recent batches
  async listBatches(limit: number = 20): Promise<StoredBatch[]> {
    const history = (await this.state.storage.get<string[]>("batch_history")) || [];
    const batches: StoredBatch[] = [];

    for (const batchId of history.slice(0, limit)) {
      const batch = await this.getBatch(batchId);
      if (batch) {
        batches.push(batch);
      }
    }

    return batches;
  }

  // Webhook configuration
  async setWebhookUrl(url: string): Promise<void> {
    await this.state.storage.put("webhook_url", url);
  }

  async getWebhookUrl(): Promise<string | null> {
    return (await this.state.storage.get<string>("webhook_url")) || null;
  }

  // HTTP handler for Durable Object
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === "POST" && path === "/store-job") {
        const job = await request.json<StoredJob>();
        await this.storeJob(job);
        return Response.json({ success: true });
      }

      if (request.method === "POST" && path === "/store-batch") {
        const batch = await request.json<StoredBatch>();
        await this.storeBatch(batch);
        return Response.json({ success: true });
      }

      if (request.method === "GET" && path.startsWith("/job/")) {
        const jobId = path.replace("/job/", "");
        const job = await this.getJob(jobId);
        return Response.json(job);
      }

      if (request.method === "GET" && path.startsWith("/batch/")) {
        const batchId = path.replace("/batch/", "");
        const batch = await this.getBatch(batchId);
        return Response.json(batch);
      }

      if (request.method === "GET" && path === "/jobs") {
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const jobs = await this.listJobs(limit);
        return Response.json(jobs);
      }

      if (request.method === "GET" && path === "/batches") {
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const batches = await this.listBatches(limit);
        return Response.json(batches);
      }

      if (request.method === "POST" && path === "/webhook") {
        const { url } = await request.json<{ url: string }>();
        await this.setWebhookUrl(url);
        return Response.json({ success: true });
      }

      if (request.method === "GET" && path === "/webhook") {
        const webhookUrl = await this.getWebhookUrl();
        return Response.json({ webhook_url: webhookUrl });
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  }
}
