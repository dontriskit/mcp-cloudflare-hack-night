#!/usr/bin/env python3
"""
MCP Server for LLMS-TXT-API
Provides standardized access to GTM intelligence analysis tools
"""

import asyncio
import json
import os
import sys
import logging
from typing import Any, Dict, List, Optional
import httpx

# MCP protocol imports
import mcp.server.stdio
import mcp.types as types
from mcp.server import NotificationOptions, Server
from mcp.server.session import InitializationOptions

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("mcp-llms-txt-api")

# Initialize server
server = Server("llms-txt-api")

# Global HTTP client
api_base_url = os.getenv("LLMS_TXT_API_URL", "http://localhost:8000")
api_key = os.getenv("LLMS_TXT_API_KEY")

if not api_key:
    logger.error("LLMS_TXT_API_KEY environment variable is required")
    sys.exit(1)

client = httpx.AsyncClient(
    headers={"Authorization": f"Bearer {api_key}"},
    timeout=30.0
)

@server.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    """List available tools"""
    return [
        types.Tool(
            name="analyze_company",
            description="Analyze a single company website to extract GTM intelligence",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "format": "uri",
                        "description": "The company website URL to analyze"
                    },
                    "focus_context": {
                        "type": "string",
                        "description": "Optional context to focus the analysis"
                    }
                },
                "required": ["url"]
            }
        ),
        types.Tool(
            name="get_job_result",
            description="Retrieve analysis results for a job",
            inputSchema={
                "type": "object",
                "properties": {
                    "job_id": {
                        "type": "string",
                        "description": "The job ID to retrieve results for"
                    }
                },
                "required": ["job_id"]
            }
        ),
        types.Tool(
            name="get_user_info",
            description="Get current user information and credits",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        types.Tool(
            name="get_system_status",
            description="Check system health and queue status",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Handle tool execution"""
    try:
        logger.info(f"Executing tool: {name} with arguments: {arguments}")

        if name == "analyze_company":
            url = f"{api_base_url}/api/v1/single"
            payload = {"url": arguments["url"]}
            if "focus_context" in arguments:
                payload["focus_context"] = arguments["focus_context"]

            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()

            return [types.TextContent(
                type="text",
                text=f"Company analysis started!\n\nJob ID: {result['job_id']}\nStatus: {result['status']}\nCreated: {result['created_at']}\n\nUse get_job_result with this job_id to check progress and get results."
            )]

        elif name == "get_job_result":
            job_id = arguments["job_id"]
            url = f"{api_base_url}/api/v1/job/{job_id}"

            response = await client.get(url)
            response.raise_for_status()
            result = response.json()

            if "gtm_context" in result:
                # Job completed - return formatted results
                gtm = result["gtm_context"]
                formatted_result = f"""# GTM Analysis Complete for {result['url']}

## Company: {gtm.get('company_name', 'Unknown')}

### Summary
{gtm.get('tldr', 'No summary available')}

### Business Model
- Type: {gtm.get('business_model', {}).get('type', 'Unknown')}
- Target Market: {gtm.get('business_model', {}).get('target_market', 'Unknown')}

### Products & Services
{json.dumps(gtm.get('products_services', []), indent=2)}

### GTM Intelligence
{json.dumps(gtm.get('gtm_intelligence', {}), indent=2)}

### Contact Information
{json.dumps(gtm.get('contact', {}), indent=2)}
"""
                return [types.TextContent(type="text", text=formatted_result)]
            else:
                # Job still processing
                return [types.TextContent(
                    type="text",
                    text=f"Job {job_id} Status: {result.get('status', 'unknown')}\nCurrent Stage: {result.get('current_stage', 'unknown')}\nStarted: {result.get('started_at', 'not started')}"
                )]

        elif name == "get_user_info":
            url = f"{api_base_url}/api/v1/user"
            response = await client.get(url)
            response.raise_for_status()
            result = response.json()

            return [types.TextContent(
                type="text",
                text=f"User Information:\nEmail: {result['email']}\nCredits Remaining: {result['credits_remaining']}\nAccount Active: {result['is_active']}"
            )]

        elif name == "get_system_status":
            url = f"{api_base_url}/api/v1/status"
            response = await client.get(url)
            response.raise_for_status()
            result = response.json()

            system_info = result.get('system', {})
            user_info = result.get('user', {})

            return [types.TextContent(
                type="text",
                text=f"""System Status: {system_info.get('status', 'unknown')}

Queue Information:
- Messages in Queue: {system_info.get('queue', {}).get('message_count', 0)}
- Active Workers: {system_info.get('queue', {}).get('consumer_count', 0)}

Job Statistics:
- Completed: {system_info.get('total_jobs', {}).get('completed', 0)}
- Processing: {system_info.get('total_jobs', {}).get('processing', 0)}
- Queued: {system_info.get('total_jobs', {}).get('queued', 0)}

Your Account:
- Credits Remaining: {user_info.get('credits_remaining', 0)}
"""
            )]

        else:
            return [types.TextContent(
                type="text",
                text=f"Unknown tool: {name}"
            )]

    except Exception as e:
        logger.error(f"Error executing tool {name}: {str(e)}")
        return [types.TextContent(
            type="text",
            text=f"Tool execution error: {str(e)}"
        )]

async def main():
    """Main entry point"""
    logger.info("Starting LLMS-TXT-API MCP Server")
    logger.info(f"API Base URL: {api_base_url}")

    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="llms-txt-api",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())