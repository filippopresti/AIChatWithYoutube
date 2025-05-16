// testing the file
// console.log("Agent started");

import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

import { OpenAIEmbeddings } from "@langchain/openai";

// import scraped data using brightdata
import data from "./data.js";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

import { tool } from "@langchain/core/tools";
import { z } from "zod";

const video1 = data[0]; // first scraped video data
const docs = [
  new Document({
    pageContent: video1.transcript,
    metadata: { video_id: video1.video_id },
  }),
];

// Split video trasncription into chunks
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const chunks = await splitter.splitDocuments(docs);
// console.log(chunks);

// Embed the chunks
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

// Create vector store
const vectorStore = new MemoryVectorStore(embeddings);

await vectorStore.addDocuments(chunks);

// Retrieve the most relevan chunks
const retrievedDocs = await vectorStore.similaritySearch(
  "What was the finish time of Norris?",
  5
);
// console.log("Retrieved Docs:----------------------");
console.log(retrievedDocs);

// Retrieval tool
const retrieveTool = tool(
  async ({ query }) => {
    console.log("Retrieving docs for query...");
    console.log(query);
    const retrievedDocs = await vectorStore.similaritySearch(query, 5);

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

// Create a React-style agent, wiring in your LLM and any tools
const agent = createReactAgent({ llm, tools: [retrieveTool] });

// Invoke a single-turn chat with your agent
const results = await agent.invoke({
  messages: [{ role: "user", content: "What was the finish time of Norris?" }],
});

// Log out the last result
console.log(results.messages.at(-1)?.content);
