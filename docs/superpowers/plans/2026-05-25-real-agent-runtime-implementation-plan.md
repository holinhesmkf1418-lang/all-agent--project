# Real Agent Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-runtime foundation that can generate a complete local React/Vite project during the developing stage, verify it, and surface the generated project as workflow artifacts.

**Architecture:** Keep the existing workflow and approval engine intact. Replace the hardcoded mock runtime with a runtime registry, then add a `LocalProjectRuntimeAdapter` behind the existing `codex_cli` runtime type. The local adapter writes generated project files under `generated-projects/`, runs fixed verification commands, and returns source/code artifacts.

**Tech Stack:** TypeScript, Express, SQLite, Vitest, Node `fs/path/child_process`, React/Vite generated app template.

---

## File Structure

- Modify `.gitignore`
  - Ignore generated project output directories.
- Modify `apps/server/src/db/seed.ts`
  - Let `AGENT_DEVELOPER_RUNTIME=codex_cli` override the seeded developer runtime.
- Modify `apps/server/src/runtime/adapter.ts`
  - Add project id and runtime options to `RuntimeContext`.
- Create `apps/server/src/runtime/runtime-registry.ts`
  - Select a runtime adapter by `RuntimeType`.
- Create `apps/server/src/runtime/local-project-adapter.ts`
  - Generate and optionally verify a real local project.
- Modify `apps/server/src/services/project-service.ts`
  - Use the registry and mark failed tasks/runs/projects explicitly.
- Modify `apps/server/tests/project-flow.test.ts`
  - Add real-runtime success and failure coverage.
- Modify `apps/server/tests/api.test.ts`
  - Assert generated `filePath` appears through API snapshots.
- Modify `apps/web/src/components/ArtifactPanel.tsx`
  - Show `filePath` for artifacts.
- Modify `apps/web/src/App.tsx`
  - Show blocked project status as an error banner.
- Modify `README.md`
  - Document real-runtime environment variables.

---

### Task 1: Runtime Selection and Git Ignore

**Files:**
- Modify: `.gitignore`
- Modify: `apps/server/src/db/seed.ts`
- Test: `apps/server/src/db/seed.test.ts`

- [ ] **Step 1: Write failing seed test**

Create `apps/server/src/db/seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AgentsRepository } from "../repositories/agents";
import { createTestDatabase } from "../test/test-db";

describe("seedDefaultAgents", () => {
  it("uses AGENT_DEVELOPER_RUNTIME for the developer agent", () => {
    process.env.AGENT_DEVELOPER_RUNTIME = "codex_cli";
    const db = createTestDatabase();

    const developer = new AgentsRepository(db).findByRole("developer");

    expect(developer.runtimeType).toBe("codex_cli");
    delete process.env.AGENT_DEVELOPER_RUNTIME;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w apps/server -- src/db/seed.test.ts
```

Expected: FAIL because `seedDefaultAgents` always seeds developer as `mock`.

- [ ] **Step 3: Implement runtime override and ignores**

Update `.gitignore`:

```gitignore
generated-projects/
apps/server/generated-projects/
```

Update `apps/server/src/db/seed.ts`:

```ts
import type { RuntimeType } from "@agent-army/shared";
import type { AppDatabase } from "./connection";

function developerRuntime(): RuntimeType {
  const value = process.env.AGENT_DEVELOPER_RUNTIME;
  return value === "codex_cli" || value === "model_api" || value === "hermes" ? value : "mock";
}

export function seedDefaultAgents(db: AppDatabase): void {
  const agents = [
    ["agent_pm", "项目经理", "pm", "拆解计划、控制流程、协调返工", "mock"],
    ["agent_product", "产品经理", "product", "输出 PRD、页面清单、页面线框图和验收标准", "mock"],
    ["agent_uiux", "UI/UX 设计师", "uiux", "输出交互说明、视觉方向和组件结构", "mock"],
    ["agent_developer", "研发工程师", "developer", "输出技术方案、前后端实现和启动说明", developerRuntime()],
    ["agent_tester", "测试工程师", "tester", "输出测试用例、执行结果和风险报告", "mock"],
    ["agent_reviewer", "审查官", "reviewer", "进行质量门禁和交付总结", "mock"]
  ] as const;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO agents (id, name, role, description, runtime_type, enabled)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  const tx = db.transaction(() => {
    for (const agent of agents) insert.run(...agent);
  });
  tx();
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run test -w apps/server -- src/db/seed.test.ts
npm run typecheck -w apps/server
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .gitignore apps/server/src/db/seed.ts apps/server/src/db/seed.test.ts
git commit -m "feat: configure developer runtime"
```

---

### Task 2: Local Project Runtime Adapter

**Files:**
- Modify: `apps/server/src/runtime/adapter.ts`
- Create: `apps/server/src/runtime/local-project-adapter.ts`
- Create: `apps/server/src/runtime/local-project-adapter.test.ts`

- [ ] **Step 1: Write failing adapter test**

Create `apps/server/src/runtime/local-project-adapter.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Agent, StageTask } from "@agent-army/shared";
import { afterEach, describe, expect, it } from "vitest";
import { LocalProjectRuntimeAdapter } from "./local-project-adapter";

describe("LocalProjectRuntimeAdapter", () => {
  const root = mkdtempSync(join(tmpdir(), "agent-army-runtime-"));

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("generates a complete project and source_code artifact", async () => {
    const adapter = new LocalProjectRuntimeAdapter({ generatedProjectsDir: root, verify: false });
    const agent: Agent = {
      id: "agent_developer",
      name: "研发工程师",
      role: "developer",
      description: "生成代码",
      runtimeType: "codex_cli",
      enabled: true
    };
    const task: StageTask = {
      id: "stage_1",
      projectId: "project_abc",
      stage: "developing",
      assignedAgentId: agent.id,
      status: "running",
      input: "做一个待办清单 Web 应用",
      outputSummary: "",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z"
    };

    const result = await adapter.runTask(agent, task, {
      projectId: "project_abc",
      projectGoal: "做一个待办清单 Web 应用",
      previousArtifacts: []
    });

    expect(result.artifacts.map((artifact) => artifact.type)).toEqual(expect.arrayContaining(["tech_design", "source_code"]));
    expect(result.artifacts.find((artifact) => artifact.type === "source_code")?.filePath).toContain("project_project_abc");
    expect(result.logs).toContain("Generated files");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w apps/server -- src/runtime/local-project-adapter.test.ts
```

Expected: FAIL because adapter does not exist.

- [ ] **Step 3: Extend runtime context**

Update `apps/server/src/runtime/adapter.ts`:

```ts
import type { Agent, ArtifactType, StageTask } from "@agent-army/shared";

export interface RuntimeContext {
  projectId: string;
  projectGoal: string;
  previousArtifacts: { type: ArtifactType; title: string; content: string; filePath?: string }[];
}
```

Keep existing `RuntimeArtifactDraft`, `RuntimeResult`, and `RuntimeAdapter` exports.

- [ ] **Step 4: Implement adapter**

Create `apps/server/src/runtime/local-project-adapter.ts` with:

```ts
import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { Agent, StageTask } from "@agent-army/shared";
import type { RuntimeAdapter, RuntimeContext, RuntimeResult } from "./adapter";

const execFileAsync = promisify(execFile);

export interface LocalProjectRuntimeOptions {
  generatedProjectsDir?: string;
  verify?: boolean;
}

function safeProjectDir(root: string, projectId: string): string {
  const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return resolve(root, `project_${safeId}`);
}

function writeProjectFiles(projectDir: string, goal: string): string[] {
  const srcDir = resolve(projectDir, "src");
  mkdirSync(srcDir, { recursive: true });
  const files = [
    ["package.json", JSON.stringify({
      name: "generated-agent-project",
      version: "0.0.0",
      private: true,
      type: "module",
      scripts: {
        build: "vite build",
        test: "vitest run --passWithNoTests"
      },
      dependencies: {
        "@vitejs/plugin-react": "^4.3.1",
        vite: "^5.3.0",
        react: "^18.3.1",
        "react-dom": "^18.3.1"
      },
      devDependencies: {
        "@types/react": "^18.3.3",
        "@types/react-dom": "^18.3.0",
        typescript: "^5.5.0",
        vitest: "^1.6.0"
      }
    }, null, 2)],
    ["index.html", "<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"UTF-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" /><title>Generated App</title></head><body><div id=\"root\"></div><script type=\"module\" src=\"/src/main.tsx\"></script></body></html>"],
    ["src/main.tsx", "import React from \"react\";\\nimport { createRoot } from \"react-dom/client\";\\nimport App from \"./App\";\\nimport \"./styles.css\";\\n\\ncreateRoot(document.getElementById(\"root\")!).render(<React.StrictMode><App /></React.StrictMode>);\\n"],
    ["src/App.tsx", `export default function App() {\\n  return (\\n    <main className=\"app\">\\n      <h1>生成项目</h1>\\n      <p>${goal}</p>\\n      <section>\\n        <h2>当前版本</h2>\\n        <p>这是由 Agent 软件开发军团真实执行器生成的最小 Web 应用。</p>\\n      </section>\\n    </main>\\n  );\\n}\\n`],
    ["src/styles.css", "body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif; background: #f6f7f9; color: #172033; } .app { max-width: 760px; margin: 64px auto; padding: 32px; background: #fff; border: 1px solid #dfe3ea; border-radius: 8px; } h1 { margin-top: 0; } p { line-height: 1.7; }"],
    ["README.md", `# Generated Agent Project\\n\\n需求：${goal}\\n\\n## 启动\\n\\n\\\`\\\`\\\`bash\\nnpm install\\nnpm run build\\n\\\`\\\`\\\`\\n`]
  ] as const;
  for (const [file, content] of files) writeFileSync(resolve(projectDir, file), content);
  return files.map(([file]) => file);
}

async function runVerification(projectDir: string): Promise<string> {
  const install = await execFileAsync("npm", ["install"], { cwd: projectDir, timeout: 120000 });
  const build = await execFileAsync("npm", ["run", "build"], { cwd: projectDir, timeout: 120000 });
  const test = await execFileAsync("npm", ["run", "test"], { cwd: projectDir, timeout: 120000 });
  return [install.stdout, install.stderr, build.stdout, build.stderr, test.stdout, test.stderr].filter(Boolean).join("\\n");
}

export class LocalProjectRuntimeAdapter implements RuntimeAdapter {
  private readonly generatedProjectsDir: string;
  private readonly verify: boolean;

  constructor(options: LocalProjectRuntimeOptions = {}) {
    this.generatedProjectsDir = resolve(options.generatedProjectsDir || process.env.GENERATED_PROJECTS_DIR || "generated-projects");
    this.verify = options.verify ?? process.env.REAL_RUNTIME_VERIFY !== "false";
  }

  async runTask(agent: Agent, task: StageTask, context: RuntimeContext): Promise<RuntimeResult> {
    if (task.stage !== "developing") {
      throw new Error(`LocalProjectRuntimeAdapter only supports developing stage, got ${task.stage}`);
    }
    const projectDir = safeProjectDir(this.generatedProjectsDir, context.projectId);
    const files = writeProjectFiles(projectDir, context.projectGoal);
    const verificationLogs = this.verify ? await runVerification(projectDir) : "Verification skipped by configuration.";
    const logs = [`Agent: ${agent.name}`, `Stage: ${task.stage}`, `Generated files: ${files.join(", ")}`, verificationLogs].join("\\n");

    return {
      summary: `${agent.name} 生成并验证了本地项目。`,
      logs,
      artifacts: [
        {
          type: "tech_design",
          title: "真实执行技术方案",
          content: "研发执行器生成 React/Vite 项目，并通过固定 npm 命令验证构建与测试。"
        },
        {
          type: "source_code",
          title: "生成项目源码",
          content: `源码已生成到 ${projectDir}`,
          filePath: projectDir
        }
      ]
    };
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: "Local project runtime ready" };
  }
}
```

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -w apps/server -- src/runtime/local-project-adapter.test.ts
npm run typecheck -w apps/server
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/runtime/adapter.ts apps/server/src/runtime/local-project-adapter.ts apps/server/src/runtime/local-project-adapter.test.ts
git commit -m "feat: add local project runtime adapter"
```

---

### Task 3: Runtime Registry and Service Failure Handling

**Files:**
- Create: `apps/server/src/runtime/runtime-registry.ts`
- Modify: `apps/server/src/services/project-service.ts`
- Test: `apps/server/tests/real-runtime-flow.test.ts`

- [ ] **Step 1: Write failing real-runtime flow test**

Create `apps/server/tests/real-runtime-flow.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApprovalService } from "../src/services/approval-service";
import { ProjectService } from "../src/services/project-service";
import { createTestDatabase } from "../src/test/test-db";

describe("real runtime flow", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agent-army-generated-"));
    process.env.AGENT_DEVELOPER_RUNTIME = "codex_cli";
    process.env.GENERATED_PROJECTS_DIR = root;
    process.env.REAL_RUNTIME_VERIFY = "false";
  });

  afterEach(() => {
    delete process.env.AGENT_DEVELOPER_RUNTIME;
    delete process.env.GENERATED_PROJECTS_DIR;
    delete process.env.REAL_RUNTIME_VERIFY;
    rmSync(root, { recursive: true, force: true });
  });

  function pendingApprovalId(snapshot: Awaited<ReturnType<ProjectService["createProject"]>>): string {
    const approval = snapshot.approvals.find((item) => item.status === "pending");
    if (!approval) throw new Error("Expected pending approval");
    return approval.id;
  }

  it("generates source code during developing stage", async () => {
    const db = createTestDatabase();
    const projectService = new ProjectService(db);
    const approvalService = new ApprovalService(db, projectService);

    let snapshot = await projectService.createProject({
      title: "Todo app",
      goal: "做一个待办清单 Web 应用",
      uiStageEnabled: false
    });
    snapshot = await approvalService.decide(pendingApprovalId(snapshot), "approved", "计划通过");
    snapshot = await approvalService.decide(pendingApprovalId(snapshot), "approved", "PRD 通过");

    const source = snapshot.artifacts.find((artifact) => artifact.type === "source_code");
    expect(snapshot.project.status).toBe("waiting_test");
    expect(source?.filePath).toContain(root);
    expect(source?.content).toContain("源码已生成到");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test -w apps/server -- tests/real-runtime-flow.test.ts
```

Expected: FAIL because ProjectService still always uses MockRuntimeAdapter.

- [ ] **Step 3: Implement runtime registry**

Create `apps/server/src/runtime/runtime-registry.ts`:

```ts
import type { RuntimeType } from "@agent-army/shared";
import type { RuntimeAdapter } from "./adapter";
import { LocalProjectRuntimeAdapter } from "./local-project-adapter";
import { MockRuntimeAdapter } from "./mock-adapter";

export class RuntimeRegistry {
  private readonly mock = new MockRuntimeAdapter();
  private readonly localProject = new LocalProjectRuntimeAdapter();

  get(runtimeType: RuntimeType): RuntimeAdapter {
    if (runtimeType === "codex_cli") return this.localProject;
    return this.mock;
  }
}
```

- [ ] **Step 4: Update ProjectService**

Modify `apps/server/src/services/project-service.ts`:

```ts
import { RuntimeRegistry } from "../runtime/runtime-registry";
```

Replace:

```ts
private readonly runtime = new MockRuntimeAdapter();
```

with:

```ts
private readonly runtimes = new RuntimeRegistry();
```

Inside `runCurrentStage`, replace runtime call with:

```ts
try {
  const result = await this.runtimes.get(agent.runtimeType).runTask(agent, task, {
    projectId,
    projectGoal: project.goal,
    previousArtifacts: this.artifacts.listByProject(projectId)
  });
  // existing success handling remains here
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown runtime error";
  this.runs.finish(run.id, "failed", "", message);
  this.tasks.updateStatus(task.id, "failed", message);
  this.projects.updateStatus(projectId, "blocked");
  return this.snapshot(projectId);
}
```

Keep success handling unchanged except for moving it inside the `try` block.

- [ ] **Step 5: Verify**

Run:

```bash
npm run test -w apps/server -- tests/real-runtime-flow.test.ts
npm run test -w apps/server -- tests/project-flow.test.ts
npm run typecheck -w apps/server
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/runtime/runtime-registry.ts apps/server/src/services/project-service.ts apps/server/tests/real-runtime-flow.test.ts
git commit -m "feat: run developing stage with real runtime"
```

---

### Task 4: UI Artifact Path and Blocked State

**Files:**
- Modify: `apps/web/src/components/ArtifactPanel.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Update artifact panel**

Add `filePath` display inside each artifact card:

```tsx
{artifact.filePath && <code className="artifact-path">{artifact.filePath}</code>}
```

- [ ] **Step 2: Update blocked banner**

In `apps/web/src/App.tsx`, render a blocked warning after the existing error banner:

```tsx
{snapshot?.project.status === "blocked" && <div className="error-banner">当前项目执行失败，请查看最新阶段产物和运行日志。</div>}
```

- [ ] **Step 3: Add CSS**

In `apps/web/src/styles.css`:

```css
.artifact-path {
  display: block;
  margin-top: 8px;
  padding: 8px;
  border-radius: 6px;
  background: #eef2f7;
  color: #334155;
  font-size: 12px;
  overflow-wrap: anywhere;
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run typecheck -w apps/web
npm run build -w apps/web
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ArtifactPanel.tsx apps/web/src/App.tsx apps/web/src/styles.css
git commit -m "feat: show generated project artifacts"
```

---

### Task 5: Documentation and Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document real runtime**

Add to `README.md`:

~~~md
## 真实执行器

默认流程使用 Mock Runtime。要让研发阶段生成真实本地项目：

```bash
AGENT_DEVELOPER_RUNTIME=codex_cli REAL_RUNTIME_VERIFY=false npm run dev
```

生成目录默认是：

```text
generated-projects/
```

如需运行真实 npm 验证：

```bash
AGENT_DEVELOPER_RUNTIME=codex_cli REAL_RUNTIME_VERIFY=true npm run dev
```
~~~

- [ ] **Step 2: Run full checks**

Run:

```bash
npm run typecheck
npm run test
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document real runtime mode"
```

---

## Self-Review Checklist

- Spec coverage:
  - Runtime registry: Task 3.
  - Local real project generation: Task 2.
  - Runtime selection by developer agent runtime: Task 1 and Task 3.
  - Verification commands and logs: Task 2.
  - Failure state: Task 3.
  - UI file path / blocked visibility: Task 4.
  - Docs: Task 5.

- Type consistency:
  - Runtime type uses existing `codex_cli`.
  - `RuntimeContext.projectId` is supplied by ProjectService.
  - Artifact `filePath` already exists in shared type.

- Known follow-up gaps:
  - Codex CLI does not yet drive file generation; this plan creates the execution slot where Codex CLI will be inserted next.
  - Claude / DeepSeek / Hermes adapters remain future RuntimeAdapter implementations.
