// agent.js file before the changes at minute 1:39:00
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

import { MemorySaver } from "@langchain/langgraph";

const video1 = data[0]; // first scraped video data
const video_id = video1.video_id;

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
  3,
  (doc) => doc.metadata.video_id === video_id
);
// console.log("Retrieved Docs:----------------------");
console.log(retrievedDocs);

// Retrieval tool
const retrieveTool = tool(
  async ({ query }, { configurable: { video_id } }) => {
    console.log("Retrieving docs for query...");
    console.log(query);
    console.log(video_id);
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

const memorySaver = new MemorySaver();

// Create a React-style agent, wiring in your LLM and any tools
const agent = createReactAgent({
  llm,
  tools: [retrieveTool],
  checkpointer: memorySaver,
});

console.log(
  "Q1: What was the finish position and time of Norris? ------------"
);
// Invoke a single-turn chat with your agent
const results = await agent.invoke(
  {
    messages: [
      {
        role: "user",
        content:
          "What was the finish position and time of Norris? (based on video transcript)",
      },
    ],
  },
  { configurable: { thread_id: 1, video_id } }
);

// Log out the last result
console.log(results.messages.at(-1)?.content);

// scraper.js
// scraper.js
import axios from "axios";
import { load } from "cheerio";
import { writeFile } from "fs/promises";
import path from "path";

async function scrapeCoursePage(url) {
  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    timeout: 30_000,
  });
  const $ = load(html);
  return $("main")
    .find("p, h1, h2, h3, li")
    .map((_, el) => $(el).text().trim())
    .get()
    .join("\n\n");
}

/**
 * Clean up raw scraped text
 */
function cleanText(raw) {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter(
      (l) =>
        ![
          "Toggle caption",
          "Caption",
          "See all stories",
          "Open days",
          "CCI Shows 2025",
          "CCI news",
        ].includes(l)
    )
    .filter(
      (l) =>
        !l.match(
          /^(Image|Photo|Small robot|Image courtesy|Courtesy UAL|Image credit)/
        )
    )
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .join("\n\n");
}

(async () => {
  // 1. List of URLs you care about
  const urls = [
    "https://www.arts.ac.uk/creative-computing-institute",
    "https://www.arts.ac.uk/creative-computing-institute/courses",
    // …etc…
  ];

  // 2. Scrape each page and clean it
  const results = [];
  for (const url of urls) {
    console.log("Fetching", url);
    const raw = await scrapeCoursePage(url);
    const text = cleanText(raw);
    results.push({
      url,
      scrapedAt: new Date().toISOString(),
      text, // now the cleaned text
    });
  }

  // 3. Write out to data/courses.json
  const outPath = path.resolve("data", "courses.json");
  await writeFile(outPath, JSON.stringify(results, null, 2), "utf8");
  console.log("Wrote", results.length, "records to", outPath);
})();
