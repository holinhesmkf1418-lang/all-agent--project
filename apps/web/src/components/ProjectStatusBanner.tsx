import type { ProjectStatus } from "@agent-army/shared";

export function ProjectStatusBanner({ status }: { status: ProjectStatus | null }) {
  if (status !== "blocked") return null;

  return <div className="error-banner">当前项目执行失败，请查看最新阶段产物和运行日志。</div>;
}
