import type { Project, StageTask } from "@agent-army/shared";

const stages = ["planning", "prd", "ui_optional", "developing", "testing", "reviewing", "delivered"];

export function ProjectBoard({ project, tasks }: { project: Project | null; tasks: StageTask[] }) {
  return (
    <main className="panel project-board">
      <h2>任务阶段</h2>
      {!project ? (
        <p className="muted">创建一个项目后，这里会显示阶段流转。</p>
      ) : (
        <div className="stage-grid">
          {stages.map((stage) => {
            const task = tasks.find((item) => item.stage === stage);
            const active = project.status === stage || project.currentStage === stage;
            return (
              <section className={`stage-card ${active ? "active" : ""}`} key={stage}>
                <h3>{stage}</h3>
                <p>{task?.outputSummary || "等待执行"}</p>
                <span>{task?.status || "pending"}</span>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
