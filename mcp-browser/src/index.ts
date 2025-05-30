import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
	ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

const app = express();

const server = new Server(
  {
    name: "mcpBrowser",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: "browser",
      description: "Browse the web",
			handler: async (args: any) => {
				console.log('test', args)
			},
      arguments: [{
        name: "arg1",
        description: "Example argument",
        required: true
      }]
    }]
  };
});

let transport: SSEServerTransport | null = null;

app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});

app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

async function main() {
  app.listen(3000);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});