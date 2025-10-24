# Claude Code Setup Guide

## Quick Start: Using with Claude Code

### Option 1: Local Development (Test First)

**Step 1**: Keep your dev server running
```bash
cd whitecontext-mcp
pnpm dev
# Server runs on http://localhost:8787
```

**Step 2**: Configure Claude Code

Create or edit your MCP configuration file. The location depends on your setup:

**Global Configuration**:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

**Project-Specific** (recommended for development):
Create `.claude/mcp.json` in your project:

```json
{
  "mcpServers": {
    "whitecontext-local": {
      "url": "http://localhost:8787/mcp"
    }
  }
}
```

**Step 3**: Restart Claude Code

The server will be available in Claude Code. Try:
```
List available tools from the whitecontext-local MCP server
```

### Option 2: Production Deployment (Recommended)

Deploy to Cloudflare Workers for permanent access:

**Step 1**: Authenticate with Cloudflare
```bash
pnpx wrangler login
# Opens browser for authentication
```

**Step 2**: Deploy
```bash
pnpm run deploy
# Returns URL like: https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev
```

**Step 3**: Configure Claude Code with deployed URL

```json
{
  "mcpServers": {
    "whitecontext": {
      "url": "https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev/mcp"
    }
  }
}
```

**Step 4**: Restart Claude Code

## Testing the Integration

Once connected, try these commands in Claude Code:

### Test 1: List Tools
```
What tools are available from the whitecontext MCP server?
```

### Test 2: Analyze a Company
```
Use the whitecontext server to analyze https://stripe.com
```

### Test 3: Check Job Status
```
List recent jobs from the whitecontext server
```

## Example Usage Scenarios

### Scenario 1: Quick Company Analysis
```
User: "Tell me about the company at https://anthropic.com"

Claude Code will:
1. Use analyze_url_wait tool
2. Submit URL to WhiteContext API
3. Poll for completion
4. Return company profile, business model, and insights
```

### Scenario 2: Competitive Intelligence
```
User: "Analyze these 5 competitors: https://company1.com, https://company2.com, ..."

Claude Code will:
1. Use analyze_bulk_wait tool
2. Submit all URLs as a batch
3. Wait for completion
4. Return comparative analysis
```

### Scenario 3: Working with Existing Jobs
```
User: "Get results for job_abc123"

Claude Code will:
1. Use get_job_results tool
2. Check cache first (instant if cached)
3. Return full analysis results
```

## Troubleshooting

### Issue: "Cannot connect to MCP server"

**Solution**:
- Check that dev server is running (`pnpm dev`)
- Verify the URL in your config matches the server
- For local: use `http://localhost:8787/mcp`
- For deployed: use your Cloudflare Workers URL

### Issue: "WHITECONTEXT_API_KEY not configured"

**Solution**:
```bash
# Set as secret (recommended for deployment)
pnpx wrangler secret put WHITECONTEXT_API_KEY

# Or add to .dev.vars for local development
echo "WHITECONTEXT_API_KEY=your-key-here" > .dev.vars
```

### Issue: Tools not showing up

**Solution**:
1. Restart Claude Code
2. Check MCP configuration is valid JSON
3. Verify the `/mcp` endpoint path is included in URL

## MCP Configuration File Locations

### Claude Desktop
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

### Claude Code (VS Code Extension)
- **Project-specific**: `.claude/mcp.json` in project root
- **Global**: Settings → Extensions → Claude Code → MCP Servers

### Other MCP Clients

**MCP Inspector** (for testing):
```bash
npx @modelcontextprotocol/inspector http://localhost:8787/mcp
```

**Windsurf, Zed, etc.**:
Check their documentation for MCP server configuration.

## Complete Example Configuration

```json
{
  "mcpServers": {
    "whitecontext": {
      "url": "https://whitecontext-mcp.YOUR_SUBDOMAIN.workers.dev/mcp",
      "timeout": 60000
    }
  }
}
```

## Available Tools Summary

Once connected, Claude Code can use these 11 tools:

**Retrieval (Priority)**:
- `get_job_results` - Fetch completed job results
- `get_batch_results` - Fetch batch results
- `check_job_status` - Quick status check
- `download_results` - Export as JSON/CSV
- `list_jobs` - View job history

**Submission**:
- `submit_job` - Submit single URL
- `submit_bulk_job` - Submit batch of URLs

**Auto-Polling**:
- `analyze_url_wait` - Submit and wait for single URL
- `analyze_bulk_wait` - Submit and wait for batch

**Management**:
- `configure_webhook` - Set webhook notifications
- `clear_cache` - Clear cached results

## Next Steps

1. ✅ Server running on http://localhost:8787
2. ⬜ Configure Claude Code MCP settings
3. ⬜ Test with a simple query
4. ⬜ Deploy to Cloudflare (optional)
5. ⬜ Update config with production URL

Need help? Check the main README.md or SUBMISSION.md for more details.
