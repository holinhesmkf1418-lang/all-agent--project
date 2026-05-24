import cors from "cors";
import express from "express";
import type { AppDatabase } from "./db/connection";
import { migrate } from "./db/schema";
import { seedDefaultAgents } from "./db/seed";
import { HttpError } from "./http-error";
import { agentsRouter } from "./routes/agents";
import { projectsRouter } from "./routes/projects";

export function createApp(db: AppDatabase) {
  migrate(db);
  seedDefaultAgents(db);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/agents", agentsRouter(db));
  app.use("/api/projects", projectsRouter(db));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "unknown error";
    if (error instanceof HttpError) {
      res.status(error.statusCode).json({ ok: false, error: message });
      return;
    }
    if (message.includes("not found")) {
      res.status(404).json({ ok: false, error: message });
      return;
    }
    if (message.includes("Approval is not pending") || message.includes("does not match project status")) {
      res.status(409).json({ ok: false, error: message });
      return;
    }
    res.status(500).json({ ok: false, error: message });
  });

  return app;
}
