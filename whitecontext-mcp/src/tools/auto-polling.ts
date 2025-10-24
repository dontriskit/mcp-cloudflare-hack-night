import { z } from "zod";
import { WhiteContextAPI } from "../api/whitecontext";
import type { StoredJob, StoredBatch } from "../types";

// Schemas for tool inputs
export const AnalyzeUrlWaitSchema = z.object({
  url: z.string().url().describe("The URL to analyze"),
  timeout_seconds: z
    .number()
    .optional()
    .default(300)
    .describe("Maximum time to wait for completion in seconds (default 300)"),
  webhook_url: z
    .string()
    .url()
    .optional()
    .describe("Optional webhook URL for job completion notification"),
});

export const AnalyzeBulkWaitSchema = z.object({
  urls: z
    .array(z.string().url())
    .min(1)
    .max(100)
    .describe("Array of URLs to analyze (max 100)"),
  timeout_seconds: z
    .number()
    .optional()
    .default(600)
    .describe("Maximum time to wait for completion in seconds (default 600)"),
  webhook_url: z
    .string()
    .url()
    .optional()
    .describe("Optional webhook URL for batch completion notification"),
});

// Tool handlers
export function createAutoPollingTools(
  api: WhiteContextAPI,
  jobTrackerStub: DurableObjectStub,
  resultsCacheStub: DurableObjectStub
) {
  return {
    analyze_url_wait: async (args: z.infer<typeof AnalyzeUrlWaitSchema>) => {
      try {
        // Check cache first
        const cacheResp = await resultsCacheStub.fetch(
          `http://do/cache?url=${encodeURIComponent(args.url)}`
        );
        const cached = await cacheResp.json();

        if (cached && cached.result) {
          return {
            content: [
              {
                type: "text",
                text: `# Analysis Results (from cache)\n\n**URL:** ${args.url}\n**Company:** ${cached.result.company_name}\n\n## Summary\n${cached.result.tldr}\n\n## Business Model\nType: ${cached.result.business_model.type}\nTarget Market: ${cached.result.business_model.target_market}\n\n## Full Results\n${JSON.stringify(cached.result, null, 2)}`,
              },
            ],
          };
        }

        // Submit job
        const submitResponse = await api.submitJob({
          url: args.url,
          webhook_url: args.webhook_url,
        });

        const jobId = submitResponse.job_id;

        // Store job in tracker
        const storedJob: StoredJob = {
          job_id: jobId,
          url: args.url,
          status: "processing",
          created_at: new Date().toISOString(),
        };

        await jobTrackerStub.fetch("http://do/store-job", {
          method: "POST",
          body: JSON.stringify(storedJob),
        });

        // Wait for completion
        const result = await api.waitForJob(
          jobId,
          args.timeout_seconds * 1000,
          5000
        );

        if (result.status === "failed") {
          return {
            content: [
              {
                type: "text",
                text: `Analysis failed for ${args.url}\n\nJob ID: ${jobId}\nError: ${result.error || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }

        if (result.status === "completed") {
          // Cache the result
          await resultsCacheStub.fetch("http://do/cache", {
            method: "POST",
            body: JSON.stringify({
              url: args.url,
              job_id: jobId,
              result: result.result,
            }),
          });

          return {
            content: [
              {
                type: "text",
                text: `# Analysis Results\n\n**URL:** ${args.url}\n**Job ID:** ${jobId}\n**Company:** ${result.result.company_name}\n\n## Summary\n${result.result.tldr}\n\n## Business Model\nType: ${result.result.business_model.type}\nTarget Market: ${result.result.business_model.target_market}\n\n## Full Results\n${JSON.stringify(result.result, null, 2)}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Analysis still processing after ${args.timeout_seconds} seconds.\n\nJob ID: ${jobId}\nUse get_job_results to check later.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error during analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },

    analyze_bulk_wait: async (args: z.infer<typeof AnalyzeBulkWaitSchema>) => {
      try {
        // Submit batch
        const submitResponse = await api.submitBulkJob({
          urls: args.urls,
          webhook_url: args.webhook_url,
        });

        const batchId = submitResponse.batch_id;

        // Store batch in tracker
        const storedBatch: StoredBatch = {
          batch_id: batchId,
          job_ids: submitResponse.job_ids,
          urls: args.urls,
          status: "processing",
          created_at: new Date().toISOString(),
        };

        await jobTrackerStub.fetch("http://do/store-batch", {
          method: "POST",
          body: JSON.stringify(storedBatch),
        });

        // Store individual jobs
        for (let i = 0; i < submitResponse.job_ids.length; i++) {
          const storedJob: StoredJob = {
            job_id: submitResponse.job_ids[i],
            url: args.urls[i],
            status: "processing",
            created_at: new Date().toISOString(),
            batch_id: batchId,
          };

          await jobTrackerStub.fetch("http://do/store-job", {
            method: "POST",
            body: JSON.stringify(storedJob),
          });
        }

        // Wait for batch completion
        const result = await api.waitForBatch(
          batchId,
          args.timeout_seconds * 1000,
          10000
        );

        // Cache completed results
        for (const job of result.jobs) {
          if (job.status === "completed" && job.result) {
            await resultsCacheStub.fetch("http://do/cache", {
              method: "POST",
              body: JSON.stringify({
                url: job.url,
                job_id: job.job_id,
                result: job.result,
              }),
            });
          }
        }

        const summary = `# Batch Analysis Results\n\n**Batch ID:** ${batchId}\n**Total URLs:** ${result.progress.total}\n**Completed:** ${result.progress.completed}\n**Failed:** ${result.progress.failed}\n**Processing:** ${result.progress.processing}\n**Progress:** ${result.progress.percentage}%\n\n`;

        const jobSummaries = result.jobs
          .map((job, idx) => {
            if (job.status === "completed" && job.result) {
              return `### ${idx + 1}. ${job.url}\n✅ **Status:** Completed\n**Company:** ${job.result.company_name}\n**Summary:** ${job.result.tldr}\n`;
            } else if (job.status === "failed") {
              return `### ${idx + 1}. ${job.url}\n❌ **Status:** Failed\n**Error:** ${job.error || "Unknown"}\n`;
            } else {
              return `### ${idx + 1}. ${job.url}\n⏳ **Status:** ${job.status}\n`;
            }
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: summary + jobSummaries,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error during batch analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
