import { createAgent, createNetwork, anthropic, createTool, Tool } from '@inngest/agent-kit';
import { createServer } from '@inngest/agent-kit/server';
import { config } from 'dotenv-flow';
import z from 'zod';

// Load environment variables from .env files in project root
config({ debug: true, path: '../../' });

// Define our network state interface
interface NetworkState {
  messages: string[];
  response: string;
}

// Create our first agent
const assistantAgent = createAgent<NetworkState>({
  name: "Assistant",
  description: "A helpful AI assistant that can answer questions and provide guidance",
  system: "You are a helpful AI assistant. You provide clear, concise, and accurate responses to user queries.",
  model: anthropic({
    model: "claude-3-5-haiku-latest",
    defaultParameters: {
      max_tokens: 1000,
    },
  }),
  tools: [
    createTool({
      name: "save_response",
      description: "Save the response to the query",
      parameters: z.object({
        answer: z.string(),
      }),
      handler: async ({ answer }, { network }: Tool.Options<NetworkState>) => {
        network.state.data.response = answer
      },
    }),
  ],
});

// Create a network with our agent
const assistantNetwork = createNetwork<NetworkState>({
  name: "Assistant Network",
  agents: [assistantAgent],
  router: async ({ network }) => {
    if (!network.state.data.response) {
      return assistantAgent;
    }
  },
});

// Create and start the server
const server = createServer({
  agents: [assistantAgent],
  networks: [assistantNetwork],
});

const PORT = process.env.INNGEST_PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Inngest endpoint available at http://localhost:${PORT}/api/inngest`);
}); 