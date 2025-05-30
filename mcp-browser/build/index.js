import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({
    name: "mcpBrowser",
    version: "1.0.0"
}, {
    capabilities: {
        tools: {}
    }
});
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
                name: "browser",
                description: "Browse the web",
                handler: async (args) => {
                    console.log('test', args);
                },
                arguments: [{
                        name: "arg1",
                        description: "Example argument",
                        required: true
                    }]
            }]
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
