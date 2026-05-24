import type { RuntimeType } from "@agent-army/shared";
import type { AppDatabase } from "./connection";

function developerRuntime(): RuntimeType {
  const value = process.env.AGENT_DEVELOPER_RUNTIME;
  return value === "codex_cli" || value === "model_api" || value === "hermes" ? value : "mock";
}

export function seedDefaultAgents(db: AppDatabase): void {
  const defaultAgents = [
    ["agent_pm", "项目经理", "pm", "拆解计划、控制流程、协调返工", "mock"],
    ["agent_product", "产品经理", "product", "输出 PRD、页面清单、页面线框图和验收标准", "mock"],
    ["agent_uiux", "UI/UX 设计师", "uiux", "输出交互说明、视觉方向和组件结构", "mock"],
    ["agent_developer", "研发工程师", "developer", "输出技术方案、前后端实现和启动说明", developerRuntime()],
    ["agent_tester", "测试工程师", "tester", "输出测试用例、执行结果和风险报告", "mock"],
    ["agent_reviewer", "审查官", "reviewer", "进行质量门禁和交付总结", "mock"]
  ] as const;

  const insert = db.prepare(`
    INSERT INTO agents (id, name, role, description, runtime_type, enabled)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET runtime_type = excluded.runtime_type
    WHERE excluded.id = 'agent_developer'
  `);
  const tx = db.transaction(() => {
    for (const agent of defaultAgents) insert.run(...agent);
  });
  tx();
}
