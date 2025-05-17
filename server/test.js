// checkCount.js
import { Client } from "pg";
import "dotenv/config";

async function main() {
  const client = new Client({
    connectionString: process.env.DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const res = await client.query(
    `SELECT COUNT(*) AS count
       FROM transcripts
      WHERE metadata->>'video_id' = $1`,
    ["dGe5hvaBpVg"]
  );

  console.log("Rows for video 6rPFIlQXtL0:", res.rows[0].count);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
