import { openDatabase, type AppDatabase } from "../db/connection";
import { migrate } from "../db/schema";
import { seedDefaultAgents } from "../db/seed";

export function createTestDatabase(): AppDatabase {
  const db = openDatabase(":memory:");
  migrate(db);
  seedDefaultAgents(db);
  return db;
}
