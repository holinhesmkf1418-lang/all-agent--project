import type { Project, ProjectStatus } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

interface ProjectRow {
  id: string;
  title: string;
  goal: string;
  status: ProjectStatus;
  tech_stack: string;
  ui_stage_enabled: number;
  current_stage: string;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    goal: row.goal,
    status: row.status,
    techStack: row.tech_stack,
    uiStageEnabled: Boolean(row.ui_stage_enabled),
    currentStage: row.current_stage,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class ProjectsRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: { title: string; goal: string; uiStageEnabled: boolean }): Project {
    const createdAt = nowIso();
    const project: Project = {
      id: `project_${nanoid(10)}`,
      title: input.title,
      goal: input.goal,
      status: "created",
      techStack: "React/Vite + Express + SQLite",
      uiStageEnabled: input.uiStageEnabled,
      currentStage: "created",
      createdAt,
      updatedAt: createdAt
    };
    this.db
      .prepare(`
        INSERT INTO projects (id, title, goal, status, tech_stack, ui_stage_enabled, current_stage, created_at, updated_at)
        VALUES (@id, @title, @goal, @status, @techStack, @uiStageEnabled, @currentStage, @createdAt, @updatedAt)
      `)
      .run({ ...project, uiStageEnabled: project.uiStageEnabled ? 1 : 0 });
    return project;
  }

  find(id: string): Project {
    const row = this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!row) throw new Error(`Project not found: ${id}`);
    return mapProject(row as ProjectRow);
  }

  list(): Project[] {
    return this.db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all().map((row) => mapProject(row as ProjectRow));
  }

  updateStatus(id: string, status: ProjectStatus): Project {
    const updatedAt = nowIso();
    this.db.prepare("UPDATE projects SET status = ?, current_stage = ?, updated_at = ? WHERE id = ?").run(status, status, updatedAt, id);
    return this.find(id);
  }
}
