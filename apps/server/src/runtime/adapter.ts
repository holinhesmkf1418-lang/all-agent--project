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
