import type { Approval, ApprovalStatus } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

interface ApprovalRow {
  id: string;
  project_id: string;
  stage_task_id: string;
  status: ApprovalStatus;
  question: string;
  artifact_ids_json: string;
  decision: string;
  comment: string;
  created_at: string;
  decided_at: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseArtifactIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    projectId: row.project_id,
    stageTaskId: row.stage_task_id,
    status: row.status,
    question: row.question,
    artifactIds: parseArtifactIds(row.artifact_ids_json),
    decision: row.decision,
    comment: row.comment,
    createdAt: row.created_at,
    decidedAt: row.decided_at
  };
}

export class ApprovalsRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: { projectId: string; stageTaskId: string; question: string; artifactIds: string[] }): Approval {
    const approval = {
      id: `approval_${nanoid(10)}`,
      projectId: input.projectId,
      stageTaskId: input.stageTaskId,
      status: "pending" as ApprovalStatus,
      question: input.question,
      artifactIdsJson: JSON.stringify(input.artifactIds),
      decision: "",
      comment: "",
      createdAt: nowIso(),
      decidedAt: null
    };
    this.db
      .prepare(`
        INSERT INTO approvals (id, project_id, stage_task_id, status, question, artifact_ids_json, decision, comment, created_at, decided_at)
        VALUES (@id, @projectId, @stageTaskId, @status, @question, @artifactIdsJson, @decision, @comment, @createdAt, @decidedAt)
      `)
      .run(approval);
    return this.find(approval.id);
  }

  decide(id: string, status: "approved" | "rejected", comment: string): Approval {
    this.db.prepare("UPDATE approvals SET status = ?, decision = ?, comment = ?, decided_at = ? WHERE id = ?").run(status, status, comment, nowIso(), id);
    return this.find(id);
  }

  find(id: string): Approval {
    const row = this.db.prepare("SELECT * FROM approvals WHERE id = ?").get(id);
    if (!row) throw new Error(`Approval not found: ${id}`);
    return mapApproval(row as ApprovalRow);
  }

  listByProject(projectId: string): Approval[] {
    return this.db
      .prepare("SELECT * FROM approvals WHERE project_id = ? ORDER BY created_at ASC")
      .all(projectId)
      .map((row) => mapApproval(row as ApprovalRow));
  }
}
