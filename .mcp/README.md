# LLMS-TXT-API MCP Server

A Model Context Protocol (MCP) server that provides standardized access to the LLMS-TXT-API for AI-powered GTM intelligence analysis.

## Overview

This MCP server enables AI applications like Claude to interact with your LLMS-TXT-API through standardized tools and resources. It provides:

- **Company Analysis Tools**: Analyze websites for GTM intelligence
- **Job Management**: Track and retrieve analysis results
- **Resource Access**: Access structured company data and user dashboards
- **System Monitoring**: Check API health and queue status

## Features

### Tools Available

1. **`analyze_company`** - Analyze a single company website
2. **`analyze_companies_batch`** - Analyze multiple companies in batch
3. **`get_job_result`** - Retrieve analysis results or job status
4. **`list_jobs`** - List user's jobs with filtering/pagination
5. **`get_user_info`** - Get user account information and credits
6. **`get_system_status`** - Check system health and metrics

### Resources Available

1. **`job://{job_id}/result`** - Complete GTM analysis results
2. **`user://dashboard`** - User dashboard with job history
3. **`system://queue-status`** - Real-time system status
4. **`jobs://recent/{limit}`** - Recent jobs across system

## Installation & Setup

### Prerequisites

- Python 3.8+
- Running LLMS-TXT-API instance
- Valid API key from your LLMS-TXT-API

### 1. Install MCP Dependencies

```bash
pip install mcp httpx
```

### 2. Set Environment Variables

```bash
# Required
export LLMS_TXT_API_KEY="ltxt_your_api_key_here"
export LLMS_TXT_API_KEY="ltxt_cjJwZbbUPDq330v__Hbuz5IW6hzTdbdOERBrIgbStas"

# Optional (defaults to localhost:8000)
export LLMS_TXT_API_URL="http://your-api-server:8000"
```

### 3. Test the Server

```bash
# Test server startup (should start without errors)
source .venv/bin/activate
export LLMS_TXT_API_KEY="ltxt_your_api_key_here"
timeout 3 python .mcp/server.py || echo "Server started successfully"
```

## Usage

### Direct Server Execution

```bash
# Run the MCP server directly
python .mcp/server.py
```

### Integration with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "llms-txt-api": {
      "command": "python",
      "args": ["/path/to/your/project/.mcp/server.py"],
      "env": {
        "LLMS_TXT_API_URL": "http://localhost:8000",
        "LLMS_TXT_API_KEY": "ltxt_your_api_key_here"
      }
    }
  }
}
```

### Integration with Other MCP Clients

The server uses STDIO transport and follows MCP 1.0 specification, making it compatible with any MCP-compliant client.

## Tool Examples

### Analyze a Company

```python
# Through MCP client
result = await mcp_client.call_tool(
    "analyze_company",
    {
        "url": "https://stripe.com",
        "focus_context": "Payment solutions for e-commerce"
    }
)
```

### Get Analysis Results

```python
# Check job status/results
result = await mcp_client.call_tool(
    "get_job_result",
    {"job_id": "uuid-here"}
)
```

### Batch Analysis

```python
# Analyze multiple companies
result = await mcp_client.call_tool(
    "analyze_companies_batch",
    {
        "urls": [
            "https://stripe.com",
            "https://square.com",
            "https://paypal.com"
        ],
        "focus_context": "Payment processors"
    }
)
```

## Resource Examples

### Access Job Results

```python
# Read complete analysis
content = await mcp_client.read_resource("job://uuid-here/result")
```

### User Dashboard

```python
# Get user dashboard data
dashboard = await mcp_client.read_resource("user://dashboard")
```

## Configuration Files

### server.json

Contains MCP server metadata, capabilities, and configuration options.

### tools.json

Defines all available tools with their input/output schemas and descriptions.

### resources.json

Defines available resources with URI patterns and data schemas.

### server.py

Main MCP server implementation with protocol handlers and API integration.

## Error Handling

The server includes comprehensive error handling for:

- Invalid API keys or authentication failures
- Network connectivity issues
- Malformed requests or missing parameters
- API rate limiting and quota exceeded errors
- Job not found or access denied scenarios

## Development

### Adding New Tools

1. Add tool definition to `tools.json`
2. Implement handler method in `server.py`
3. Add tool name to the `handle_call_tool()` router

### Adding New Resources

1. Add resource definition to `resources.json`
2. Implement reader method in `server.py`
3. Add URI pattern to the `handle_read_resource()` router

### Testing

```bash
# Test server startup
python .mcp/server.py --test

# Test with MCP client
# (Use your preferred MCP client testing method)
```

## API Mapping

| MCP Tool | API Endpoint | Description |
|----------|--------------|-------------|
| `analyze_company` | `POST /api/v1/single` | Single URL analysis |
| `analyze_companies_batch` | `POST /api/v1/batch` | Batch URL analysis |
| `get_job_result` | `GET /api/v1/job/{job_id}` | Retrieve job results |
| `list_jobs` | `GET /api/v1/jobs` | List user jobs |
| `get_user_info` | `GET /api/v1/user` | User account info |
| `get_system_status` | `GET /api/v1/status` | System health check |

## Security

- All API calls use Bearer token authentication
- Environment variables for sensitive configuration
- Input validation through JSON schemas
- Error messages sanitized to prevent information leakage

## Troubleshooting

### Common Issues

**"LLMS_TXT_API_KEY environment variable is required"**
- Set the `LLMS_TXT_API_KEY` environment variable with your API key

**"Connection refused" errors**
- Verify LLMS_TXT_API_URL points to running API server
- Check firewall/network connectivity

**"Invalid API key" errors**
- Verify API key is correct and active
- Check user account status in API

**Tool execution timeouts**
- Large batch jobs may take several minutes
- Consider breaking large batches into smaller chunks

### Logging

The server logs to stdout with INFO level by default. Enable DEBUG logging:

```bash
export PYTHONPATH="."
python -c "
import logging
logging.basicConfig(level=logging.DEBUG)
exec(open('.mcp/server.py').read())
"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

Same as LLMS-TXT-API project license.

---

For more information about Model Context Protocol, visit [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)