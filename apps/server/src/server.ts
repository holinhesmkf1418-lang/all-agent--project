import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app";
import { openDatabase } from "./db/connection";

const databasePath = process.env.DATABASE_PATH || "data/agent-army.db";
mkdirSync(dirname(databasePath), { recursive: true });

const db = openDatabase(databasePath);
const app = createApp(db);
const port = Number(process.env.PORT || 5050);

app.listen(port, () => {
  console.log(`Agent Army API listening on http://127.0.0.1:${port}`);
});
