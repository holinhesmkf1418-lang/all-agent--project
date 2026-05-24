import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Agent, StageTask } from "@agent-army/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalProjectRuntimeAdapter } from "./local-project-adapter";

describe("LocalProjectRuntimeAdapter", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agent-army-runtime-"));
  });

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

  it("writes arbitrary project goals as safe JSX text", async () => {
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
      projectId: "project_unsafe_goal",
      stage: "developing",
      assignedAgentId: agent.id,
      status: "running",
      input: "生成 <demo>{todo} 应用",
      outputSummary: "",
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z"
    };

    await adapter.runTask(agent, task, {
      projectId: task.projectId,
      projectGoal: "生成 <demo>{todo} 应用",
      previousArtifacts: []
    });

    const appFile = readFileSync(join(root, "project_project_unsafe_goal", "src", "App.tsx"), "utf8");
    expect(appFile).toContain('<p>{"生成 <demo>{todo} 应用"}</p>');
  });
});
