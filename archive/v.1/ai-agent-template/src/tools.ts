/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool } from "ai";
import { z } from "zod";

import type { Chat } from "./server";
import { getCurrentAgent } from "agents";
import { unstable_scheduleSchema } from "agents/schedule";

/**
 * Weather information tool that requires human confirmation
 * When invoked, this will present a confirmation dialog to the user
 * The actual implementation is in the executions object below
 */
const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  parameters: z.object({ city: z.string() }),
  // Omitting execute function makes this tool require human confirmation
});

/**
 * Local time tool that executes automatically
 * Since it includes an execute function, it will run without user confirmation
 * This is suitable for low-risk operations that don't need oversight
 */
const getLocalTime = tool({
  description: "get the local time for a specified location",
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    console.log(`Getting local time for ${location}`);
    return "10am";
  },
});

const scheduleTask = tool({
  description: "A tool to schedule a task to be executed at a later time",
  parameters: unstable_scheduleSchema,
  execute: async ({ when, description }) => {
    // we can now read the agent context from the ALS store
    const { agent } = getCurrentAgent<Chat>();

    function throwError(msg: string): string {
      throw new Error(msg);
    }
    if (when.type === "no-schedule") {
      return "Not a valid schedule input";
    }
    const input =
      when.type === "scheduled"
        ? when.date // scheduled
        : when.type === "delayed"
          ? when.delayInSeconds // delayed
          : when.type === "cron"
            ? when.cron // cron
            : throwError("not a valid schedule input");
    try {
      agent!.schedule(input!, "executeTask", description);
    } catch (error) {
      console.error("error scheduling task", error);
      return `Error scheduling task: ${error}`;
    }
    return `Task scheduled for type "${when.type}" : ${input}`;
  },
});

/**
 * Tool to list all scheduled tasks
 * This executes automatically without requiring human confirmation
 */
const getScheduledTasks = tool({
  description: "List all tasks that have been scheduled",
  parameters: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();

    try {
      const tasks = agent!.getSchedules();
      if (!tasks || tasks.length === 0) {
        return "No scheduled tasks found.";
      }
      return tasks;
    } catch (error) {
      console.error("Error listing scheduled tasks", error);
      return `Error listing scheduled tasks: ${error}`;
    }
  },
});

const setMemory = tool({
  description:
    "A tool to set a specific memory entry by key-value pair. This preserves existing memories.",
  parameters: z.object({
    key: z.string().describe("The key for the memory entry"),
    value: z.string().describe("The value to store for this key"),
  }),
  execute: async ({ key, value }) => {
    const { agent } = getCurrentAgent<Chat>();
    const agentState = agent!.state as { memory?: Record<string, string> };
    const currentMemory = agentState.memory || {};

    // Merge the new key-value pair with existing memory
    const updatedMemory = {
      ...currentMemory,
      [key]: value,
    };

    agent?.setState({
      memory: updatedMemory,
    });
    return `Memory "${key}" set to "${value}"`;
  },
});

const forgetMemory = tool({
  description: "A tool to forget a specific memory entry by key",
  parameters: z.object({
    key: z.string().describe("The key of the memory entry to forget"),
  }),
  execute: async ({ key }) => {
    const { agent } = getCurrentAgent<Chat>();
    const agentState = agent!.state as { memory?: Record<string, string> };
    const currentMemory = agentState.memory || {};

    // Create new memory object without the specified key
    const { [key]: _, ...updatedMemory } = currentMemory;

    agent?.setState({
      memory: updatedMemory,
    });
    return `Memory entry "${key}" forgotten`;
  },
});

const addMcpServer = tool({
  description: "A tool to dynamically add an MCP server",
  parameters: z.object({
    url: z.string(),
    name: z.string(),
  }),
  execute: async ({ url, name }) => {
    const { agent } = getCurrentAgent();
    if (!agent) {
      throw new Error("No agent found");
    }
    const { id, authUrl } = await agent.addMcpServer(
      name,
      url,
      "http://localhost:5173"
    );
    return `MCP server added with id ${id}. ${authUrl ? `Authentication is necessary. Use URL: ${authUrl}` : ""}`;
  },
});

const removeMcpServer = tool({
  description: "A tool to remove an MCP server by id",
  parameters: z.object({
    id: z.string(),
  }),
  execute: async ({ id }) => {
    const { agent } = getCurrentAgent<Chat>();
    if (!agent) {
      throw new Error("No agent found");
    }
    await agent.removeMcpServer(id);
    return `MCP server removed with id ${id}`;
  },
});

const listMcpServers = tool({
  description: "A tool to list all MCP servers",
  parameters: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();
    return agent!.getMcpServers();
  },
});

/**
 * Tool to cancel a scheduled task by its ID
 * This executes automatically without requiring human confirmation
 */
const cancelScheduledTask = tool({
  description: "Cancel a scheduled task using its ID",
  parameters: z.object({
    taskId: z.string().describe("The ID of the task to cancel"),
  }),
  execute: async ({ taskId }) => {
    const { agent } = getCurrentAgent<Chat>();
    try {
      await agent!.cancelSchedule(taskId);
      return `Task ${taskId} has been successfully canceled.`;
    } catch (error) {
      console.error("Error canceling scheduled task", error);
      return `Error canceling task ${taskId}: ${error}`;
    }
  },
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  setMemory,
  forgetMemory,
  addMcpServer,
  removeMcpServer,
  listMcpServers,
  getWeatherInformation,
  getLocalTime,
  scheduleTask,
  getScheduledTasks,
  cancelScheduledTask,
};

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 */
export const executions = {
  getWeatherInformation: async ({ city }: { city: string }) => {
    console.log(`Getting weather information for ${city}`);
    return `The weather in ${city} is sunny`;
  },
};
