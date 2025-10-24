import type {
  JobSubmitRequest,
  BulkSubmitRequest,
  JobSubmitResponse,
  BulkSubmitResponse,
  JobStatus,
  BatchStatus,
  ApiError,
} from "../types";

export class WhiteContextAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl: string = "https://whitecontext.com/api") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: ApiError;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = {
          error: `HTTP ${response.status}`,
          message: errorText || response.statusText,
          status: response.status,
        };
      }
      throw new Error(
        `WhiteContext API Error (${response.status}): ${errorData.message || errorData.error}`
      );
    }

    return response.json();
  }

  // Single URL Analysis
  async submitJob(data: JobSubmitRequest): Promise<JobSubmitResponse> {
    return this.request<JobSubmitResponse>("/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return this.request<JobStatus>(`/analyze/${jobId}`);
  }

  async getJobResults(
    jobId: string,
    format: "json" | "csv" = "json"
  ): Promise<JobStatus | string> {
    const endpoint = `/analyze/${jobId}/results?format=${format}`;
    if (format === "csv") {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { "x-api-key": this.apiKey },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      return response.text();
    }
    return this.request<JobStatus>(endpoint);
  }

  // Bulk URL Analysis
  async submitBulkJob(data: BulkSubmitRequest): Promise<BulkSubmitResponse> {
    return this.request<BulkSubmitResponse>("/analyze/bulk", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getBatchStatus(batchId: string): Promise<BatchStatus> {
    return this.request<BatchStatus>(`/analyze/bulk/${batchId}`);
  }

  async getBatchResults(
    batchId: string,
    format: "json" | "csv" = "json"
  ): Promise<BatchStatus | string> {
    const endpoint = `/analyze/bulk/${batchId}/results?format=${format}`;
    if (format === "csv") {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { "x-api-key": this.apiKey },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      return response.text();
    }
    return this.request<BatchStatus>(endpoint);
  }

  // Polling helpers
  async waitForJob(
    jobId: string,
    timeoutMs: number = 300000,
    pollIntervalMs: number = 5000
  ): Promise<JobStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getJobStatus(jobId);

      if (status.status === "completed" || status.status === "failed") {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
  }

  async waitForBatch(
    batchId: string,
    timeoutMs: number = 600000,
    pollIntervalMs: number = 10000
  ): Promise<BatchStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getBatchStatus(batchId);

      if (status.status === "completed" || status.status === "failed") {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Batch ${batchId} timed out after ${timeoutMs}ms`);
  }
}
