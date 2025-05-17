// // server/embeddings.js
// import { OpenAIEmbeddings } from "@langchain/openai";
// import { Document } from "@langchain/core/documents";
// import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

// // Embed the chunks
// const embeddings = new OpenAIEmbeddings({
//   model: "text-embedding-3-large",
// });

// // Create vector store
// export const vectorStore = await PGVectorStore.initialize(embeddings, {
//   postgresConnectionOptions: {
//     connectionString: process.env.DB_URL,
//   },
//   tableName: "transcripts",
//   columns: {
//     idColumnName: "id",
//     vectorColumnName: "vector",
//     contentColumnName: "content",
//     metadataColumnName: "metadata",
//   },
//   distanceStrategy: "cosine", // Function to calculate the similarity between vectors
// });

// export const addYTVideoToVectorStore = async (videoData) => {
//   const { transcript, video_id } = videoData;

//   const docs = [
//     new Document({
//       pageContent: transcript,
//       metadata: { video_id },
//     }),
//   ];

//   // Split video trasncription into chunks
//   const splitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 1000,
//     chunkOverlap: 200,
//   });

//   const chunks = await splitter.splitDocuments(docs);

//   await vectorStore.addDocuments(chunks);
// };
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

console.log("VectorStore using DB_URL:", process.env.DB_URL);

export const vectorStore = await PGVectorStore.initialize(embeddings, {
  postgresConnectionOptions: {
    connectionString: process.env.DB_URL,
  },
  tableName: "transcripts",
  columns: {
    idColumnName: "id",
    vectorColumnName: "vector",
    contentColumnName: "content",
    metadataColumnName: "metadata",
  },
  distanceStrategy: "cosine",
});

export const addYTVideoToVectorStore = async (videoData) => {
  const { transcript, video_id } = videoData;

  const docs = [
    new Document({
      pageContent: transcript,
      metadata: { video_id },
    }),
  ];

  // Split the video into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await splitter.splitDocuments(docs);

  await vectorStore.addDocuments(chunks);
};
