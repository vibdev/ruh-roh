import { NetworkState } from '@/lib/inngest/functions';
import {
  anthropic,
  createAgent,
  createNetwork,
  createTool,
  Tool,
} from "@inngest/agent-kit";
import { createSmitheryUrl } from "@smithery/sdk/shared/config.js";
import { z } from "zod";

const smitheryUrl = createSmitheryUrl("https://server.smithery.ai/mcp-search-linkup/mcp", { apiKey: process.env.SMITHERY_API_KEY });

export const linkupSearchAgent = createAgent({
  name: "linkup-search-agent",
  system: `You are a search agent that can search the web for products. You are given a query and you need to provide a list websites (ideally 2-3) that sell trendy products that match the query.
  IMPORTANT: Call the 'done' tool when you are finished with the task, passing a comma-separated list of absolute URLs.`,
  model: anthropic({
    model: "claude-3-5-haiku-latest",
    defaultParameters: {
      max_tokens: 4096,
    },
  }),
  tools: [
    createTool({
      name: "done",
      description: "Call this tool when you are finished with the task.",
      parameters: z.object({
        websites: z.string().describe("A comma separated list of absolute URLs."),
      }),
      handler: async ({ websites }, { network }: Tool.Options<NetworkState>) => {
        network.state.data.websites = websites.split(',');
      },
    }),
  ],
  mcpServers: [
    {
      name: "mcp-search-linkup",
      transport: {
        type: "streamable-http",
        url: smitheryUrl.toString(),
      },
    },
  ],
});
