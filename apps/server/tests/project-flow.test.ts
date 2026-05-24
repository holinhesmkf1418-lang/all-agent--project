import { describe, expect, it } from "vitest";
import { ApprovalService } from "../src/services/approval-service";
import { ProjectService } from "../src/services/project-service";
import { createTestDatabase } from "../src/test/test-db";

describe("project flow", () => {
  function pendingApprovalId(snapshot: Awaited<ReturnType<ProjectService["createProject"]>>): string {
    const approval = snapshot.approvals.find((item) => item.status === "pending");
    if (!approval) throw new Error("Expected pending approval");
    return approval.id;
  }

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

    snapshot = await approvalService.decide(pendingApprovalId(snapshot), "approved", "计划通过");

    expect(snapshot.project.status).toBe("waiting_prd");
    expect(snapshot.artifacts.map((item) => item.type)).toContain("prd");
    expect(snapshot.artifacts.map((item) => item.type)).toContain("wireframe");
  });

  it("approves PRD and automatically reaches waiting_test", async () => {
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

    expect(snapshot.project.status).toBe("waiting_test");
    expect(snapshot.stageTasks.map((item) => item.stage)).toEqual(["planning", "prd", "developing", "testing"]);
    expect(snapshot.artifacts.map((item) => item.type)).toEqual(
      expect.arrayContaining(["tech_design", "source_code", "test_cases", "test_report"])
    );
    expect(snapshot.approvals.filter((item) => item.status === "pending")).toHaveLength(1);
  });

  it("runs optional UI stage before development when enabled", async () => {
    const db = createTestDatabase();
    const projectService = new ProjectService(db);
    const approvalService = new ApprovalService(db, projectService);

    let snapshot = await projectService.createProject({
      title: "Todo app",
      goal: "做一个待办清单 Web 应用",
      uiStageEnabled: true
    });

    snapshot = await approvalService.decide(pendingApprovalId(snapshot), "approved", "计划通过");
    snapshot = await approvalService.decide(pendingApprovalId(snapshot), "approved", "PRD 通过");

    expect(snapshot.project.status).toBe("waiting_test");
    expect(snapshot.stageTasks.map((item) => item.stage)).toEqual(["planning", "prd", "ui_optional", "developing", "testing"]);
    expect(snapshot.artifacts.map((item) => item.type)).toContain("ui_spec");
  });

  it("does not allow deciding an approval twice", async () => {
    const db = createTestDatabase();
    const projectService = new ProjectService(db);
    const approvalService = new ApprovalService(db, projectService);

    let snapshot = await projectService.createProject({
      title: "Todo app",
      goal: "做一个待办清单 Web 应用",
      uiStageEnabled: false
    });
    const approvalId = pendingApprovalId(snapshot);

    snapshot = await approvalService.decide(approvalId, "approved", "计划通过");
    const stageTaskCount = snapshot.stageTasks.length;

    await expect(approvalService.decide(approvalId, "approved", "重复确认")).rejects.toThrow("Approval is not pending");

    snapshot = projectService.snapshot(snapshot.project.id);
    expect(snapshot.project.status).toBe("waiting_prd");
    expect(snapshot.stageTasks).toHaveLength(stageTaskCount);
  });

  it("rejects plan and returns to planning without running another stage", async () => {
    const db = createTestDatabase();
    const projectService = new ProjectService(db);
    const approvalService = new ApprovalService(db, projectService);

    let snapshot = await projectService.createProject({
      title: "Todo app",
      goal: "做一个待办清单 Web 应用",
      uiStageEnabled: false
    });
    const stageTaskCount = snapshot.stageTasks.length;

    snapshot = await approvalService.decide(pendingApprovalId(snapshot), "rejected", "计划需要调整");

    expect(snapshot.project.status).toBe("planning");
    expect(snapshot.stageTasks).toHaveLength(stageTaskCount);
    expect(snapshot.approvals[0].status).toBe("rejected");
    expect(snapshot.approvals[0].comment).toBe("计划需要调整");
  });
});
