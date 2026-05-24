import type { Agent, ArtifactType, StageTask } from "@agent-army/shared";
import type { RuntimeAdapter, RuntimeArtifactDraft, RuntimeContext, RuntimeResult } from "./adapter";

function artifactForStage(stage: string): RuntimeArtifactDraft[] {
  switch (stage) {
    case "planning":
      return [{ type: "project_plan", title: "项目计划", content: "范围：创建 Web 全栈小应用。阶段：PRD、研发、测试、审查。" }];
    case "prd":
      return [
        { type: "prd", title: "PRD", content: "目标用户、核心功能、页面清单、验收标准。" },
        { type: "wireframe", title: "页面线框图", content: "首页：顶部标题、任务输入、列表区域、操作按钮。" }
      ];
    case "ui_optional":
      return [{ type: "ui_spec", title: "UI/UX 方案", content: "视觉方向：清爽工作台。组件：按钮、表单、卡片、状态标签。" }];
    case "developing":
      return [
        { type: "tech_design", title: "技术方案", content: "React/Vite 前端，Express API，SQLite 数据存储。" },
        { type: "source_code", title: "代码产物", content: "代码将在后续真实代码执行器中生成。", filePath: "generated/mock-app" }
      ];
    case "testing":
      return [
        { type: "test_cases", title: "测试用例", content: "验证页面加载、创建数据、接口返回、错误提示。" },
        { type: "test_report", title: "测试报告", content: "Mock 测试通过。真实执行器接入后替换为实际测试结果。" }
      ];
    case "reviewing":
      return [{ type: "delivery_summary", title: "交付总结", content: "产物完整，Mock 流程已交付。真实代码生成将在后续计划中实现。" }];
    default:
      return [];
  }
}

export class MockRuntimeAdapter implements RuntimeAdapter {
  async runTask(agent: Agent, task: StageTask, context: RuntimeContext): Promise<RuntimeResult> {
    const artifacts = artifactForStage(task.stage);
    return {
      summary: `${agent.name} 完成 ${task.stage} 阶段。`,
      logs: [
        `Agent: ${agent.name}`,
        `Stage: ${task.stage}`,
        `Goal: ${context.projectGoal}`,
        `Previous artifacts: ${context.previousArtifacts.length}`,
        "Mock runtime completed successfully."
      ].join("\n"),
      artifacts
    };
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: "Mock runtime ready" };
  }
}
