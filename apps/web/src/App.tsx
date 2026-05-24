import type { Agent } from "@agent-army/shared";
import { useEffect, useState } from "react";
import { createProject, decideApproval, fetchAgents, type ProjectSnapshot } from "./api";
import { AgentSidebar } from "./components/AgentSidebar";
import { ArtifactPanel } from "./components/ArtifactPanel";
import { ProjectBoard } from "./components/ProjectBoard";
import { ProjectStatusBanner } from "./components/ProjectStatusBanner";
import "./styles.css";

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [snapshot, setSnapshot] = useState<ProjectSnapshot | null>(null);
  const [goal, setGoal] = useState("做一个待办清单 Web 应用");
  const [uiStageEnabled, setUiStageEnabled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAgents().then(setAgents).catch((err: Error) => setError(err.message));
  }, []);

  async function handleCreateProject() {
    setError("");
    try {
      const next = await createProject({ title: goal.slice(0, 32), goal, uiStageEnabled });
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    }
  }

  async function handleDecision(approvalId: string, decision: "approved" | "rejected") {
    setError("");
    try {
      const next = await decideApproval(approvalId, decision, decision === "approved" ? "通过" : "需要修改");
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "审批失败");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Agent 软件开发军团</h1>
          <p>从一句需求到一个可交付的 Web 全栈小应用。</p>
        </div>
      </header>

      <section className="goal-bar">
        <input value={goal} onChange={(event) => setGoal(event.target.value)} />
        <label>
          <input type="checkbox" checked={uiStageEnabled} onChange={(event) => setUiStageEnabled(event.target.checked)} />
          启用 UI/UX 阶段
        </label>
        <button onClick={handleCreateProject}>创建项目</button>
      </section>

      {error && <div className="error-banner">{error}</div>}
      <ProjectStatusBanner status={snapshot?.project.status || null} />

      <div className="workbench">
        <AgentSidebar agents={agents} />
        <ProjectBoard project={snapshot?.project || null} tasks={snapshot?.stageTasks || []} />
        <ArtifactPanel artifacts={snapshot?.artifacts || []} approvals={snapshot?.approvals || []} onDecision={handleDecision} />
      </div>
    </div>
  );
}
