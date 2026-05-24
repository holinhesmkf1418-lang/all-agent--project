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
