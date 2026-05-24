import type { ProjectStatus, StageTask, StageTaskStatus } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

interface StageTaskRow {
  id: string;
  project_id: string;
  stage: ProjectStatus;
  assigned_agent_id: string;
  status: StageTaskStatus;
  input: string;
  output_summary: string;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapStageTask(row: StageTaskRow): StageTask {
  return {
    id: row.id,
    projectId: row.project_id,
    stage: row.stage,
    assignedAgentId: row.assigned_agent_id,
    status: row.status,
    input: row.input,
    outputSummary: row.output_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class StageTasksRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: { projectId: string; stage: ProjectStatus; assignedAgentId: string; input: string }): StageTask {
    const createdAt = nowIso();
    const task: StageTask = {
      id: `stage_${nanoid(10)}`,
      projectId: input.projectId,
      stage: input.stage,
      assignedAgentId: input.assignedAgentId,
      status: "pending",
      input: input.input,
      outputSummary: "",
      createdAt,
      updatedAt: createdAt
    };
    this.db
      .prepare(`
        INSERT INTO stage_tasks (id, project_id, stage, assigned_agent_id, status, input, output_summary, created_at, updated_at)
        VALUES (@id, @projectId, @stage, @assignedAgentId, @status, @input, @outputSummary, @createdAt, @updatedAt)
      `)
      .run(task);
    return task;
  }

  updateStatus(id: string, status: StageTaskStatus, outputSummary = ""): StageTask {
    this.db.prepare("UPDATE stage_tasks SET status = ?, output_summary = ?, updated_at = ? WHERE id = ?").run(status, outputSummary, nowIso(), id);
    return this.find(id);
  }

  find(id: string): StageTask {
    const row = this.db.prepare("SELECT * FROM stage_tasks WHERE id = ?").get(id);
    if (!row) throw new Error(`Stage task not found: ${id}`);
    return mapStageTask(row as StageTaskRow);
  }

  listByProject(projectId: string): StageTask[] {
    return this.db
      .prepare("SELECT * FROM stage_tasks WHERE project_id = ? ORDER BY created_at ASC")
      .all(projectId)
      .map((row) => mapStageTask(row as StageTaskRow));
  }
}
