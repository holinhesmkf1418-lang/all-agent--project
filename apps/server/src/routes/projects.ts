import { Router } from "express";
import type { AppDatabase } from "../db/connection";
import { HttpError } from "../http-error";
import { ApprovalService } from "../services/approval-service";
import { ProjectService } from "../services/project-service";

export function projectsRouter(db: AppDatabase): Router {
  const router = Router();
  const projectService = new ProjectService(db);
  const approvalService = new ApprovalService(db, projectService);

  router.get("/", (_req, res) => {
    res.json({ ok: true, projects: projectService.listProjects() });
  });

  router.post("/", async (req, res, next) => {
    try {
      const goal = String(req.body.goal || "").trim();
      const title = String(req.body.title || goal.slice(0, 40) || "新项目").trim();
      if (!goal) return res.status(400).json({ ok: false, error: "goal is required" });

      const snapshot = await projectService.createProject({
        title,
        goal,
        uiStageEnabled: Boolean(req.body.uiStageEnabled)
      });
      res.status(201).json({ ok: true, snapshot });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:projectId", (req, res, next) => {
    try {
      res.json({ ok: true, snapshot: projectService.snapshot(req.params.projectId) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/approvals/:approvalId/decision", async (req, res, next) => {
    try {
      const decision = req.body.decision;
      if (decision !== "approved" && decision !== "rejected") {
        throw new HttpError(400, "invalid decision");
      }
      const snapshot = await approvalService.decide(req.params.approvalId, decision, String(req.body.comment || ""));
      res.json({ ok: true, snapshot });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
