import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// Embed the chunks
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

// Create vector store
export const vectorStore = new MemoryVectorStore(embeddings);

export const addYTVideoToVectorStore = async (videoData) => {
  const { video_id, transcript } = videoData;

  const docs = [
    new Document({
      pageContent: transcript,
      metadata: { video_id },
    }),
  ];

  // Split video trasncription into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await splitter.splitDocuments(docs);

  await vectorStore.addDocuments(chunks);
};
