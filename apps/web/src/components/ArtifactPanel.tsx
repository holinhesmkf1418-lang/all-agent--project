import type { Approval, Artifact } from "@agent-army/shared";

export function ArtifactPanel({
  artifacts,
  approvals,
  onDecision
}: {
  artifacts: Artifact[];
  approvals: Approval[];
  onDecision: (approvalId: string, decision: "approved" | "rejected") => void;
}) {
  const pending = approvals.find((approval) => approval.status === "pending");

  return (
    <aside className="panel artifact-panel">
      <h2>产物与审批</h2>
      {pending && (
        <div className="approval-card">
          <strong>{pending.question}</strong>
          <div className="actions">
            <button onClick={() => onDecision(pending.id, "approved")}>确认继续</button>
            <button className="secondary" onClick={() => onDecision(pending.id, "rejected")}>
              打回修改
            </button>
          </div>
        </div>
      )}
      <div className="artifact-list">
        {artifacts.map((artifact) => (
          <article className="artifact-card" key={artifact.id}>
            <h3>{artifact.title}</h3>
            <small>{artifact.type}</small>
            <p>{artifact.content}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
