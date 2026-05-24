import type { AppDatabase } from "../db/connection";
import { nextStatusAfterApproval, nextStatusAfterStageSuccess, rejectionTarget } from "../domain/workflow";
import { ApprovalsRepository } from "../repositories/approvals";
import { ProjectsRepository } from "../repositories/projects";
import { StageTasksRepository } from "../repositories/stage-tasks";
import { ProjectService, type ProjectSnapshot } from "./project-service";

export class ApprovalService {
  private readonly approvals: ApprovalsRepository;
  private readonly projects: ProjectsRepository;
  private readonly stageTasks: StageTasksRepository;

  constructor(db: AppDatabase, private readonly projectService: ProjectService) {
    this.approvals = new ApprovalsRepository(db);
    this.projects = new ProjectsRepository(db);
    this.stageTasks = new StageTasksRepository(db);
  }

  async decide(approvalId: string, decision: "approved" | "rejected", comment: string): Promise<ProjectSnapshot> {
    const pendingApproval = this.approvals.find(approvalId);
    if (pendingApproval.status !== "pending") {
      throw new Error(`Approval is not pending: ${pendingApproval.id}`);
    }

    const project = this.projects.find(pendingApproval.projectId);
    const stageTask = this.stageTasks.find(pendingApproval.stageTaskId);
    const expectedProjectStatus = nextStatusAfterStageSuccess(stageTask.stage, project.uiStageEnabled);
    if (project.status !== expectedProjectStatus) {
      throw new Error(`Approval ${pendingApproval.id} does not match project status: ${project.status}`);
    }

    this.approvals.decide(approvalId, decision, comment);

    if (decision === "rejected") {
      this.projects.updateStatus(project.id, rejectionTarget(project.status));
      return this.projectService.snapshot(project.id);
    }

    this.projects.updateStatus(project.id, nextStatusAfterApproval(project.status, project.uiStageEnabled));
    return this.projectService.runUntilNextApprovalOrDelivery(project.id);
  }
}
