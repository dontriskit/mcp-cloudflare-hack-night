# WhiteContext API MCP Server - Hack Night Submission

## Project Information

**Project Name**: WhiteContext API MCP Server
**Hack Night**: World Wild Web AI & MCP Hack Night
**Submission Date**: October 23, 2025

## Project Description

An MCP server that provides AI assistants with seamless access to WhiteContext's company intelligence API. Enables automated analysis of company websites to extract business profiles, market intelligence, and competitive insights.

## What It Does

This MCP server acts as a bridge between AI assistants (like Claude) and the WhiteContext API, enabling:

1. **Automated Company Analysis**: AI can analyze any company website to extract:
   - Company name and description
   - Business model and target market
   - Products and services
   - Company intelligence and insights

2. **Smart Result Retrieval**: Priority on fetching existing completed analysis jobs without unnecessary API calls or waiting

3. **Batch Processing**: Analyze up to 100 companies simultaneously

4. **Intelligent Caching**: Results cached for 24 hours to avoid duplicate API calls

5. **Job History Tracking**: Keep track of all analysis jobs with persistent storage

## Core Requirements Met

✅ **mcp-lite**: Built entirely on mcp-lite for MCP server implementation
✅ **Cloudflare Workers**: Deployed as a serverless Cloudflare Worker
✅ **Additional Features**:
- Durable Objects for state management
- Smart caching system
- Job history tracking
- Webhook support
- CSV/JSON export

## Technical Stack

- **MCP Framework**: mcp-lite v0.3.0
- **Runtime**: Cloudflare Workers
- **Web Framework**: Hono v4.9.9
- **State Management**: Cloudflare Durable Objects (2 classes)
- **Schema Validation**: Zod v4.1.11
- **Language**: TypeScript

## Architecture Highlights

### 3-Phase Tool Design

**Phase 1: Retrieval (Priority)** - 5 tools
- Optimized for working with existing completed jobs
- No unnecessary waiting or polling
- Smart caching integration

**Phase 2: Submission** - 2 tools
- Submit new analysis jobs
- Support for single and bulk URLs

**Phase 3: Auto-Polling** - 2 tools
- Convenience tools that wait for completion
- Perfect for one-off analyses

**Management** - 2 tools
- Webhook configuration
- Cache management

### Durable Objects Architecture

1. **JobTracker**: Stores job/batch history, tracks status, manages webhooks
2. **ResultsCache**: Intelligent 24hr caching with TTL management

## Key Innovations

1. **Retrieval-First Design**: Unlike typical API wrappers, this prioritizes fetching existing results over creating new jobs - perfect for reasoning tasks where you already have job IDs

2. **Dual-Mode Operation**:
   - Manual control for power users (submit → check → retrieve)
   - Auto-polling for convenience (submit + wait in one call)

3. **Smart Caching Layer**:
   - Automatic caching of all completed results
   - 24-hour TTL
   - URL-based cache keys
   - Cache-aware retrieval tools

4. **Export Flexibility**: Download results as JSON or CSV for spreadsheet analysis

## MCP Tools Implemented

Total: **11 Tools**

### Retrieval (Phase 1)
1. `get_job_results` - Fetch job results with smart caching
2. `get_batch_results` - Fetch batch results
3. `check_job_status` - Quick status check
4. `download_results` - Export as JSON/CSV
5. `list_jobs` - View job history

### Submission (Phase 2)
6. `submit_job` - Submit single URL
7. `submit_bulk_job` - Submit up to 100 URLs

### Auto-Polling (Phase 3)
8. `analyze_url_wait` - Submit and wait for single URL
9. `analyze_bulk_wait` - Submit and wait for batch

### Management
10. `configure_webhook` - Set webhook notifications
11. `clear_cache` - Manage cached results

## Demo Scenarios

### Scenario 1: Competitive Intelligence
```
AI Assistant: "Analyze these 5 competitors: [URLs]"
→ Uses analyze_bulk_wait
→ Returns comprehensive comparison
→ Results cached for quick re-access
```

### Scenario 2: Quick Lookup
```
AI Assistant: "What's the business model of Stripe?"
→ Uses analyze_url_wait with stripe.com
→ Returns: B2B, target market: online businesses
→ Caches result for 24hr
```

### Scenario 3: Batch Export
```
AI Assistant: "Export all results from batch_xyz to CSV"
→ Uses download_results
→ Returns CSV formatted data
→ Ready for spreadsheet analysis
```

### Scenario 4: Working with Existing Jobs
```
AI Assistant: "Get results for job_abc123"
→ Uses get_job_results
→ Checks cache first (instant if cached)
→ Falls back to API if needed
→ Caches for future requests
```

## Use Cases

1. **Market Research**: Analyze competitor landscapes
2. **Lead Qualification**: Understand potential customers
3. **Investment Analysis**: Research companies for due diligence
4. **Sales Intelligence**: Gather prospect information
5. **Competitive Analysis**: Track competitor positioning

## Setup Instructions

### Quick Start (< 5 minutes)

```bash
cd whitecontext-mcp
pnpm install
pnpx wrangler secret put WHITECONTEXT_API_KEY
pnpm dev
```

### Deploy to Production

```bash
pnpx wrangler login
pnpm run deploy
```

Your MCP server is live at: `https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev`

## MCP Client Configuration

### Claude Code
```json
{
  "mcpServers": {
    "whitecontext": {
      "url": "https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev/mcp"
    }
  }
}
```

### Testing with MCP Inspector
```bash
npx @modelcontextprotocol/inspector \
  https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev/mcp
```

## Project Structure

```
whitecontext-mcp/
├── src/
│   ├── index.ts                 # MCP server + Hono app
│   ├── types.ts                 # TypeScript definitions
│   ├── api/
│   │   └── whitecontext.ts      # API client wrapper
│   ├── tools/
│   │   ├── retrieval.ts         # Phase 1: 5 tools
│   │   ├── submission.ts        # Phase 2: 2 tools
│   │   └── auto-polling.ts      # Phase 3: 2 tools
│   └── durable-objects/
│       ├── JobTracker.ts        # Job history storage
│       └── ResultsCache.ts      # Results caching
├── public/
│   └── index.html               # Beautiful status page
├── package.json
├── wrangler.jsonc              # Cloudflare configuration
├── tsconfig.json
└── README.md                    # Comprehensive docs
```

## What Makes This Special

1. **Production-Ready**: Full error handling, rate limit awareness, proper caching
2. **Well-Documented**: Comprehensive README, inline code comments, status page UI
3. **Smart Design**: Retrieval-first approach optimized for AI reasoning workflows
4. **Scalable**: Durable Objects ensure state persistence and consistency
5. **Developer-Friendly**: TypeScript throughout, clear tool descriptions, easy to extend

## Future Enhancements

- [ ] Resource endpoints for real-time job monitoring
- [ ] Advanced filtering and search in job history
- [ ] Analytics dashboard for API usage
- [ ] Rate limit tracking and warnings
- [ ] Multi-tenant support with API key management

## Demo Ready

✅ Live deployment URL
✅ Beautiful status page UI
✅ Full documentation
✅ MCP Inspector compatible
✅ Claude Code ready
✅ Example workflows included

## Contact & Links

- **Repository**: `/whitecontext-mcp` (in this repo)
- **Documentation**: See README.md
- **API Reference**: See SUBMISSION.md (this file)
- **Demo**: Visit deployed worker URL root for status page

## Acknowledgments

Built for the **World Wild Web AI & MCP Hack Night**
Powered by: mcp-lite, Cloudflare Workers, WhiteContext API

---

**Ready for demo and submission!** 🚀
