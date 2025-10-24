API Documentation
Authentication
All API endpoints require authentication using an API key. Include your API key in the request headers:

x-api-key: your-api-key
or
Authorization: Bearer your-api-key
Base URL
https://whitecontext.com/api
Single URL Analysis
Submit URL for Analysis
Endpoint:

POST /analyze
Request Body:

{
  "url": "https://example.com",
  "webhook_url": "https://your-webhook.com/endpoint" // optional
}
Response (202 Accepted):

{
  "job_id": "job_abc123",
  "status": "processing",
  "message": "Job submitted successfully"
}
Check Analysis Status
Endpoint:

GET /analyze/{job_id}
Response (when processing):

{
  "job_id": "job_abc123",
  "status": "processing",
  "current_stage": "analyzing_content"
}
Response (when completed):

{
  "job_id": "job_abc123",
  "status": "completed",
  "result": {
    "company_name": "Example Corp",
    "tldr": "Brief description...",
    "business_model": {
      "type": "B2B",
      "target_market": "Enterprises"
    },
    "company_intelligence": {...},
    "products_services": [...],
    // ... more fields
  }
}
Bulk URL Analysis
Submit Multiple URLs
Endpoint:

POST /analyze/bulk
Request Body:

{
  "urls": [
    "https://example1.com",
    "https://example2.com",
    "https://example3.com"
  ],
  "webhook_url": "https://your-webhook.com/endpoint" // optional
}
Response (202 Accepted):

{
  "batch_id": "batch_xyz789",
  "job_ids": [
    "job_abc123",
    "job_def456",
    "job_ghi789"
  ],
  "status": "processing",
  "total_urls": 3
}
Check Batch Status
Endpoint:

GET /analyze/bulk/{batch_id}
Response:

{
  "batch_id": "batch_xyz789",
  "status": "processing",
  "progress": {
    "total": 10,
    "completed": 7,
    "failed": 1,
    "processing": 2,
    "percentage": 80
  },
  "jobs": [
    {
      "job_id": "job_abc123",
      "url": "https://example1.com",
      "status": "completed"
    }
    // ... more jobs
  ]
}
Download Batch Results
Endpoint:

GET /analyze/bulk/{batch_id}/results?format=json|csv
Download completed results in JSON or CSV format. Only available when batch status is "completed".

Results Download
Download Single Job Results
Endpoint:

GET /analyze/{job_id}/results?format=json|csv
Download completed results for a single job. Returns 202 if job is still processing.

Query Parameters:

format: "json" (default) or "csv"
Webhooks
Webhook Configuration
Receive real-time notifications when your jobs complete by providing a webhook_url when submitting jobs.

Webhook Events
job.completed: Single job completed successfully
job.failed: Single job failed
batch.completed: Batch job completed
batch.failed: All jobs in batch failed
Webhook Payload
{
  "event": "batch.completed",
  "timestamp": "2025-09-30T12:00:00Z",
  "data": {
    "batch_id": "batch_xyz789",
    "status": "completed",
    "results": {
      "total": 10,
      "completed": 9,
      "failed": 1
    },
    "metadata": {
      "results_url": "https://whitecontext.com/api/analyze/bulk/batch_xyz789/results"
    }
  }
}
Webhook Security
Webhooks include an X-Webhook-Signature header with HMAC-SHA256 signature. Verify this signature to ensure requests are from WhiteContext.

Retry Logic
Failed webhook deliveries are retried up to 5 times with exponential backoff (30s, 60s, 120s, 240s, 480s).

Rate Limits
•
Single URL: 10 requests per minute
•
Bulk URLs: Up to 100 URLs per request
•
Overall: 1000 URLs per hour
Error Codes
Status Code	Description
200	Success
202	Accepted - Job submitted for processing
400	Bad Request - Invalid parameters
401	Unauthorized - Invalid or missing API key
404	Not Found - Job not found
429	Too Many Requests - Rate limit exceeded
500	Internal Server Error
