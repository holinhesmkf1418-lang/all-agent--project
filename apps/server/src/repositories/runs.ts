import type { AgentRun, AgentRunStatus, RuntimeType } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

interface AgentRunRow {
  id: string;
  project_id: string;
  stage_task_id: string;
  agent_id: string;
  runtime_type: RuntimeType;
  prompt: string;
  status: AgentRunStatus;
  logs: string;
  error: string;
  started_at: string | null;
  finished_at: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapRun(row: AgentRunRow): AgentRun {
  return {
    id: row.id,
    projectId: row.project_id,
    stageTaskId: row.stage_task_id,
    agentId: row.agent_id,
    runtimeType: row.runtime_type,
    prompt: row.prompt,
    status: row.status,
    logs: row.logs,
    error: row.error,
    startedAt: row.started_at,
    finishedAt: row.finished_at
  };
}

export class RunsRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: { projectId: string; stageTaskId: string; agentId: string; runtimeType: RuntimeType; prompt: string }): AgentRun {
    const run: AgentRun = {
      id: `run_${nanoid(10)}`,
      projectId: input.projectId,
      stageTaskId: input.stageTaskId,
      agentId: input.agentId,
      runtimeType: input.runtimeType,
      prompt: input.prompt,
      status: "queued",
      logs: "",
      error: "",
      startedAt: null,
      finishedAt: null
    };
    this.db
      .prepare(`
        INSERT INTO agent_runs (id, project_id, stage_task_id, agent_id, runtime_type, prompt, status, logs, error, started_at, finished_at)
        VALUES (@id, @projectId, @stageTaskId, @agentId, @runtimeType, @prompt, @status, @logs, @error, @startedAt, @finishedAt)
      `)
      .run(run);
    return run;
  }

  finish(id: string, status: AgentRunStatus, logs: string, error = ""): AgentRun {
    const finishedAt = nowIso();
    this.db
      .prepare("UPDATE agent_runs SET status = ?, logs = ?, error = ?, started_at = COALESCE(started_at, ?), finished_at = ? WHERE id = ?")
      .run(status, logs, error, finishedAt, finishedAt, id);
    return this.find(id);
  }

  find(id: string): AgentRun {
    const row = this.db.prepare("SELECT * FROM agent_runs WHERE id = ?").get(id);
    if (!row) throw new Error(`Agent run not found: ${id}`);
    return mapRun(row as AgentRunRow);
  }

  listByProject(projectId: string): AgentRun[] {
    return this.db.prepare("SELECT * FROM agent_runs WHERE project_id = ? ORDER BY rowid ASC").all(projectId).map((row) => mapRun(row as AgentRunRow));
  }
}
