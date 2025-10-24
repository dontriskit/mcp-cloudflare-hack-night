// WhiteContext API Types based on api-docs.md

export interface JobSubmitRequest {
  url: string;
  webhook_url?: string;
}

export interface BulkSubmitRequest {
  urls: string[];
  webhook_url?: string;
}

export interface JobSubmitResponse {
  job_id: string;
  status: "processing";
  message: string;
}

export interface BulkSubmitResponse {
  batch_id: string;
  job_ids: string[];
  status: "processing";
  total_urls: number;
}

export interface JobStatusProcessing {
  job_id: string;
  status: "processing";
  current_stage: string;
}

export interface CompanyResult {
  company_name: string;
  tldr: string;
  business_model: {
    type: string;
    target_market: string;
  };
  company_intelligence: Record<string, unknown>;
  products_services: unknown[];
  [key: string]: unknown;
}

export interface JobStatusCompleted {
  job_id: string;
  status: "completed";
  result: CompanyResult;
}

export interface JobStatusFailed {
  job_id: string;
  status: "failed";
  error?: string;
}

export type JobStatus = JobStatusProcessing | JobStatusCompleted | JobStatusFailed;

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  percentage: number;
}

export interface BatchJob {
  job_id: string;
  url: string;
  status: "processing" | "completed" | "failed";
  result?: CompanyResult;
  error?: string;
}

export interface BatchStatus {
  batch_id: string;
  status: "processing" | "completed" | "failed";
  progress: BatchProgress;
  jobs: BatchJob[];
}

export interface WebhookEvent {
  event: "job.completed" | "job.failed" | "batch.completed" | "batch.failed";
  timestamp: string;
  data: {
    job_id?: string;
    batch_id?: string;
    status: string;
    result?: CompanyResult;
    results?: {
      total: number;
      completed: number;
      failed: number;
    };
    metadata?: {
      results_url: string;
    };
  };
}

export interface ApiError {
  error: string;
  message?: string;
  status?: number;
}

// Internal storage types for Durable Objects
export interface StoredJob {
  job_id: string;
  url: string;
  status: "processing" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  batch_id?: string;
}

export interface StoredBatch {
  batch_id: string;
  job_ids: string[];
  urls: string[];
  status: "processing" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
}

export interface CachedResult {
  job_id: string;
  url: string;
  result: CompanyResult;
  cached_at: string;
  ttl: number; // Time to live in seconds
}
