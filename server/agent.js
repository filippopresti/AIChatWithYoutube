// server/agent.js
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { vectorStore, addYTVideoToVectorStore } from "./embeddings.js";
// import scraped data using brightdata
import data from "./data.js";

const video1 = data[0]; // first scraped video data
const video1_id = video1.video_id;
const video2 = data[1]; // second scraped video data
const video2_id = video2.video_id;
// await addYTVideoToVectorStore(video1); // add the first video to the vector store
// await addYTVideoToVectorStore(video2); // add the second video to the vector store

// Retrieval tool
const retrieveTool = tool(
  async ({ query }, { configurable: { video_id } }) => {
    const retrievedDocs = await vectorStore.similaritySearch(query, 3, {
      video_id,
    });

    const serializedDocs = retrievedDocs
      .map((doc) => doc.pageContent)
      .join("\n ");

    return serializedDocs;
  },
  {
    name: "retrieve",
    description:
      "Retrieve the most relevant chunks of text from the transcript of a youtube video",
    schema: z.object({
      query: z.string(),
    }),
  }
);

// Instantiate the Anthropic chat mode
const llm = new ChatAnthropic({
  modelName: "claude-3-7-sonnet-latest",
});

const memorySaver = new MemorySaver();

// Create a React-style agent, wiring in your LLM and any tools
const agent = createReactAgent({
  llm,
  tools: [retrieveTool],
  checkpointer: memorySaver,
});

console.log(
  "Q1: What will people learn from the video (based on its transcript)? ------------"
);
// Invoke a single-turn chat with your agent
const results = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content:
          "What will people learn from this video (based on its trascript)?",
      },
    ],
  },
  { configurable: { thread_id: 1, video_id: video2_id } }
);

// Log out the last result
console.log(results.messages.at(-1)?.content);
