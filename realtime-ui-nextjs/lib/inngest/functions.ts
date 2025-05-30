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

export interface NetworkState {
  // list of images to display
  imageList: string[];
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
        "You are an image list agent. You are given a query and you need to provide a list of product images to display as absolute URLs.",
      model: anthropic({
        model: "claude-3-5-haiku-latest",
        defaultParameters: {
          max_tokens: 4096,
        },
      }),
      tools: [
        createTool({
          name: "provide_image_list",
          description: "Provide the image list as an array of absolute URLs",
          parameters: z.object({
            imageList: z.array(z.string()),
          }),
          handler: async (
            { imageList },
            { network }: Tool.Options<NetworkState>
          ) => {
            network.state.data.imageList = imageList;

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

    // const securityAgent = createAgent({
    //   name: "Database Security Expert",
    //   description:
    //     "Provides expert guidance on PostgreSQL security, access control, audit logging, and compliance best practices",
    //   system:
    //     "You are a PostgreSQL security expert. " +
    //     "Provide answers to questions linked to PostgreSQL security topics such as encryption, access control, audit logging, and compliance best practices.",
    //   model: anthropic({
    //     model: "claude-3-5-haiku-latest",
    //     defaultParameters: {
    //       max_tokens: 4096,
    //     },
    //   }),
    //   tools: [
    //     createTool({
    //       name: "provide_answer",
    //       description: "Provide the answer to the questions",
    //       parameters: z.object({
    //         answer: z.string(),
    //       }),
    //       handler: async (
    //         { answer },
    //         { network }: Tool.Options<NetworkState>
    //       ) => {
    //         network.state.data.security_agent_answer = answer;

    //         await publish(
    //           networkChannel(threadId).messages({
    //             message: `The Security Expert Agent has the following recommendation: ${network.state.data.security_agent_answer}`,
    //             id: crypto.randomUUID(),
    //           })
    //         );
    //       },
    //     }),
    //   ],
    // });

    const network = createNetwork<NetworkState>({
      name: "Test Agent Network",
      agents: [imageListAgent],
      router: async ({ network }) => {
        if (!network.state.data.imageList) {
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
