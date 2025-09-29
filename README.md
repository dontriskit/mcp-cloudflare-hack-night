# World-Wide-Web-AI-And-MCP-Hack-Night
Hey, thanks for joining us for WWW AI & MCP Hack Night! In this repo, you'll find everything you need to get started with the Hack Night.

We recommend getting familiar with the challenge before the Hack Night, as it will help you get started faster.

## Prerequisites
- Your own laptop
- Node.js and a JS package manager (npm, yarn, pnpm, bun) installed
- A [Cloudflare account](https://dash.cloudflare.com/sign-up)

## The Challenge
This Hack Night is all about exploration and creativity with [MCP servers](https://modelcontextprotocol.io/docs/getting-started/intro). Build something that excites you—whether it's practical, experimental, or just fun.

### Core Components
Your project will consist of two main parts:
1. **[mcp-lite](https://github.com/fiberplane/mcp-lite)**: A web SDK for building MCP servers
2. **[Cloudflare Worker](https://developers.cloudflare.com/workers/)**: A serverless environment to run your MCP server

## Quickstart

1. Use the Cloudflare CLI to create a new Worker
```
pnpm create cloudflare@latest example_app  
```
- Select the framework starter: Hono

2. Include `zod` and `mcp-lite` in your project
```
pnpm add zod
pnpm add mcp-lite
```
3. Start building your MCP server
```
const mcp = new McpServer({
  name: "example-server",
  version: "1.0.0",
  schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
});

// Define schema
const EchoSchema = z.object({
  message: z.string(),
});

// Add a tool
mcp.tool("echo", {
  description: "Echoes the input message",
  inputSchema: EchoSchema,
  handler: (args) => ({
    // args is automatically typed as { message: string }
    content: [{ type: "text", text: args.message }],
  }),
});
```
4. Run your server locally
```
pnpm dev
```

5. Deploy your MCP server

Authenticate Wrangler (first time only)
```
pnpm exec wrangler login
pnpm exec wrangler whoami
```

```
pnpm run deploy
```
You can also look in the `example/` folder for the complete code example and use it as a starting point. 


## MCP Clients
Once you have your MCP server running, you need a client to connect to it for demos. Here are some examples:
- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)
- [Claude Desktop](https://www.anthropic.com/news/claude-desktop) (macOS)
- Your AI IDE of choice (Claude Desktop, Windsurf, Zed-Editor, ... )

## Submission
Use [this form](https://forms.gle/tk6WTwspjHrLJjxBA) to submit your project and indicate if you'd like to demo at the end of our Hack Night. Please provide a brief description of your project and any relevant links.
