import { z } from "zod";
import {
  anthropic,
  createAgent,
  createNetwork,
  createTool,
  Tool,
} from "@inngest/agent-kit";
import { channel, topic } from "@inngest/realtime";

import { inngest } from "./client";
import { linkupSearchAgent } from '@/lib/inngest/linkupAgent';

export interface NetworkState {
  // list of images to display
  imageList: string[];
  websites: string[];
}

// create a channel for each discussion, given a thread ID. A channel is a namespace for one or more topics of streams.
export const networkChannel = channel(
  (threadId: string) => `thread:${threadId}`
)
  // Add a specific topic, eg. "ai" for all AI data within the user's channel
  .addTopic(
    topic("messages").schema(
      z.object({
        message: z.object({
          text: z.string(),
          imageList: z.array(z.string()),
        }),
        id: z.string(),
      })
    )
  )
  .addTopic(
    topic("status").schema(
      z.object({
        status: z.enum(["running", "completed", "error"]),
      })
    )
  );

export const networkFunction = inngest.createFunction(
  {
    id: "network-agent",
  },
  {
    event: "network-agent/run",
  },
  async ({ event, publish }) => {
    const { query, threadId } = event.data;

    await publish(networkChannel(threadId).status({ status: "running" }));

    const imageListAgent = createAgent({
      name: "Image List Agent",
      description: "Provides a list of product images to display",
      system:
        "You are an image list agent. You are given a query. You need to provide a list of product images, ideally between 6 and 9, from a specific site to display as absolute URLs. You can use the 'get_website' tool to get the URL of the website that sells the product we're looking for.",
      model: anthropic({
        model: "claude-3-5-haiku-latest",
        defaultParameters: {
          max_tokens: 4096,
        },
      }),
      mcpServers: [
        {
          name: "mcp-browser",
          transport: {
            type: "sse",
            url: "http://localhost:3001/sse",
          },
        },
      ],
      tools: [
        createTool({
          name: "get_website",
          description: "Get the URL of the website that sells the product we're looking for",
          handler: (
            _,
            { network }: Tool.Options<NetworkState>
          ) => {
            // get random website from the list
            const siteCount = network.state.data.websites.length;
            const randomIndex = Math.floor(Math.random() * siteCount);
            const website = network.state.data.websites[randomIndex];
            return website;
          },
          
        }),
        createTool({
          name: "provide_image_list",
          description: "Provide the image list as an array of absolute URLs",
          parameters: z.object({
            imageList: z.string(),
          }),
          handler: async (
            { imageList },
            { network }: Tool.Options<NetworkState>
          ) => {
            network.state.data.imageList = JSON.parse(imageList);

            await publish(
              networkChannel(threadId).messages({
                message: {
                  text: 'Here you go!',
                  imageList: network.state.data.imageList,
                },
                id: crypto.randomUUID(),
              })
            );
          },
          
        }),
      ],
    });

    const network = createNetwork<NetworkState>({
      name: "Test Agent Network",
      agents: [linkupSearchAgent, imageListAgent],
      router: async (ev) => {
        const { network } = ev;
        if (!network.state.data.websites) {
          return linkupSearchAgent;
        } else if (!network.state.data.imageList) {
          return imageListAgent;
        }
      },
    });

    await network.run(query);

    await publish(
      networkChannel(threadId).status({ status: "completed" })
    );
  }
);
