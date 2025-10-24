# WhiteContext API MCP Server

> **Built for World Wild Web AI & MCP Hack Night**
> A Model Context Protocol (MCP) server providing AI assistants with access to WhiteContext's company intelligence API.

## Overview

This MCP server enables AI assistants to analyze company websites and extract business intelligence including company profiles, business models, products/services, and market intelligence. Built with **mcp-lite** and deployed on **Cloudflare Workers** with Durable Objects for state management.

### Key Features

- ✅ **11 MCP Tools** for comprehensive company analysis
- ✅ **Smart Caching** - Results cached for 24 hours using Durable Objects
- ✅ **Job History** - Track all analysis jobs and batches
- ✅ **Auto-Polling** - Convenient tools that wait for completion
- ✅ **Manual Control** - Submit jobs and check status separately
- ✅ **Bulk Analysis** - Process up to 100 URLs in a single batch
- ✅ **Export Formats** - Download results as JSON or CSV
- ✅ **Webhook Support** - Get notified when jobs complete

## Quick Start

### Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- WhiteContext API key from [whitecontext.com](https://whitecontext.com)
- Node.js and pnpm (or npm/yarn)

### 1. Installation

```bash
cd whitecontext-mcp
pnpm install
```

### 2. Configure API Key

Set your WhiteContext API key as a secret:

```bash
pnpx wrangler secret put WHITECONTEXT_API_KEY
# Paste your API key when prompted
```

Or add to `wrangler.jsonc` for local development:

```jsonc
{
  "vars": {
    "WHITECONTEXT_API_KEY": "your-api-key-here"
  }
}
```

### 3. Run Locally

```bash
pnpm dev
```

Visit http://localhost:8787 to see the server status page.

### 4. Deploy to Cloudflare

```bash
# First time: authenticate
pnpx wrangler login

# Deploy
pnpm run deploy
```

Your MCP server will be live at: `https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev`

## MCP Tools Reference

### Phase 1: Retrieval Tools (Priority)

**Perfect for working with existing completed jobs.**

#### `get_job_results`
Fetch results for a completed job.

```typescript
{
  job_id: "job_abc123",
  format: "json" // or "csv"
}
```

#### `get_batch_results`
Fetch results for a completed batch.

```typescript
{
  batch_id: "batch_xyz789",
  format: "json" // or "csv"
}
```

#### `check_job_status`
Quick status check without auto-polling.

```typescript
{
  job_id: "job_abc123"
}
```

#### `download_results`
Export results in JSON or CSV format.

```typescript
{
  job_id: "job_abc123", // OR batch_id
  format: "csv"
}
```

#### `list_jobs`
View recent job history.

```typescript
{
  limit: 20 // default 20
}
```

### Phase 2: Submission Tools

**Submit new analysis jobs.**

#### `submit_job`
Submit a single URL for analysis.

```typescript
{
  url: "https://example.com",
  webhook_url: "https://your-webhook.com/endpoint" // optional
}
```

#### `submit_bulk_job`
Submit multiple URLs (up to 100) for batch analysis.

```typescript
{
  urls: ["https://a.com", "https://b.com", "https://c.com"],
  webhook_url: "https://your-webhook.com/endpoint" // optional
}
```

### Phase 3: Auto-Polling Tools

**Convenience tools that wait for completion.**

#### `analyze_url_wait`
Submit URL and wait for completion (auto-polls every 5s).

```typescript
{
  url: "https://example.com",
  timeout_seconds: 300, // default 300 (5 min)
  webhook_url: "https://your-webhook.com/endpoint" // optional
}
```

#### `analyze_bulk_wait`
Submit batch and wait for all results (auto-polls every 10s).

```typescript
{
  urls: ["https://a.com", "https://b.com"],
  timeout_seconds: 600, // default 600 (10 min)
  webhook_url: "https://your-webhook.com/endpoint" // optional
}
```

### Management Tools

#### `configure_webhook`
Set webhook URL for job completion notifications.

```typescript
{
  webhook_url: "https://your-webhook.com/endpoint"
}
```

#### `clear_cache`
Clear cached results (all or specific URL).

```typescript
{
  url: "https://example.com" // optional, omit to clear all
}
```

## Using with MCP Clients

### Claude Code

Add to your MCP settings:

```json
{
  "mcpServers": {
    "whitecontext": {
      "url": "https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev/mcp"
    }
  }
}
```

Then use in Claude Code:

```
Analyze the company at https://anthropic.com using the WhiteContext MCP server.
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector \
  https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev/mcp
```

### Claude Desktop (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "whitecontext": {
      "url": "https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev/mcp"
    }
  }
}
```

## Architecture

```
┌─────────────────────┐
│   MCP Client        │
│ (Claude Code, etc)  │
└──────────┬──────────┘
           │
           │ HTTP (Server-Sent Events)
           │
┌──────────▼──────────────────────────────────┐
│  Cloudflare Worker (mcp-lite)               │
│  ┌────────────────────────────────────────┐ │
│  │  MCP Server (11 Tools)                 │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │  WhiteContext API Client               │ │
│  └────────────────────────────────────────┘ │
└──────────┬──────────────┬───────────────────┘
           │              │
    ┌──────▼──────┐  ┌───▼──────────┐
    │ Durable     │  │ Durable      │
    │ Object:     │  │ Object:      │
    │ JobTracker  │  │ ResultsCache │
    └─────────────┘  └──────────────┘
           │
    ┌──────▼───────────┐
    │ WhiteContext API │
    │ whitecontext.com │
    └──────────────────┘
```

### Components

- **MCP Server**: Built with mcp-lite, exposes 11 tools to AI clients
- **WhiteContext API Client**: Handles all API communication
- **JobTracker DO**: Stores job history and webhook config (last 100 jobs)
- **ResultsCache DO**: Caches analysis results (24hr TTL)
- **Cloudflare Worker**: Serverless runtime hosting the entire server

## Example Workflows

### Workflow 1: Quick Analysis

```
User: Analyze https://stripe.com

Assistant uses: analyze_url_wait
→ Submits job, polls every 5s, returns results
→ Results cached for 24hr
```

### Workflow 2: Batch Analysis

```
User: Analyze these 10 companies: [list of URLs]

Assistant uses: analyze_bulk_wait
→ Submits batch, polls every 10s
→ Returns all results when complete
→ Each result cached individually
```

### Workflow 3: Check Existing Job

```
User: Check the status of job_abc123

Assistant uses: check_job_status
→ Returns current status immediately

If completed:
Assistant uses: get_job_results
→ Returns full analysis (from cache if available)
```

### Workflow 4: Export to CSV

```
User: Export batch_xyz789 results to CSV

Assistant uses: download_results
→ Returns CSV formatted data
→ User can save to spreadsheet
```

## Development

### Project Structure

```
whitecontext-mcp/
├── src/
│   ├── index.ts                 # Main MCP server + Hono app
│   ├── types.ts                 # TypeScript types
│   ├── api/
│   │   └── whitecontext.ts      # API client wrapper
│   ├── tools/
│   │   ├── retrieval.ts         # Phase 1 tools
│   │   ├── submission.ts        # Phase 2 tools
│   │   └── auto-polling.ts      # Phase 3 tools
│   └── durable-objects/
│       ├── JobTracker.ts        # Job history & webhooks
│       └── ResultsCache.ts      # Results caching
├── public/
│   └── index.html               # Status page UI
├── package.json
├── wrangler.jsonc              # Cloudflare config
├── tsconfig.json
└── README.md
```

### Local Development

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Deploy
pnpm run deploy

# Generate types for Cloudflare bindings
pnpm run cf-typegen
```

### Testing

Test the MCP server with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector http://localhost:8787/mcp
```

## API Rate Limits

WhiteContext API limits:
- Single URL: 10 requests per minute
- Bulk URLs: Up to 100 URLs per request
- Overall: 1000 URLs per hour

This MCP server respects these limits and provides caching to reduce API calls.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WHITECONTEXT_API_KEY` | Yes | - | Your WhiteContext API key |
| `WHITECONTEXT_BASE_URL` | No | `https://whitecontext.com/api` | API base URL |

Set secrets in production:

```bash
pnpx wrangler secret put WHITECONTEXT_API_KEY
```

## Troubleshooting

### Error: "WHITECONTEXT_API_KEY not configured"

**Solution**: Set your API key as a secret:

```bash
pnpx wrangler secret put WHITECONTEXT_API_KEY
```

### Error: "Job timed out"

**Solution**: Increase `timeout_seconds` parameter in auto-polling tools, or use manual tools (`submit_job` + `check_job_status`).

### Cached results not updating

**Solution**: Use `clear_cache` tool to invalidate cached results for a specific URL.

## Contributing

This project was built for the World Wild Web AI & MCP Hack Night. Feel free to fork and extend!

## License

MIT

## Links

- [WhiteContext API Docs](https://whitecontext.com/api-docs)
- [MCP Specification](https://modelcontextprotocol.io)
- [mcp-lite](https://github.com/fiberplane/mcp-lite)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [World Wild Web Hack Night](https://github.com/anthropics/claude-code)

## Submission

**Project Name**: WhiteContext API MCP Server
**Description**: MCP server for automated company intelligence analysis using WhiteContext API
**Stack**: mcp-lite + Cloudflare Workers + Durable Objects
**Tools**: 11 tools across 3 phases (retrieval, submission, auto-polling)
**Features**: Smart caching, job history, webhooks, CSV export

Built with ❤️ for World Wild Web AI & MCP Hack Night
