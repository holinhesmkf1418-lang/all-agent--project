import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RunsRepository } from "../src/repositories/runs";
import { ApprovalService } from "../src/services/approval-service";
import { ProjectService } from "../src/services/project-service";
import { createTestDatabase } from "../src/test/test-db";

describe("real runtime flow", () => {
  let generatedRoot: string;
  let previousDeveloperRuntime: string | undefined;
  let previousGeneratedProjectsDir: string | undefined;
  let previousRealRuntimeVerify: string | undefined;

  function pendingApprovalId(snapshot: Awaited<ReturnType<ProjectService["createProject"]>>): string {
    const approval = snapshot.approvals.find((item) => item.status === "pending");
    if (!approval) throw new Error("Expected pending approval");
    return approval.id;
  }

  beforeEach(() => {
    generatedRoot = mkdtempSync(join(tmpdir(), "agent-army-real-runtime-"));
    previousDeveloperRuntime = process.env.AGENT_DEVELOPER_RUNTIME;
    previousGeneratedProjectsDir = process.env.GENERATED_PROJECTS_DIR;
    previousRealRuntimeVerify = process.env.REAL_RUNTIME_VERIFY;
    process.env.GENERATED_PROJECTS_DIR = generatedRoot;
    process.env.REAL_RUNTIME_VERIFY = "false";
  });

  afterEach(() => {
    if (previousDeveloperRuntime === undefined) {
      delete process.env.AGENT_DEVELOPER_RUNTIME;
    } else {
      process.env.AGENT_DEVELOPER_RUNTIME = previousDeveloperRuntime;
    }
    if (previousGeneratedProjectsDir === undefined) {
      delete process.env.GENERATED_PROJECTS_DIR;
    } else {
      process.env.GENERATED_PROJECTS_DIR = previousGeneratedProjectsDir;
    }
    if (previousRealRuntimeVerify === undefined) {
      delete process.env.REAL_RUNTIME_VERIFY;
    } else {
      process.env.REAL_RUNTIME_VERIFY = previousRealRuntimeVerify;
    }
    rmSync(generatedRoot, { recursive: true, force: true });
  });

  it("uses codex_cli runtime to generate source code during development", async () => {
    process.env.AGENT_DEVELOPER_RUNTIME = "codex_cli";
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

    const sourceArtifact = snapshot.artifacts.find((artifact) => artifact.type === "source_code");
    expect(snapshot.project.status).toBe("waiting_test");
    expect(sourceArtifact?.filePath).toContain(generatedRoot);
    expect(sourceArtifact?.content).toContain("源码已生成到");
  });

  it("blocks the project when a selected runtime has no adapter", async () => {
    process.env.AGENT_DEVELOPER_RUNTIME = "model_api";
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

    const runs = new RunsRepository(db).listByProject(snapshot.project.id);
    expect(snapshot.project.status).toBe("blocked");
    expect(snapshot.stageTasks.at(-1)?.status).toBe("failed");
    expect(runs.at(-1)?.status).toBe("failed");
    expect(runs.at(-1)?.error).toContain("No runtime adapter configured for model_api");
  });
});
