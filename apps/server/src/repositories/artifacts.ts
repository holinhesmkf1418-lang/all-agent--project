import type { Artifact, ArtifactType } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

interface ArtifactRow {
  id: string;
  project_id: string;
  stage_task_id: string;
  agent_run_id: string;
  type: ArtifactType;
  title: string;
  content: string;
  file_path: string;
  created_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapArtifact(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    projectId: row.project_id,
    stageTaskId: row.stage_task_id,
    agentRunId: row.agent_run_id,
    type: row.type,
    title: row.title,
    content: row.content,
    filePath: row.file_path,
    createdAt: row.created_at
  };
}

export class ArtifactsRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: { projectId: string; stageTaskId: string; agentRunId: string; type: ArtifactType; title: string; content: string; filePath?: string }): Artifact {
    const artifact: Artifact = {
      id: `artifact_${nanoid(10)}`,
      projectId: input.projectId,
      stageTaskId: input.stageTaskId,
      agentRunId: input.agentRunId,
      type: input.type,
      title: input.title,
      content: input.content,
      filePath: input.filePath || "",
      createdAt: nowIso()
    };
    this.db
      .prepare(`
        INSERT INTO artifacts (id, project_id, stage_task_id, agent_run_id, type, title, content, file_path, created_at)
        VALUES (@id, @projectId, @stageTaskId, @agentRunId, @type, @title, @content, @filePath, @createdAt)
      `)
      .run(artifact);
    return artifact;
  }

  listByProject(projectId: string): Artifact[] {
    return this.db
      .prepare("SELECT * FROM artifacts WHERE project_id = ? ORDER BY created_at ASC")
      .all(projectId)
      .map((row) => mapArtifact(row as ArtifactRow));
  }
}
