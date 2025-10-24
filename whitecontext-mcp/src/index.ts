import { Hono } from "hono";
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { z } from "zod";
import { WhiteContextAPI } from "./api/whitecontext";
import {
  createRetrievalTools,
  GetJobResultsSchema,
  GetBatchResultsSchema,
  CheckJobStatusSchema,
  DownloadResultsSchema,
  ListJobsSchema,
} from "./tools/retrieval";
import {
  createSubmissionTools,
  SubmitJobSchema,
  SubmitBulkJobSchema,
} from "./tools/submission";
import {
  createAutoPollingTools,
  AnalyzeUrlWaitSchema,
  AnalyzeBulkWaitSchema,
} from "./tools/auto-polling";

// Export Durable Objects
export { JobTracker } from "./durable-objects/JobTracker";
export { ResultsCache } from "./durable-objects/ResultsCache";

interface Env {
  WHITECONTEXT_API_KEY: string;
  WHITECONTEXT_BASE_URL?: string;
  JOB_TRACKER: DurableObjectNamespace;
  RESULTS_CACHE: DurableObjectNamespace;
}

// Create MCP server factory
function createMcpServer(env: Env) {
  const mcp = new McpServer({
    name: "whitecontext-api",
    version: "1.0.0",
    schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
  });

  // Initialize API client
  const api = new WhiteContextAPI(
    env.WHITECONTEXT_API_KEY,
    env.WHITECONTEXT_BASE_URL || "https://whitecontext.com/api"
  );

  // Get Durable Object stubs
  const jobTrackerId = env.JOB_TRACKER.idFromName("global");
  const jobTrackerStub = env.JOB_TRACKER.get(jobTrackerId);

  const resultsCacheId = env.RESULTS_CACHE.idFromName("global");
  const resultsCacheStub = env.RESULTS_CACHE.get(resultsCacheId);

  // Create tool handlers
  const retrievalTools = createRetrievalTools(api, jobTrackerStub, resultsCacheStub);
  const submissionTools = createSubmissionTools(api, jobTrackerStub);
  const autoPollingTools = createAutoPollingTools(
    api,
    jobTrackerStub,
    resultsCacheStub
  );

  // Register Phase 1: Retrieval Tools (Priority)
  mcp.tool("get_job_results", {
    description:
      "Fetch results for a completed job by job_id. Supports JSON and CSV formats. Results are cached automatically.",
    inputSchema: GetJobResultsSchema,
    handler: retrievalTools.get_job_results,
  });

  mcp.tool("get_batch_results", {
    description:
      "Fetch results for a completed batch by batch_id. Supports JSON and CSV formats.",
    inputSchema: GetBatchResultsSchema,
    handler: retrievalTools.get_batch_results,
  });

  mcp.tool("check_job_status", {
    description:
      "Quick status check for a job (processing/completed/failed). Does not auto-poll.",
    inputSchema: CheckJobStatusSchema,
    handler: retrievalTools.check_job_status,
  });

  mcp.tool("download_results", {
    description:
      "Download job or batch results in JSON or CSV format. Useful for exporting to spreadsheets.",
    inputSchema: DownloadResultsSchema,
    handler: retrievalTools.download_results,
  });

  mcp.tool("list_jobs", {
    description:
      "List recent jobs from history with their status. Useful for finding job IDs.",
    inputSchema: ListJobsSchema,
    handler: retrievalTools.list_jobs,
  });

  // Register Phase 2: Submission Tools
  mcp.tool("submit_job", {
    description:
      "Submit a single URL for analysis. Returns job_id immediately. Use get_job_results to fetch results later.",
    inputSchema: SubmitJobSchema,
    handler: submissionTools.submit_job,
  });

  mcp.tool("submit_bulk_job", {
    description:
      "Submit multiple URLs (up to 100) for batch analysis. Returns batch_id and job_ids. Use get_batch_results to fetch results later.",
    inputSchema: SubmitBulkJobSchema,
    handler: submissionTools.submit_bulk_job,
  });

  // Register Phase 3: Auto-Polling Tools (Convenience)
  mcp.tool("analyze_url_wait", {
    description:
      "Submit URL and automatically wait for completion (up to timeout). Returns full results when done. Checks cache first.",
    inputSchema: AnalyzeUrlWaitSchema,
    handler: autoPollingTools.analyze_url_wait,
  });

  mcp.tool("analyze_bulk_wait", {
    description:
      "Submit multiple URLs and automatically wait for batch completion (up to timeout). Returns all results when done.",
    inputSchema: AnalyzeBulkWaitSchema,
    handler: autoPollingTools.analyze_bulk_wait,
  });

  // Add webhook configuration tool
  mcp.tool(
    "configure_webhook",
    {
      description:
        "Configure a webhook URL to receive notifications when jobs complete.",
      inputSchema: z.object({
        webhook_url: z
          .string()
          .url()
          .describe("Webhook URL to receive job completion notifications"),
      }),
      handler: async (args) => {
        try {
          await jobTrackerStub.fetch("http://do/webhook", {
            method: "POST",
            body: JSON.stringify({ url: args.webhook_url }),
          });

          return {
            content: [
              {
                type: "text",
                text: `Webhook configured successfully!\n\nWebhook URL: ${args.webhook_url}\n\nYou will receive notifications for:\n- job.completed\n- job.failed\n- batch.completed\n- batch.failed`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error configuring webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }
      },
    }
  );

  // Add cache management tool
  mcp.tool("clear_cache", {
    description: "Clear cached results for a specific URL or all cached results.",
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .optional()
        .describe("URL to clear from cache. Omit to clear all cache."),
    }),
    handler: async (args) => {
      try {
        if (args.url) {
          const response = await resultsCacheStub.fetch(
            `http://do/cache?url=${encodeURIComponent(args.url)}`,
            { method: "DELETE" }
          );
          const result = await response.json();

          return {
            content: [
              {
                type: "text",
                text: result.cleared
                  ? `Cache cleared for ${args.url}`
                  : `No cached results found for ${args.url}`,
              },
            ],
          };
        } else {
          const response = await resultsCacheStub.fetch("http://do/cache/all", {
            method: "DELETE",
          });
          const result = await response.json();

          return {
            content: [
              {
                type: "text",
                text: `Cleared ${result.cleared_count} cached results.`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error clearing cache: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },
  });

  return mcp;
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    name: "WhiteContext API MCP Server",
    version: "1.0.0",
    description: "MCP server for WhiteContext company intelligence API",
    endpoints: {
      mcp: "/mcp",
      health: "/health",
    },
  });
});

app.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// MCP endpoint
app.all("/mcp", async (c) => {
  // Check for API key
  if (!c.env.WHITECONTEXT_API_KEY) {
    return c.json(
      {
        error:
          "WHITECONTEXT_API_KEY not configured. Please set it in wrangler.toml or as a secret.",
      },
      { status: 500 }
    );
  }

  const mcp = createMcpServer(c.env);
  const transport = new StreamableHttpTransport();
  const httpHandler = transport.bind(mcp);

  const response = await httpHandler(c.req.raw);
  return response;
});

export default app;
