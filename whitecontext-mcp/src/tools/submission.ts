import { z } from "zod";
import { WhiteContextAPI } from "../api/whitecontext";
import type { StoredJob, StoredBatch } from "../types";

// Schemas for tool inputs
export const SubmitJobSchema = z.object({
  url: z.string().url().describe("The URL to analyze"),
  webhook_url: z
    .string()
    .url()
    .optional()
    .describe("Optional webhook URL for job completion notification"),
});

export const SubmitBulkJobSchema = z.object({
  urls: z
    .array(z.string().url())
    .min(1)
    .max(100)
    .describe("Array of URLs to analyze (max 100)"),
  webhook_url: z
    .string()
    .url()
    .optional()
    .describe("Optional webhook URL for batch completion notification"),
});

// Tool handlers
export function createSubmissionTools(
  api: WhiteContextAPI,
  jobTrackerStub: DurableObjectStub
) {
  return {
    submit_job: async (args: z.infer<typeof SubmitJobSchema>) => {
      try {
        const response = await api.submitJob({
          url: args.url,
          webhook_url: args.webhook_url,
        });

        // Store job in tracker
        const storedJob: StoredJob = {
          job_id: response.job_id,
          url: args.url,
          status: "processing",
          created_at: new Date().toISOString(),
        };

        await jobTrackerStub.fetch("http://do/store-job", {
          method: "POST",
          body: JSON.stringify(storedJob),
        });

        return {
          content: [
            {
              type: "text",
              text: `Job submitted successfully!\n\nJob ID: ${response.job_id}\nURL: ${args.url}\nStatus: ${response.status}\n\nUse check_job_status or get_job_results to retrieve the analysis when complete.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error submitting job: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },

    submit_bulk_job: async (args: z.infer<typeof SubmitBulkJobSchema>) => {
      try {
        const response = await api.submitBulkJob({
          urls: args.urls,
          webhook_url: args.webhook_url,
        });

        // Store batch in tracker
        const storedBatch: StoredBatch = {
          batch_id: response.batch_id,
          job_ids: response.job_ids,
          urls: args.urls,
          status: "processing",
          created_at: new Date().toISOString(),
        };

        await jobTrackerStub.fetch("http://do/store-batch", {
          method: "POST",
          body: JSON.stringify(storedBatch),
        });

        // Store individual jobs
        for (let i = 0; i < response.job_ids.length; i++) {
          const storedJob: StoredJob = {
            job_id: response.job_ids[i],
            url: args.urls[i],
            status: "processing",
            created_at: new Date().toISOString(),
            batch_id: response.batch_id,
          };

          await jobTrackerStub.fetch("http://do/store-job", {
            method: "POST",
            body: JSON.stringify(storedJob),
          });
        }

        return {
          content: [
            {
              type: "text",
              text: `Batch submitted successfully!\n\nBatch ID: ${response.batch_id}\nTotal URLs: ${response.total_urls}\nJob IDs: ${response.job_ids.join(", ")}\nStatus: ${response.status}\n\nUse get_batch_results to retrieve results when processing is complete.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error submitting bulk job: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
