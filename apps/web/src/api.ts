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
