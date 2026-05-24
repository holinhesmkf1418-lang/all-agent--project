import type { AppDatabase } from "./connection";

export function migrate(db: AppDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      description TEXT NOT NULL,
      runtime_type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL,
      tech_stack TEXT NOT NULL,
      ui_stage_enabled INTEGER NOT NULL DEFAULT 0,
      current_stage TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stage_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      assigned_agent_id TEXT NOT NULL,
      status TEXT NOT NULL,
      input TEXT NOT NULL,
      output_summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(assigned_agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      stage_task_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      runtime_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      logs TEXT NOT NULL DEFAULT '',
      error TEXT NOT NULL DEFAULT '',
      started_at TEXT,
      finished_at TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(stage_task_id) REFERENCES stage_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      stage_task_id TEXT NOT NULL,
      agent_run_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      file_path TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(stage_task_id) REFERENCES stage_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY(agent_run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      stage_task_id TEXT NOT NULL,
      status TEXT NOT NULL,
      question TEXT NOT NULL,
      artifact_ids_json TEXT NOT NULL DEFAULT '[]',
      decision TEXT NOT NULL DEFAULT '',
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      decided_at TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(stage_task_id) REFERENCES stage_tasks(id) ON DELETE CASCADE
    );
  `);
}
