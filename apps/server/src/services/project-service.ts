import type { Approval, Artifact, Project, StageTask } from "@agent-army/shared";
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
    return this.runUntilNextApprovalOrDelivery(project.id);
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
      projectId,
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
    this.projects.updateStatus(projectId, nextStatusAfterStageSuccess(project.status, project.uiStageEnabled));

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

  async runUntilNextApprovalOrDelivery(projectId: string): Promise<ProjectSnapshot> {
    for (let step = 0; step < stageDefinitions.length; step += 1) {
      const project = this.projects.find(projectId);
      const definition = stageDefinitions.find((item) => item.status === project.status);
      if (!definition) break;
      await this.runCurrentStage(projectId);
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
