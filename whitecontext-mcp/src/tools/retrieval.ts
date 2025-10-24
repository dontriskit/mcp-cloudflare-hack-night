import { z } from "zod";
import { WhiteContextAPI } from "../api/whitecontext";
import type { JobStatus, BatchStatus } from "../types";

// Schemas for tool inputs
export const GetJobResultsSchema = z.object({
  job_id: z.string().describe("The job ID to retrieve results for"),
  format: z
    .enum(["json", "csv"])
    .optional()
    .default("json")
    .describe("Output format (json or csv)"),
});

export const GetBatchResultsSchema = z.object({
  batch_id: z.string().describe("The batch ID to retrieve results for"),
  format: z
    .enum(["json", "csv"])
    .optional()
    .default("json")
    .describe("Output format (json or csv)"),
});

export const CheckJobStatusSchema = z.object({
  job_id: z.string().describe("The job ID to check status for"),
});

export const DownloadResultsSchema = z.object({
  job_id: z.string().optional().describe("Job ID for single job results"),
  batch_id: z.string().optional().describe("Batch ID for batch results"),
  format: z
    .enum(["json", "csv"])
    .default("csv")
    .describe("Download format (csv recommended for spreadsheets)"),
});

export const ListJobsSchema = z.object({
  limit: z
    .number()
    .optional()
    .default(20)
    .describe("Maximum number of jobs to list (default 20)"),
});

// Tool handlers
export function createRetrievalTools(
  api: WhiteContextAPI,
  jobTrackerStub: DurableObjectStub,
  resultsCacheStub: DurableObjectStub
) {
  return {
    get_job_results: async (args: z.infer<typeof GetJobResultsSchema>) => {
      try {
        // Check cache first
        const job = await (
          await jobTrackerStub.fetch("http://do/job/" + args.job_id)
        ).json();

        if (job && job.url) {
          const cacheResp = await resultsCacheStub.fetch(
            `http://do/cache?url=${encodeURIComponent(job.url)}`
          );
          const cached = await cacheResp.json();

          if (cached && cached.result) {
            return {
              content: [
                {
                  type: "text",
                  text: `# Cached Results for Job ${args.job_id}\n\n${JSON.stringify(cached.result, null, 2)}`,
                },
              ],
            };
          }
        }

        // Fetch from API
        const result = await api.getJobResults(args.job_id, args.format);

        if (typeof result === "string") {
          // CSV format
          return {
            content: [{ type: "text", text: result }],
          };
        }

        const jobStatus = result as JobStatus;

        if (jobStatus.status === "processing") {
          return {
            content: [
              {
                type: "text",
                text: `Job ${args.job_id} is still processing. Current stage: ${jobStatus.current_stage || "unknown"}`,
              },
            ],
          };
        }

        if (jobStatus.status === "failed") {
          return {
            content: [
              {
                type: "text",
                text: `Job ${args.job_id} failed. Error: ${jobStatus.error || "Unknown error"}`,
              },
            ],
          };
        }

        // Cache the result
        if (job && job.url && jobStatus.status === "completed") {
          await resultsCacheStub.fetch("http://do/cache", {
            method: "POST",
            body: JSON.stringify({
              url: job.url,
              job_id: args.job_id,
              result: jobStatus.result,
            }),
          });
        }

        return {
          content: [
            {
              type: "text",
              text: `# Results for Job ${args.job_id}\n\n${JSON.stringify(jobStatus.result, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching job results: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },

    get_batch_results: async (args: z.infer<typeof GetBatchResultsSchema>) => {
      try {
        const result = await api.getBatchResults(args.batch_id, args.format);

        if (typeof result === "string") {
          // CSV format
          return {
            content: [{ type: "text", text: result }],
          };
        }

        const batchStatus = result as BatchStatus;

        if (batchStatus.status === "processing") {
          const { progress } = batchStatus;
          return {
            content: [
              {
                type: "text",
                text: `Batch ${args.batch_id} is still processing.\nProgress: ${progress.completed}/${progress.total} completed (${progress.percentage}%)\nFailed: ${progress.failed}, Processing: ${progress.processing}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `# Batch Results for ${args.batch_id}\n\nStatus: ${batchStatus.status}\nTotal Jobs: ${batchStatus.progress.total}\nCompleted: ${batchStatus.progress.completed}\nFailed: ${batchStatus.progress.failed}\n\n${JSON.stringify(batchStatus.jobs, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching batch results: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },

    check_job_status: async (args: z.infer<typeof CheckJobStatusSchema>) => {
      try {
        const status = await api.getJobStatus(args.job_id);

        if (status.status === "completed") {
          return {
            content: [
              {
                type: "text",
                text: `Job ${args.job_id} is COMPLETED.\nCompany: ${status.result.company_name}\nUse get_job_results to fetch full results.`,
              },
            ],
          };
        }

        if (status.status === "processing") {
          return {
            content: [
              {
                type: "text",
                text: `Job ${args.job_id} is PROCESSING.\nCurrent stage: ${status.current_stage || "unknown"}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Job ${args.job_id} FAILED.\nError: ${status.error || "Unknown error"}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error checking job status: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },

    download_results: async (args: z.infer<typeof DownloadResultsSchema>) => {
      try {
        if (!args.job_id && !args.batch_id) {
          return {
            content: [
              {
                type: "text",
                text: "Error: Must provide either job_id or batch_id",
              },
            ],
            isError: true,
          };
        }

        if (args.job_id) {
          const result = await api.getJobResults(args.job_id, args.format);
          return {
            content: [
              {
                type: "text",
                text:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        if (args.batch_id) {
          const result = await api.getBatchResults(args.batch_id, args.format);
          return {
            content: [
              {
                type: "text",
                text:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        return {
          content: [{ type: "text", text: "Unexpected error" }],
          isError: true,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error downloading results: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },

    list_jobs: async (args: z.infer<typeof ListJobsSchema>) => {
      try {
        const response = await jobTrackerStub.fetch(
          `http://do/jobs?limit=${args.limit}`
        );
        const jobs = await response.json();

        if (!jobs || jobs.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No jobs found in history. Submit a job first using submit_job or analyze_url_wait.",
              },
            ],
          };
        }

        const jobList = jobs
          .map(
            (job: any) =>
              `- ${job.job_id}: ${job.url} (${job.status}) - Created: ${job.created_at}`
          )
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `# Recent Jobs (${jobs.length})\n\n${jobList}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error listing jobs: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
