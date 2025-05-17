// // server/index.js
// import express from "express";
// import cors from "cors";
// import { agent } from "./agent.js";

// const port = process.env.PORT || 3000;
// const app = express();

// app.use(express.json());
// app.use(cors());

// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });

// app.post("/generate", async (req, res) => {
//   const { query, video_id, thread_id } = req.body;
//   console.log(
//     "Query: ",
//     query,
//     "Video ID: ",
//     video_id,
//     "thread_id: ",
//     thread_id
//   );

//   // Invoke a single-turn chat with your agent
//   const results = await agent.invoke(
//     {
//       messages: [
//         {
//           role: "user",
//           content: query,
//         },
//       ],
//     },
//     { configurable: { thread_id, video_id } }
//   );

//   // Log out the last result
//   console.log(results.messages.at(-1)?.content);
//   res.send(results.messages.at(-1)?.content);
// });

// app.post("/webhook", (req, res) => {
//   console.log("Received webhook data:", req.body);
//   res.send("Webhook received");
// });

// app.listen(port, () => {
//   console.log(`Server is runing on port ${port}`);
// });

import express from "express";
import cors from "cors";
import { agent } from "./agent.js";
import { addYTVideoToVectorStore } from "./embeddings.js";

const port = process.env.PORT || 3000;

const app = express();

app.use(express.json({ limit: "200mb" }));
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// curl -X POST http://localhost:3000/generate \
// -H "Content-Type: application/json" \
// -d '{
//   "query": "What will people learn from this video?",
//   "video_id": "Pxn276cWKeI",
//   "thread_id": 1
// }'

app.post("/generate", async (req, res) => {
  const { query, thread_id } = req.body;
  console.log(query, thread_id);

  const results = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
    },
    { configurable: { thread_id } }
  );

  res.send(results.messages.at(-1)?.content);
});

app.post("/webhook", async (req, res) => {
  console.log("🕵️ Received webhook payload:", JSON.stringify(req.body));

  const videos = Array.isArray(req.body) ? req.body : [req.body];
  for (const { url, transcript } of videos) {
    if (!url || !transcript) {
      console.warn("  Skipping malformed item:", { url, transcript });
      continue;
    }

    // 1) Extract the YouTube video ID
    const idMatch = url.match(/[?&]v=([^&]+)/);
    const video_id = idMatch?.[1];
    if (!video_id) {
      console.warn("  Could not parse video_id from URL:", url);
      continue;
    }

    console.log(`  Ingesting transcript for video_id=${video_id}…`);
    await addYTVideoToVectorStore({ video_id, transcript });
    console.log(`  Done ingesting ${video_id}`);
  }

  res.send("OK");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
