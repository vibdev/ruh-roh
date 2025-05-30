import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import z from "zod";
import { browserBase } from "./browserBase.js";

const app = express();

const server = new Server(
  {
    name: "mcpBrowser",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {
				listChanged: true,
			}
    }
  }
);


server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get-product-images",
        description: "Get the images of a product from a website",
        inputSchema: {
          type: "object",
          properties: {
            website: {
              type: "string",
              description: "The website to get the product images from",
            },
          },
          required: ["website"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get-product-images") {
			const images = await browserBase(args?.website as string)


      return { content: [{ type: "text", text: images }] };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      );
    }
    throw error;
  }
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
	console.log('Starting MCP Browser Server on port 3001')
  app.listen(3001);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});