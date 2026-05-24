import { Router } from "express";
import type { AppDatabase } from "../db/connection";
import { AgentsRepository } from "../repositories/agents";

export function agentsRouter(db: AppDatabase): Router {
  const router = Router();
  const agents = new AgentsRepository(db);

  router.get("/", (_req, res) => {
    res.json({ ok: true, agents: agents.list() });
  });

  return router;
}
