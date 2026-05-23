# Agent Army MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable foundation of the Agent software development workbench: project creation, staged workflow, agents, runs, artifacts, approvals, mock runtime execution, and a Kanban-style UI shell.

**Architecture:** Use a small monorepo with a shared TypeScript package, an Express/SQLite API server, and a React/Vite frontend. The backend owns workflow state transitions and runtime adapter orchestration; the frontend renders the workbench and calls REST endpoints. The first runtime is deterministic mock execution so the workflow can be tested before real Codex/Hermes/model adapters are added.

**Tech Stack:** Node.js, TypeScript, Express, SQLite via `better-sqlite3`, Vitest, React, Vite.

---

## Scope Notes

The approved spec covers the full MVP and future runtime ecosystem. This plan intentionally implements the **foundation slice** first:

- Project creation.
- Default agent registry.
- Project/StageTask/AgentRun/Artifact/Approval persistence.
- Strict stage-gate state machine.
- Mock runtime adapter.
- REST API.
- Kanban workbench UI shell.

Out of scope for this foundation plan:

- Real Codex/Hermes/Claude/DeepSeek execution.
- Actual code generation into child projects.
- Real generated child-app browser verification.
- Authentication, billing, multi-tenancy, deployment.

Those become follow-up plans after this foundation is working and tested.

## Target File Structure

```text
package.json
tsconfig.base.json
apps/
  server/
    package.json
    src/
      app.ts
      server.ts
      db/
        connection.ts
        schema.ts
        seed.ts
      domain/
        constants.ts
        workflow.ts
        workflow.test.ts
      repositories/
        projects.ts
        agents.ts
        stage-tasks.ts
        runs.ts
        artifacts.ts
        approvals.ts
      runtime/
        adapter.ts
        mock-adapter.ts
      services/
        project-service.ts
        approval-service.ts
      routes/
        projects.ts
        agents.ts
      test/
        test-db.ts
    tests/
      project-flow.test.ts
  web/
    package.json
    index.html
    src/
      main.tsx
      App.tsx
      api.ts
      styles.css
      components/
        AgentSidebar.tsx
        ProjectBoard.tsx
        ArtifactPanel.tsx
packages/
  shared/
    package.json
    src/
      index.ts
      types.ts
```

---

### Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Write root package metadata**

Create `package.json`:

```json
{
  "name": "all-agent-project",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/server",
    "apps/web",
    "packages/shared"
  ],
  "scripts": {
    "dev": "npm run dev -w apps/server",
    "dev:web": "npm run dev -w apps/web",
    "build": "npm run build -ws",
    "test": "npm run test -ws",
    "typecheck": "npm run typecheck -ws"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Write shared TypeScript config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "baseUrl": ".",
    "paths": {
      "@agent-army/shared": ["packages/shared/src/index.ts"]
    },
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 3: Extend `.gitignore`**

Ensure `.gitignore` contains exactly these entries plus any existing entries:

```gitignore
.superpowers/
node_modules/
dist/
.env
data/*.db
data/*.db-shm
data/*.db-wal
```

- [ ] **Step 4: Create shared package**

Create `packages/shared/package.json`:

```json
{
  "name": "@agent-army/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

Create `packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "declaration": true,
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 5: Add shared types**

Create `packages/shared/src/types.ts`:

```ts
export type ProjectStatus =
  | "created"
  | "planning"
  | "waiting_plan"
  | "prd"
  | "waiting_prd"
  | "ui_optional"
  | "developing"
  | "testing"
  | "waiting_test"
  | "reviewing"
  | "delivered"
  | "blocked";

export type StageTaskStatus =
  | "pending"
  | "running"
  | "waiting_approval"
  | "succeeded"
  | "failed"
  | "blocked"
  | "cancelled";

export type AgentRunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type AgentRole = "pm" | "product" | "uiux" | "developer" | "tester" | "reviewer";
export type RuntimeType = "mock" | "model_api" | "codex_cli" | "hermes";

export type ArtifactType =
  | "project_plan"
  | "prd"
  | "wireframe"
  | "ui_spec"
  | "tech_design"
  | "source_code"
  | "test_cases"
  | "test_report"
  | "delivery_summary";

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  runtimeType: RuntimeType;
  enabled: boolean;
}

export interface Project {
  id: string;
  title: string;
  goal: string;
  status: ProjectStatus;
  techStack: string;
  uiStageEnabled: boolean;
  currentStage: string;
  createdAt: string;
  updatedAt: string;
}

export interface StageTask {
  id: string;
  projectId: string;
  stage: ProjectStatus;
  assignedAgentId: string;
  status: StageTaskStatus;
  input: string;
  outputSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentRun {
  id: string;
  projectId: string;
  stageTaskId: string;
  agentId: string;
  runtimeType: RuntimeType;
  prompt: string;
  status: AgentRunStatus;
  logs: string;
  error: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface Artifact {
  id: string;
  projectId: string;
  stageTaskId: string;
  agentRunId: string;
  type: ArtifactType;
  title: string;
  content: string;
  filePath: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  projectId: string;
  stageTaskId: string;
  status: ApprovalStatus;
  question: string;
  artifactIds: string[];
  decision: string;
  comment: string;
  createdAt: string;
  decidedAt: string | null;
}
```

Create `packages/shared/src/index.ts`:

```ts
export * from "./types";
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 7: Verify shared package typecheck**

Run:

```bash
npm run typecheck -w packages/shared
```

Expected: TypeScript completes with no errors.

- [ ] **Step 8: Commit scaffold**

```bash
git add .gitignore package.json package-lock.json tsconfig.base.json packages/shared
git commit -m "chore: scaffold agent army monorepo"
```

---

### Task 2: Server Database Schema

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/db/connection.ts`
- Create: `apps/server/src/db/schema.ts`
- Create: `apps/server/src/db/seed.ts`
- Create: `apps/server/src/test/test-db.ts`

- [ ] **Step 1: Create server package**

Create `apps/server/package.json`:

```json
{
  "name": "@agent-army/server",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@agent-army/shared": "0.0.0",
    "better-sqlite3": "^11.1.2",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "nanoid": "^5.0.7"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

Create `apps/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 2: Add SQLite connection helper**

Create `apps/server/src/db/connection.ts`:

```ts
import Database from "better-sqlite3";

export type AppDatabase = Database.Database;

export function openDatabase(filename = process.env.DATABASE_PATH || "data/agent-army.db"): AppDatabase {
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
```

- [ ] **Step 3: Add schema migration**

Create `apps/server/src/db/schema.ts`:

```ts
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
```

- [ ] **Step 4: Seed default agents**

Create `apps/server/src/db/seed.ts`:

```ts
import type { AppDatabase } from "./connection";

const defaultAgents = [
  ["agent_pm", "项目经理", "pm", "拆解计划、控制流程、协调返工", "mock"],
  ["agent_product", "产品经理", "product", "输出 PRD、页面清单、页面线框图和验收标准", "mock"],
  ["agent_uiux", "UI/UX 设计师", "uiux", "输出交互说明、视觉方向和组件结构", "mock"],
  ["agent_developer", "研发工程师", "developer", "输出技术方案、前后端实现和启动说明", "mock"],
  ["agent_tester", "测试工程师", "tester", "输出测试用例、执行结果和风险报告", "mock"],
  ["agent_reviewer", "审查官", "reviewer", "进行质量门禁和交付总结", "mock"]
] as const;

export function seedDefaultAgents(db: AppDatabase): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO agents (id, name, role, description, runtime_type, enabled)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  const tx = db.transaction(() => {
    for (const agent of defaultAgents) insert.run(...agent);
  });
  tx();
}
```

- [ ] **Step 5: Add test DB helper**

Create `apps/server/src/test/test-db.ts`:

```ts
import { openDatabase, type AppDatabase } from "../db/connection";
import { migrate } from "../db/schema";
import { seedDefaultAgents } from "../db/seed";

export function createTestDatabase(): AppDatabase {
  const db = openDatabase(":memory:");
  migrate(db);
  seedDefaultAgents(db);
  return db;
}
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
npm install
```

Expected: server dependencies install successfully.

- [ ] **Step 7: Typecheck server**

Run:

```bash
npm run typecheck -w apps/server
```

Expected: TypeScript completes with no errors.

- [ ] **Step 8: Commit database foundation**

```bash
git add apps/server package-lock.json
git commit -m "feat: add server database schema"
```

---

### Task 3: Workflow State Machine

**Files:**
- Create: `apps/server/src/domain/constants.ts`
- Create: `apps/server/src/domain/workflow.ts`
- Create: `apps/server/src/domain/workflow.test.ts`

- [ ] **Step 1: Add workflow constants**

Create `apps/server/src/domain/constants.ts`:

```ts
import type { AgentRole, ArtifactType, ProjectStatus } from "@agent-army/shared";

export interface StageDefinition {
  status: ProjectStatus;
  agentRole: AgentRole;
  artifactTypes: ArtifactType[];
  needsApprovalAfter: boolean;
}

export const stageDefinitions: StageDefinition[] = [
  { status: "planning", agentRole: "pm", artifactTypes: ["project_plan"], needsApprovalAfter: true },
  { status: "prd", agentRole: "product", artifactTypes: ["prd", "wireframe"], needsApprovalAfter: true },
  { status: "ui_optional", agentRole: "uiux", artifactTypes: ["ui_spec"], needsApprovalAfter: false },
  { status: "developing", agentRole: "developer", artifactTypes: ["tech_design", "source_code"], needsApprovalAfter: false },
  { status: "testing", agentRole: "tester", artifactTypes: ["test_cases", "test_report"], needsApprovalAfter: true },
  { status: "reviewing", agentRole: "reviewer", artifactTypes: ["delivery_summary"], needsApprovalAfter: false }
];
```

- [ ] **Step 2: Write failing workflow tests**

Create `apps/server/src/domain/workflow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { nextStatusAfterApproval, nextStatusAfterStageSuccess, rejectionTarget } from "./workflow";

describe("workflow", () => {
  it("moves planning success to waiting_plan", () => {
    expect(nextStatusAfterStageSuccess("planning", false)).toBe("waiting_plan");
  });

  it("moves approved plan to prd", () => {
    expect(nextStatusAfterApproval("waiting_plan", false)).toBe("prd");
  });

  it("skips ui_optional when disabled", () => {
    expect(nextStatusAfterApproval("waiting_prd", false)).toBe("developing");
  });

  it("uses ui_optional when enabled", () => {
    expect(nextStatusAfterApproval("waiting_prd", true)).toBe("ui_optional");
  });

  it("routes failed testing back to developing", () => {
    expect(rejectionTarget("waiting_test")).toBe("developing");
  });
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm run test -w apps/server -- src/domain/workflow.test.ts
```

Expected: FAIL because `workflow.ts` does not exist.

- [ ] **Step 4: Implement workflow transitions**

Create `apps/server/src/domain/workflow.ts`:

```ts
import type { ProjectStatus } from "@agent-army/shared";

export function nextStatusAfterStageSuccess(status: ProjectStatus, uiStageEnabled: boolean): ProjectStatus {
  switch (status) {
    case "planning":
      return "waiting_plan";
    case "prd":
      return "waiting_prd";
    case "ui_optional":
      return "developing";
    case "developing":
      return "testing";
    case "testing":
      return "waiting_test";
    case "reviewing":
      return "delivered";
    default:
      throw new Error(`Cannot complete stage from status: ${status}`);
  }
}

export function nextStatusAfterApproval(status: ProjectStatus, uiStageEnabled: boolean): ProjectStatus {
  switch (status) {
    case "waiting_plan":
      return "prd";
    case "waiting_prd":
      return uiStageEnabled ? "ui_optional" : "developing";
    case "waiting_test":
      return "reviewing";
    default:
      throw new Error(`Cannot approve from status: ${status}`);
  }
}

export function rejectionTarget(status: ProjectStatus): ProjectStatus {
  switch (status) {
    case "waiting_plan":
      return "planning";
    case "waiting_prd":
      return "prd";
    case "waiting_test":
      return "developing";
    default:
      throw new Error(`Cannot reject from status: ${status}`);
  }
}
```

- [ ] **Step 5: Run workflow tests**

Run:

```bash
npm run test -w apps/server -- src/domain/workflow.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit workflow**

```bash
git add apps/server/src/domain
git commit -m "feat: add project workflow state machine"
```

---

### Task 4: Repositories

**Files:**
- Create: `apps/server/src/repositories/agents.ts`
- Create: `apps/server/src/repositories/projects.ts`
- Create: `apps/server/src/repositories/stage-tasks.ts`
- Create: `apps/server/src/repositories/runs.ts`
- Create: `apps/server/src/repositories/artifacts.ts`
- Create: `apps/server/src/repositories/approvals.ts`

- [ ] **Step 1: Implement agents repository**

Create `apps/server/src/repositories/agents.ts`:

```ts
import type { Agent, AgentRole } from "@agent-army/shared";
import type { AppDatabase } from "../db/connection";

function mapAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    description: row.description,
    runtimeType: row.runtime_type,
    enabled: Boolean(row.enabled)
  };
}

export class AgentsRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): Agent[] {
    return this.db.prepare("SELECT * FROM agents ORDER BY rowid ASC").all().map(mapAgent);
  }

  findByRole(role: AgentRole): Agent {
    const row = this.db.prepare("SELECT * FROM agents WHERE role = ? AND enabled = 1 LIMIT 1").get(role);
    if (!row) throw new Error(`No enabled agent for role: ${role}`);
    return mapAgent(row);
  }
}
```

- [ ] **Step 2: Implement projects repository**

Create `apps/server/src/repositories/projects.ts`:

```ts
import type { Project, ProjectStatus } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

function nowIso(): string {
  return new Date().toISOString();
}

function mapProject(row: any): Project {
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
    const project: Project = {
      id: `project_${nanoid(10)}`,
      title: input.title,
      goal: input.goal,
      status: "created",
      techStack: "React/Vite + Express + SQLite",
      uiStageEnabled: input.uiStageEnabled,
      currentStage: "created",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.db.prepare(`
      INSERT INTO projects (id, title, goal, status, tech_stack, ui_stage_enabled, current_stage, created_at, updated_at)
      VALUES (@id, @title, @goal, @status, @techStack, @uiStageEnabled, @currentStage, @createdAt, @updatedAt)
    `).run({ ...project, uiStageEnabled: project.uiStageEnabled ? 1 : 0 });
    return project;
  }

  find(id: string): Project {
    const row = this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!row) throw new Error(`Project not found: ${id}`);
    return mapProject(row);
  }

  list(): Project[] {
    return this.db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all().map(mapProject);
  }

  updateStatus(id: string, status: ProjectStatus): Project {
    const updatedAt = nowIso();
    this.db.prepare("UPDATE projects SET status = ?, current_stage = ?, updated_at = ? WHERE id = ?")
      .run(status, status, updatedAt, id);
    return this.find(id);
  }
}
```

- [ ] **Step 3: Implement remaining repositories**

Create `apps/server/src/repositories/stage-tasks.ts`:

```ts
import type { ProjectStatus, StageTask, StageTaskStatus } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

function nowIso(): string {
  return new Date().toISOString();
}

function mapStageTask(row: any): StageTask {
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
    const task = {
      id: `stage_${nanoid(10)}`,
      projectId: input.projectId,
      stage: input.stage,
      assignedAgentId: input.assignedAgentId,
      status: "pending" as StageTaskStatus,
      input: input.input,
      outputSummary: "",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.db.prepare(`
      INSERT INTO stage_tasks (id, project_id, stage, assigned_agent_id, status, input, output_summary, created_at, updated_at)
      VALUES (@id, @projectId, @stage, @assignedAgentId, @status, @input, @outputSummary, @createdAt, @updatedAt)
    `).run(task);
    return task;
  }

  updateStatus(id: string, status: StageTaskStatus, outputSummary = ""): StageTask {
    this.db.prepare("UPDATE stage_tasks SET status = ?, output_summary = ?, updated_at = ? WHERE id = ?")
      .run(status, outputSummary, nowIso(), id);
    return this.find(id);
  }

  find(id: string): StageTask {
    const row = this.db.prepare("SELECT * FROM stage_tasks WHERE id = ?").get(id);
    if (!row) throw new Error(`Stage task not found: ${id}`);
    return mapStageTask(row);
  }

  listByProject(projectId: string): StageTask[] {
    return this.db.prepare("SELECT * FROM stage_tasks WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map(mapStageTask);
  }
}
```

Create `apps/server/src/repositories/runs.ts`:

```ts
import type { AgentRun, AgentRunStatus, RuntimeType } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

function nowIso(): string {
  return new Date().toISOString();
}

function mapRun(row: any): AgentRun {
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
    const run = {
      id: `run_${nanoid(10)}`,
      projectId: input.projectId,
      stageTaskId: input.stageTaskId,
      agentId: input.agentId,
      runtimeType: input.runtimeType,
      prompt: input.prompt,
      status: "queued" as AgentRunStatus,
      logs: "",
      error: "",
      startedAt: null,
      finishedAt: null
    };
    this.db.prepare(`
      INSERT INTO agent_runs (id, project_id, stage_task_id, agent_id, runtime_type, prompt, status, logs, error, started_at, finished_at)
      VALUES (@id, @projectId, @stageTaskId, @agentId, @runtimeType, @prompt, @status, @logs, @error, @startedAt, @finishedAt)
    `).run(run);
    return run;
  }

  finish(id: string, status: AgentRunStatus, logs: string, error = ""): AgentRun {
    this.db.prepare("UPDATE agent_runs SET status = ?, logs = ?, error = ?, started_at = COALESCE(started_at, ?), finished_at = ? WHERE id = ?")
      .run(status, logs, error, nowIso(), nowIso(), id);
    return this.find(id);
  }

  find(id: string): AgentRun {
    const row = this.db.prepare("SELECT * FROM agent_runs WHERE id = ?").get(id);
    if (!row) throw new Error(`Agent run not found: ${id}`);
    return mapRun(row);
  }

  listByProject(projectId: string): AgentRun[] {
    return this.db.prepare("SELECT * FROM agent_runs WHERE project_id = ? ORDER BY rowid ASC").all(projectId).map(mapRun);
  }
}
```

Create `apps/server/src/repositories/artifacts.ts`:

```ts
import type { Artifact, ArtifactType } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

function nowIso(): string {
  return new Date().toISOString();
}

function mapArtifact(row: any): Artifact {
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
    const artifact = {
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
    this.db.prepare(`
      INSERT INTO artifacts (id, project_id, stage_task_id, agent_run_id, type, title, content, file_path, created_at)
      VALUES (@id, @projectId, @stageTaskId, @agentRunId, @type, @title, @content, @filePath, @createdAt)
    `).run(artifact);
    return artifact;
  }

  listByProject(projectId: string): Artifact[] {
    return this.db.prepare("SELECT * FROM artifacts WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map(mapArtifact);
  }
}
```

Create `apps/server/src/repositories/approvals.ts`:

```ts
import type { Approval, ApprovalStatus } from "@agent-army/shared";
import { nanoid } from "nanoid";
import type { AppDatabase } from "../db/connection";

function nowIso(): string {
  return new Date().toISOString();
}

function mapApproval(row: any): Approval {
  return {
    id: row.id,
    projectId: row.project_id,
    stageTaskId: row.stage_task_id,
    status: row.status,
    question: row.question,
    artifactIds: JSON.parse(row.artifact_ids_json || "[]"),
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
    this.db.prepare(`
      INSERT INTO approvals (id, project_id, stage_task_id, status, question, artifact_ids_json, decision, comment, created_at, decided_at)
      VALUES (@id, @projectId, @stageTaskId, @status, @question, @artifactIdsJson, @decision, @comment, @createdAt, @decidedAt)
    `).run(approval);
    return this.find(approval.id);
  }

  decide(id: string, status: "approved" | "rejected", comment: string): Approval {
    this.db.prepare("UPDATE approvals SET status = ?, decision = ?, comment = ?, decided_at = ? WHERE id = ?")
      .run(status, status, comment, nowIso(), id);
    return this.find(id);
  }

  find(id: string): Approval {
    const row = this.db.prepare("SELECT * FROM approvals WHERE id = ?").get(id);
    if (!row) throw new Error(`Approval not found: ${id}`);
    return mapApproval(row);
  }

  listByProject(projectId: string): Approval[] {
    return this.db.prepare("SELECT * FROM approvals WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map(mapApproval);
  }
}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck -w apps/server
```

Expected: PASS.

- [ ] **Step 5: Commit repositories**

```bash
git add apps/server/src/repositories
git commit -m "feat: add persistence repositories"
```

---

### Task 5: Runtime Adapter and Mock Execution

**Files:**
- Create: `apps/server/src/runtime/adapter.ts`
- Create: `apps/server/src/runtime/mock-adapter.ts`

- [ ] **Step 1: Define adapter interface**

Create `apps/server/src/runtime/adapter.ts`:

```ts
import type { Agent, ArtifactType, StageTask } from "@agent-army/shared";

export interface RuntimeContext {
  projectGoal: string;
  previousArtifacts: { type: ArtifactType; title: string; content: string }[];
}

export interface RuntimeArtifactDraft {
  type: ArtifactType;
  title: string;
  content: string;
  filePath?: string;
}

export interface RuntimeResult {
  summary: string;
  logs: string;
  artifacts: RuntimeArtifactDraft[];
}

export interface RuntimeAdapter {
  runTask(agent: Agent, task: StageTask, context: RuntimeContext): Promise<RuntimeResult>;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}
```

- [ ] **Step 2: Implement mock adapter**

Create `apps/server/src/runtime/mock-adapter.ts`:

```ts
import type { Agent, ArtifactType, StageTask } from "@agent-army/shared";
import type { RuntimeAdapter, RuntimeContext, RuntimeResult } from "./adapter";

function artifactForStage(stage: string): { type: ArtifactType; title: string; content: string }[] {
  switch (stage) {
    case "planning":
      return [{ type: "project_plan", title: "项目计划", content: "范围：创建 Web 全栈小应用。阶段：PRD、研发、测试、审查。" }];
    case "prd":
      return [
        { type: "prd", title: "PRD", content: "目标用户、核心功能、页面清单、验收标准。" },
        { type: "wireframe", title: "页面线框图", content: "首页：顶部标题、任务输入、列表区域、操作按钮。" }
      ];
    case "ui_optional":
      return [{ type: "ui_spec", title: "UI/UX 方案", content: "视觉方向：清爽工作台。组件：按钮、表单、卡片、状态标签。" }];
    case "developing":
      return [
        { type: "tech_design", title: "技术方案", content: "React/Vite 前端，Express API，SQLite 数据存储。" },
        { type: "source_code", title: "代码产物", content: "代码将在后续真实代码执行器中生成。", filePath: "generated/mock-app" }
      ];
    case "testing":
      return [
        { type: "test_cases", title: "测试用例", content: "验证页面加载、创建数据、接口返回、错误提示。" },
        { type: "test_report", title: "测试报告", content: "Mock 测试通过。真实执行器接入后替换为实际测试结果。" }
      ];
    case "reviewing":
      return [{ type: "delivery_summary", title: "交付总结", content: "产物完整，Mock 流程已交付。真实代码生成将在后续计划中实现。" }];
    default:
      return [];
  }
}

export class MockRuntimeAdapter implements RuntimeAdapter {
  async runTask(agent: Agent, task: StageTask, context: RuntimeContext): Promise<RuntimeResult> {
    const artifacts = artifactForStage(task.stage);
    return {
      summary: `${agent.name} 完成 ${task.stage} 阶段。`,
      logs: [
        `Agent: ${agent.name}`,
        `Stage: ${task.stage}`,
        `Goal: ${context.projectGoal}`,
        `Previous artifacts: ${context.previousArtifacts.length}`,
        "Mock runtime completed successfully."
      ].join("\n"),
      artifacts
    };
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: "Mock runtime ready" };
  }
}
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck -w apps/server
```

Expected: PASS.

- [ ] **Step 4: Commit runtime adapter**

```bash
git add apps/server/src/runtime
git commit -m "feat: add mock runtime adapter"
```

---

### Task 6: Project and Approval Services

**Files:**
- Create: `apps/server/src/services/project-service.ts`
- Create: `apps/server/src/services/approval-service.ts`
- Create: `apps/server/tests/project-flow.test.ts`

- [ ] **Step 1: Write failing flow test**

Create `apps/server/tests/project-flow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createTestDatabase } from "../src/test/test-db";
import { ProjectService } from "../src/services/project-service";
import { ApprovalService } from "../src/services/approval-service";

describe("project flow", () => {
  it("creates a project and reaches waiting_plan", async () => {
    const db = createTestDatabase();
    const service = new ProjectService(db);

    const snapshot = await service.createProject({
      title: "Todo app",
      goal: "做一个待办清单 Web 应用",
      uiStageEnabled: false
    });

    expect(snapshot.project.status).toBe("waiting_plan");
    expect(snapshot.stageTasks).toHaveLength(1);
    expect(snapshot.artifacts.map((item) => item.type)).toContain("project_plan");
    expect(snapshot.approvals).toHaveLength(1);
    expect(snapshot.approvals[0].status).toBe("pending");
  });

  it("approves plan and reaches waiting_prd", async () => {
    const db = createTestDatabase();
    const projectService = new ProjectService(db);
    const approvalService = new ApprovalService(db, projectService);

    let snapshot = await projectService.createProject({
      title: "Todo app",
      goal: "做一个待办清单 Web 应用",
      uiStageEnabled: false
    });

    snapshot = await approvalService.decide(snapshot.approvals[0].id, "approved", "计划通过");

    expect(snapshot.project.status).toBe("waiting_prd");
    expect(snapshot.artifacts.map((item) => item.type)).toContain("prd");
    expect(snapshot.artifacts.map((item) => item.type)).toContain("wireframe");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test -w apps/server -- tests/project-flow.test.ts
```

Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement project service**

Create `apps/server/src/services/project-service.ts`:

```ts
import type { Approval, Artifact, Project, ProjectStatus, StageTask } from "@agent-army/shared";
import type { AppDatabase } from "../db/connection";
import { stageDefinitions } from "../domain/constants";
import { nextStatusAfterStageSuccess } from "../domain/workflow";
import { AgentsRepository } from "../repositories/agents";
import { ApprovalsRepository } from "../repositories/approvals";
import { ArtifactsRepository } from "../repositories/artifacts";
import { ProjectsRepository } from "../repositories/projects";
import { RunsRepository } from "../repositories/runs";
import { StageTasksRepository } from "../repositories/stage-tasks";
import { MockRuntimeAdapter } from "../runtime/mock-adapter";

export interface ProjectSnapshot {
  project: Project;
  stageTasks: StageTask[];
  artifacts: Artifact[];
  approvals: Approval[];
}

export class ProjectService {
  private readonly projects: ProjectsRepository;
  private readonly agents: AgentsRepository;
  private readonly tasks: StageTasksRepository;
  private readonly runs: RunsRepository;
  private readonly artifacts: ArtifactsRepository;
  private readonly approvals: ApprovalsRepository;
  private readonly runtime = new MockRuntimeAdapter();

  constructor(private readonly db: AppDatabase) {
    this.projects = new ProjectsRepository(db);
    this.agents = new AgentsRepository(db);
    this.tasks = new StageTasksRepository(db);
    this.runs = new RunsRepository(db);
    this.artifacts = new ArtifactsRepository(db);
    this.approvals = new ApprovalsRepository(db);
  }

  async createProject(input: { title: string; goal: string; uiStageEnabled: boolean }): Promise<ProjectSnapshot> {
    const project = this.projects.create(input);
    this.projects.updateStatus(project.id, "planning");
    await this.runCurrentStage(project.id);
    return this.snapshot(project.id);
  }

  async runCurrentStage(projectId: string): Promise<ProjectSnapshot> {
    const project = this.projects.find(projectId);
    const definition = stageDefinitions.find((item) => item.status === project.status);
    if (!definition) return this.snapshot(projectId);

    const agent = this.agents.findByRole(definition.agentRole);
    const task = this.tasks.create({
      projectId,
      stage: definition.status,
      assignedAgentId: agent.id,
      input: project.goal
    });
    this.tasks.updateStatus(task.id, "running");

    const run = this.runs.create({
      projectId,
      stageTaskId: task.id,
      agentId: agent.id,
      runtimeType: agent.runtimeType,
      prompt: task.input
    });

    const result = await this.runtime.runTask(agent, task, {
      projectGoal: project.goal,
      previousArtifacts: this.artifacts.listByProject(projectId)
    });

    const finishedRun = this.runs.finish(run.id, "succeeded", result.logs);
    const createdArtifacts = result.artifacts.map((artifact) =>
      this.artifacts.create({
        projectId,
        stageTaskId: task.id,
        agentRunId: finishedRun.id,
        type: artifact.type,
        title: artifact.title,
        content: artifact.content,
        filePath: artifact.filePath
      })
    );
    this.tasks.updateStatus(task.id, definition.needsApprovalAfter ? "waiting_approval" : "succeeded", result.summary);

    const next = nextStatusAfterStageSuccess(project.status, project.uiStageEnabled);
    this.projects.updateStatus(projectId, next);

    if (definition.needsApprovalAfter) {
      this.approvals.create({
        projectId,
        stageTaskId: task.id,
        question: `是否确认 ${definition.status} 阶段产物并继续？`,
        artifactIds: createdArtifacts.map((item) => item.id)
      });
    }

    return this.snapshot(projectId);
  }

  snapshot(projectId: string): ProjectSnapshot {
    return {
      project: this.projects.find(projectId),
      stageTasks: this.tasks.listByProject(projectId),
      artifacts: this.artifacts.listByProject(projectId),
      approvals: this.approvals.listByProject(projectId)
    };
  }

  listProjects(): Project[] {
    return this.projects.list();
  }
}
```

- [ ] **Step 4: Implement approval service**

Create `apps/server/src/services/approval-service.ts`:

```ts
import type { ProjectSnapshot } from "./project-service";
import type { AppDatabase } from "../db/connection";
import { nextStatusAfterApproval, rejectionTarget } from "../domain/workflow";
import { ApprovalsRepository } from "../repositories/approvals";
import { ProjectsRepository } from "../repositories/projects";
import { ProjectService } from "./project-service";

export class ApprovalService {
  private readonly approvals: ApprovalsRepository;
  private readonly projects: ProjectsRepository;

  constructor(db: AppDatabase, private readonly projectService: ProjectService) {
    this.approvals = new ApprovalsRepository(db);
    this.projects = new ProjectsRepository(db);
  }

  async decide(approvalId: string, decision: "approved" | "rejected", comment: string): Promise<ProjectSnapshot> {
    const approval = this.approvals.decide(approvalId, decision, comment);
    const project = this.projects.find(approval.projectId);
    if (decision === "rejected") {
      const target = rejectionTarget(project.status);
      this.projects.updateStatus(project.id, target);
      return this.projectService.snapshot(project.id);
    }

    const next = nextStatusAfterApproval(project.status, project.uiStageEnabled);
    this.projects.updateStatus(project.id, next);
    return this.projectService.runCurrentStage(project.id);
  }
}
```

- [ ] **Step 5: Run flow tests**

Run:

```bash
npm run test -w apps/server -- tests/project-flow.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit services**

```bash
git add apps/server/src/services apps/server/tests/project-flow.test.ts
git commit -m "feat: add project workflow services"
```

---

### Task 7: Express API

**Files:**
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/server.ts`
- Create: `apps/server/src/routes/agents.ts`
- Create: `apps/server/src/routes/projects.ts`

- [ ] **Step 1: Add agents route**

Create `apps/server/src/routes/agents.ts`:

```ts
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
```

- [ ] **Step 2: Add projects route**

Create `apps/server/src/routes/projects.ts`:

```ts
import { Router } from "express";
import type { AppDatabase } from "../db/connection";
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
      const decision = req.body.decision === "rejected" ? "rejected" : "approved";
      const snapshot = await approvalService.decide(req.params.approvalId, decision, String(req.body.comment || ""));
      res.json({ ok: true, snapshot });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
```

- [ ] **Step 3: Create app factory**

Create `apps/server/src/app.ts`:

```ts
import cors from "cors";
import express from "express";
import type { AppDatabase } from "./db/connection";
import { migrate } from "./db/schema";
import { seedDefaultAgents } from "./db/seed";
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
    res.status(500).json({ ok: false, error: message });
  });

  return app;
}
```

- [ ] **Step 4: Create server entry**

Create `apps/server/src/server.ts`:

```ts
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app";
import { openDatabase } from "./db/connection";

const databasePath = process.env.DATABASE_PATH || "data/agent-army.db";
mkdirSync(dirname(databasePath), { recursive: true });

const db = openDatabase(databasePath);
const app = createApp(db);
const port = Number(process.env.PORT || 5050);

app.listen(port, () => {
  console.log(`Agent Army API listening on http://127.0.0.1:${port}`);
});
```

- [ ] **Step 5: Run server typecheck and tests**

Run:

```bash
npm run typecheck -w apps/server
npm run test -w apps/server
```

Expected: both pass.

- [ ] **Step 6: Commit API**

```bash
git add apps/server/src/app.ts apps/server/src/server.ts apps/server/src/routes
git commit -m "feat: expose agent army workflow api"
```

---

### Task 8: Web Workbench Shell

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/api.ts`
- Create: `apps/web/src/styles.css`
- Create: `apps/web/src/components/AgentSidebar.tsx`
- Create: `apps/web/src/components/ProjectBoard.tsx`
- Create: `apps/web/src/components/ArtifactPanel.tsx`

- [ ] **Step 1: Create web package**

Create `apps/web/package.json`:

```json
{
  "name": "@agent-army/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5173",
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@agent-army/shared": "0.0.0",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

Create `apps/web/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Agent 软件开发军团</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Add API client**

Create `apps/web/src/api.ts`:

```ts
import type { Agent, Approval, Artifact, Project, StageTask } from "@agent-army/shared";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5050/api";

export interface ProjectSnapshot {
  project: Project;
  stageTasks: StageTask[];
  artifacts: Artifact[];
  approvals: Approval[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "请求失败");
  return data;
}

export async function fetchAgents(): Promise<Agent[]> {
  const data = await request<{ agents: Agent[] }>("/agents");
  return data.agents;
}

export async function createProject(input: { title: string; goal: string; uiStageEnabled: boolean }): Promise<ProjectSnapshot> {
  const data = await request<{ snapshot: ProjectSnapshot }>("/projects", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return data.snapshot;
}

export async function decideApproval(approvalId: string, decision: "approved" | "rejected", comment: string): Promise<ProjectSnapshot> {
  const data = await request<{ snapshot: ProjectSnapshot }>(`/projects/approvals/${approvalId}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, comment })
  });
  return data.snapshot;
}
```

- [ ] **Step 3: Add components**

Create `apps/web/src/components/AgentSidebar.tsx`:

```tsx
import type { Agent } from "@agent-army/shared";

export function AgentSidebar({ agents }: { agents: Agent[] }) {
  return (
    <aside className="panel agent-sidebar">
      <h2>Agent 团队</h2>
      <div className="agent-list">
        {agents.map((agent) => (
          <div className="agent-row" key={agent.id}>
            <strong>{agent.name}</strong>
            <span>{agent.description}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
```

Create `apps/web/src/components/ProjectBoard.tsx`:

```tsx
import type { Project, StageTask } from "@agent-army/shared";

const stages = ["planning", "prd", "ui_optional", "developing", "testing", "reviewing", "delivered"];

export function ProjectBoard({ project, tasks }: { project: Project | null; tasks: StageTask[] }) {
  return (
    <main className="panel project-board">
      <h2>任务阶段</h2>
      {!project ? (
        <p className="muted">创建一个项目后，这里会显示阶段流转。</p>
      ) : (
        <div className="stage-grid">
          {stages.map((stage) => {
            const task = tasks.find((item) => item.stage === stage);
            const active = project.status === stage || project.currentStage === stage;
            return (
              <section className={`stage-card ${active ? "active" : ""}`} key={stage}>
                <h3>{stage}</h3>
                <p>{task?.outputSummary || "等待执行"}</p>
                <span>{task?.status || "pending"}</span>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
```

Create `apps/web/src/components/ArtifactPanel.tsx`:

```tsx
import type { Approval, Artifact } from "@agent-army/shared";

export function ArtifactPanel({
  artifacts,
  approvals,
  onDecision
}: {
  artifacts: Artifact[];
  approvals: Approval[];
  onDecision: (approvalId: string, decision: "approved" | "rejected") => void;
}) {
  const pending = approvals.find((approval) => approval.status === "pending");

  return (
    <aside className="panel artifact-panel">
      <h2>产物与审批</h2>
      {pending && (
        <div className="approval-card">
          <strong>{pending.question}</strong>
          <div className="actions">
            <button onClick={() => onDecision(pending.id, "approved")}>确认继续</button>
            <button className="secondary" onClick={() => onDecision(pending.id, "rejected")}>打回修改</button>
          </div>
        </div>
      )}
      <div className="artifact-list">
        {artifacts.map((artifact) => (
          <article className="artifact-card" key={artifact.id}>
            <h3>{artifact.title}</h3>
            <small>{artifact.type}</small>
            <p>{artifact.content}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Add app shell**

Create `apps/web/src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { Agent } from "@agent-army/shared";
import { createProject, decideApproval, fetchAgents, type ProjectSnapshot } from "./api";
import { AgentSidebar } from "./components/AgentSidebar";
import { ArtifactPanel } from "./components/ArtifactPanel";
import { ProjectBoard } from "./components/ProjectBoard";
import "./styles.css";

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [goal, setGoal] = useState("做一个待办清单 Web 应用");
  const [uiStageEnabled, setUiStageEnabled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAgents().then(setAgents).catch((err) => setError(err.message));
  }, []);

  async function handleCreateProject() {
    setError("");
    try {
      const next = await createProject({ title: goal.slice(0, 32), goal, uiStageEnabled });
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    }
  }

  async function handleDecision(approvalId: string, decision: "approved" | "rejected") {
    setError("");
    try {
      const next = await decideApproval(approvalId, decision, decision === "approved" ? "通过" : "需要修改");
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "审批失败");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Agent 软件开发军团</h1>
          <p>从一句需求到一个可交付的 Web 全栈小应用。</p>
        </div>
      </header>

      <section className="goal-bar">
        <input value={goal} onChange={(event) => setGoal(event.target.value)} />
        <label>
          <input type="checkbox" checked={uiStageEnabled} onChange={(event) => setUiStageEnabled(event.target.checked)} />
          启用 UI/UX 阶段
        </label>
        <button onClick={handleCreateProject}>创建项目</button>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <div className="workbench">
        <AgentSidebar agents={agents} />
        <ProjectBoard project={snapshot?.project || null} tasks={snapshot?.stageTasks || []} />
        <ArtifactPanel artifacts={snapshot?.artifacts || []} approvals={snapshot?.approvals || []} onDecision={handleDecision} />
      </div>
    </div>
  );
}
```

Create `apps/web/src/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Add styling**

Create `apps/web/src/styles.css`:

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f6f7f9;
  color: #172033;
}

button,
input {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
}

.topbar {
  padding: 24px 32px 14px;
  background: #ffffff;
  border-bottom: 1px solid #dfe3ea;
}

.topbar h1 {
  margin: 0 0 6px;
  font-size: 24px;
}

.topbar p {
  margin: 0;
  color: #687386;
}

.goal-bar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 16px 32px;
  background: #ffffff;
  border-bottom: 1px solid #dfe3ea;
}

.goal-bar input[type="text"],
.goal-bar input:not([type]) {
  width: 100%;
}

input {
  min-height: 40px;
  border: 1px solid #cfd6e2;
  border-radius: 8px;
  padding: 0 12px;
}

button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  padding: 0 14px;
  color: #ffffff;
  background: #2563eb;
  cursor: pointer;
}

button.secondary {
  background: #64748b;
}

.workbench {
  display: grid;
  grid-template-columns: 260px minmax(420px, 1fr) 340px;
  gap: 16px;
  padding: 16px 32px 32px;
}

.panel {
  min-height: 520px;
  background: #ffffff;
  border: 1px solid #dfe3ea;
  border-radius: 8px;
  padding: 16px;
}

.panel h2 {
  margin: 0 0 14px;
  font-size: 16px;
}

.agent-list,
.artifact-list,
.stage-grid {
  display: grid;
  gap: 10px;
}

.agent-row,
.artifact-card,
.stage-card,
.approval-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #fbfcfe;
}

.agent-row span,
.muted,
.artifact-card small,
.stage-card span {
  display: block;
  margin-top: 4px;
  color: #687386;
  font-size: 13px;
}

.stage-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stage-card.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.artifact-card h3,
.stage-card h3 {
  margin: 0 0 6px;
  font-size: 14px;
}

.artifact-card p,
.stage-card p {
  margin: 0;
  color: #334155;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.error-banner {
  margin: 16px 32px 0;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  color: #991b1b;
  background: #fef2f2;
}

@media (max-width: 980px) {
  .goal-bar,
  .workbench {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
npm install
```

Expected: web dependencies install successfully.

- [ ] **Step 7: Typecheck web**

Run:

```bash
npm run typecheck -w apps/web
```

Expected: PASS.

- [ ] **Step 8: Commit web shell**

```bash
git add apps/web package-lock.json
git commit -m "feat: add workbench UI shell"
```

---

### Task 9: Build and Manual Verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add root concurrent dev script**

Install `concurrently`:

```bash
npm install -D concurrently
```

Modify root `package.json` scripts:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev -w apps/server\" \"npm run dev -w apps/web\"",
    "dev:server": "npm run dev -w apps/server",
    "dev:web": "npm run dev -w apps/web",
    "build": "npm run build -ws",
    "test": "npm run test -ws",
    "typecheck": "npm run typecheck -ws"
  }
}
```

- [ ] **Step 2: Run full checks**

Run:

```bash
npm run typecheck
npm run test
npm run build
```

Expected: all commands pass.

- [ ] **Step 3: Start app**

Run:

```bash
npm run dev
```

Expected:

- API logs `Agent Army API listening on http://127.0.0.1:5050`.
- Vite logs a local URL on `http://127.0.0.1:5173`.

- [ ] **Step 4: Manual browser verification**

Open:

```text
http://127.0.0.1:5173
```

Verify:

- Agent sidebar lists PM, product, UI/UX, developer, tester, reviewer.
- Default goal field contains `做一个待办清单 Web 应用`.
- Clicking `创建项目` creates a project and shows `planning` output.
- Right panel shows a pending approval.
- Clicking `确认继续` advances to PRD and creates PRD + wireframe artifacts.
- Rejecting an approval returns the project to the expected previous stage.

- [ ] **Step 5: Commit verification script changes**

```bash
git add package.json package-lock.json
git commit -m "chore: add full-stack dev scripts"
```

---

### Task 10: README Handoff

**Files:**
- Create: `README.md`

- [ ] **Step 1: Add README**

Create `README.md`:

```md
# Agent 软件开发军团

一个用于探索多 Agent 软件开发协作的工作台。第一版聚焦从零创建 Web 全栈小应用，采用严格阶段门和半自动审批流程。

## MVP 范围

- 看板工作台
- 5 个核心 Agent
- 可选 UI/UX 阶段
- Project / StageTask / AgentRun / Artifact / Approval 数据模型
- Mock Runtime Adapter
- React/Vite + Express + SQLite

## 安装

```bash
npm install
```

## 开发启动

```bash
npm run dev
```

默认地址：

- API: `http://127.0.0.1:5050`
- Web: `http://127.0.0.1:5173`

## 检查

```bash
npm run typecheck
npm run test
npm run build
```

## 设计文档

见：

```text
docs/superpowers/specs/2026-05-24-agent-army-mvp-design.md
```
```

- [ ] **Step 2: Commit README**

```bash
git add README.md
git commit -m "docs: add project readme"
```

---

## Self-Review Checklist

- Spec coverage:
  - Software development army: covered by project/workflow/service/UI tasks.
  - Web full-stack target: represented by default tech stack and artifacts.
  - Kanban workbench: covered by web shell task.
  - Strict stage gates: covered by workflow and approval service.
  - 5 core agents and optional UI/UX: covered by seed defaults.
  - Runtime Adapter: covered by adapter and mock adapter.
  - Data model: covered by SQLite schema and repositories.

- Known follow-up gaps:
  - Real model API execution is not implemented in this foundation plan.
  - Real Codex/CLI code generation is not implemented in this foundation plan.
  - Hermes adapter is not implemented in this foundation plan.
  - Generated child app creation is not implemented in this foundation plan.

- Placeholder scan:
  - This plan intentionally uses mock runtime content for foundation verification.
  - No task should contain placeholder markers or unspecified deferred implementation steps.
