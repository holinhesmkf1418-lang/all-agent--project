import type { Agent } from "@agent-army/shared";

export function AgentSidebar({ agents }: { agents: Agent[] }) {
  return (
    <aside className="panel agent-sidebar">
      <h2>Agent 团队</h2>
      <div className="agent-list">
        {agents.map((agent) => (
          <div className="agent-row" key={agent.id}>
            <strong>{agent.name}</strong>
            <span>{agent.description}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
