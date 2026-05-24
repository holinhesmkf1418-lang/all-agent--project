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
