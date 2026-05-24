import type { Artifact } from "@agent-army/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArtifactPanel } from "./ArtifactPanel";

describe("ArtifactPanel", () => {
  it("renders artifact file paths", () => {
    const artifact: Artifact = {
      id: "artifact_1",
      projectId: "project_1",
      stageTaskId: "stage_1",
      agentRunId: "run_1",
      type: "source_code",
      title: "生成项目源码",
      content: "源码已生成",
      filePath: "/tmp/generated-projects/project_1",
      createdAt: "2026-05-25T00:00:00.000Z"
    };

    const html = renderToStaticMarkup(<ArtifactPanel artifacts={[artifact]} approvals={[]} onDecision={() => undefined} />);

    expect(html).toContain("/tmp/generated-projects/project_1");
  });
});
