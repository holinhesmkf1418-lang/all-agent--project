# Agent 软件开发军团 MVP 设计

日期：2026-05-24

## 1. 产品定位

本项目第一版要做一个“软件开发 Agent 军团工作台”。用户输入一个从零开发 Web 小应用的目标，系统组织多个专业 Agent 分阶段协作，半自动地产出可检查、可运行、可交付的软件结果。

第一版不做通用 Agent 平台，也不做已有项目改造。MVP 聚焦一个明确场景：从一句需求开始，创建一个 Web 全栈小应用。

## 2. MVP 范围

### 2.1 包含

- 从零创建 Web 全栈小应用。
- 默认技术栈：React/Vite + Express + SQLite。
- 看板工作台作为主界面。
- 严格阶段门流程。
- 半自动执行，关键节点由用户确认。
- 5 个核心 Agent：项目经理、产品经理、研发工程师、测试工程师、审查官。
- UI/UX Agent 作为可选阶段。
- 最小可用 Agent 基础设施：项目状态、任务阶段、执行记录、日志、产物、审批、失败/返工。
- Runtime Adapter 最小协议，为后续接入 Hermes、Codex、Claude、DeepSeek、OpenAI 等执行后端预留接口。

### 2.2 不包含

- 不支持已有代码仓库改造；该能力放到 V2。
- 不做通用行业 Agent 模板。
- 不强依赖 Hermes。
- 不做完整 Agent 市场。
- 不做复杂长期记忆系统。
- 不做通用 MCP 市场。
- 不做生产级多租户、权限、计费、云部署。
- 不做复杂登录、支付、企业级权限系统。

## 3. 产品形态

主界面采用看板工作台，而不是纯聊天控制台。

推荐布局：

- 左侧：Agent 列表与状态。
- 中间：项目阶段、任务流转、当前进度。
- 右侧：产物、审批动作、日志摘要。

聊天/目标输入可以保留，但它只是提交需求、补充意见、回复审批的入口。主体验应围绕任务、产物和审批展开。

## 4. Agent 编制

### 4.1 核心 Agent

1. 项目经理 Agent
   - 负责理解用户目标。
   - 拆解阶段计划。
   - 分配角色任务。
   - 推动阶段流转。
   - 协调返工。

2. 产品经理 Agent
   - 负责 PRD。
   - 定义功能范围。
   - 输出页面清单。
   - 输出页面线框图。
   - 定义用户流程和验收标准。

3. 研发工程师 Agent
   - 负责技术方案。
   - 实现前端页面。
   - 实现 Express 后端接口。
   - 实现 SQLite 简单数据存储。
   - 提供启动命令和运行地址。

4. 测试工程师 Agent
   - 负责测试用例。
   - 执行功能验证。
   - 记录缺陷和风险。
   - 输出测试报告。

5. 审查官 Agent
   - 负责最终质量门禁。
   - 检查交付物完整性。
   - 判断是否需要返工。
   - 输出最终交付总结。

### 4.2 可选 Agent

UI/UX 设计师 Agent 作为可选阶段。

启用后负责：

- 交互说明。
- 视觉方向。
- 组件结构。
- 页面风格建议。

产品阶段只输出页面线框图。可点击交互原型、高保真视觉方向和组件风格由 UI/UX 阶段承担。

## 5. 协作流程

第一版采用严格阶段门，不采用 Agent 自由协商模式。

主流程：

```text
用户目标
-> PM 项目计划
-> 用户确认项目计划
-> 产品 PRD + 页面线框图
-> 用户确认 PRD/线框
-> 可选 UI/UX 方案
-> 研发实现
-> 测试验证
-> 用户确认测试结果
-> 审查交付
```

用户确认点有 3 个：

1. 项目计划确认。
2. PRD/页面线框图确认。
3. 测试结果确认。

## 6. 标准交付物

每个项目应至少沉淀以下产物：

- 项目计划。
- PRD。
- 页面清单。
- 页面线框图。
- 验收标准。
- 可选 UI/UX 方案。
- 技术方案。
- 前端代码。
- 后端接口。
- SQLite 数据存储。
- 启动命令。
- 运行地址。
- 测试用例。
- 测试报告。
- 缺陷/风险清单。
- 最终交付总结。

## 7. 项目状态机

第一版采用“项目阶段状态 + AgentRun 记录”的设计。项目只保存大阶段，具体执行过程记录到 AgentRun 和 Artifact。

Project 主状态：

```text
created
planning
waiting_plan
prd
waiting_prd
ui_optional
developing
testing
waiting_test
reviewing
delivered
blocked
```

StageTask 状态：

```text
pending
running
waiting_approval
succeeded
failed
blocked
cancelled
```

Project 状态用于驱动工作台主流程；StageTask 状态用于表达单个阶段任务的执行结果；AgentRun 状态用于记录一次具体执行尝试。三者不要混用。

典型返工路径：

- PRD 被打回：`waiting_prd -> prd`。
- 测试失败：`waiting_test -> developing -> testing`。
- 审查不通过：`reviewing -> developing` 或 `reviewing -> prd`，由审查意见决定返工阶段。

## 8. 核心数据模型

第一版使用 6 个核心实体。

### 8.1 Project

表示一个软件开发项目。

关键字段：

- `id`
- `title`
- `goal`
- `status`
- `tech_stack`
- `ui_stage_enabled`
- `current_stage`
- `created_at`
- `updated_at`

### 8.2 Agent

表示一个可配置的 Agent 角色。

关键字段：

- `id`
- `name`
- `role`
- `description`
- `runtime_type`
- `model_config`
- `enabled`

### 8.3 StageTask

表示项目中的一个阶段任务。

关键字段：

- `id`
- `project_id`
- `stage`
- `assigned_agent_id`
- `status`
- `input`
- `output_summary`
- `created_at`
- `updated_at`

### 8.4 AgentRun

表示一次 Agent 执行尝试。

关键字段：

- `id`
- `project_id`
- `stage_task_id`
- `agent_id`
- `runtime_type`
- `prompt`
- `status`
- `logs`
- `error`
- `started_at`
- `finished_at`
- `cost_metadata`

### 8.5 Artifact

表示一个项目产物。

关键字段：

- `id`
- `project_id`
- `stage_task_id`
- `agent_run_id`
- `type`
- `title`
- `content`
- `file_path`
- `metadata`
- `created_at`

典型类型：

- `project_plan`
- `prd`
- `wireframe`
- `ui_spec`
- `tech_design`
- `source_code`
- `test_cases`
- `test_report`
- `delivery_summary`

### 8.6 Approval

表示用户确认点。

关键字段：

- `id`
- `project_id`
- `stage_task_id`
- `status`
- `question`
- `artifact_ids`
- `decision`
- `comment`
- `created_at`
- `decided_at`

状态：

- `pending`
- `approved`
- `rejected`

## 9. Runtime Adapter

第一版不强依赖 Hermes，但定义最小 Runtime Adapter 协议。所有执行后端通过同一协议接入。

最小接口：

```text
runTask(agent, task, context)
streamLogs(runId)
getResult(runId)
cancel(runId)
collectArtifacts(runId)
healthCheck(config)
```

第一版建议执行组合：

- 项目经理、产品经理、UI/UX、审查官：Model API Adapter。
- 研发工程师、测试工程师：Codex/CLI Adapter 或本地代码执行器。

后续 Hermes 接入时，实现同一协议：

```text
HermesAdapter.runTask(...)
HermesAdapter.streamLogs(...)
HermesAdapter.collectArtifacts(...)
```

Hermes 可在后续提供：

- profile 隔离。
- Kanban 任务派发。
- MCP 工具连接。
- skills 管理。
- 记忆与长期上下文。

## 10. Hermes 策略

Hermes 的定位是可选 Runtime，不是第一版核心依赖。

第一版自己实现最低必要基础设施：

- 项目状态。
- Agent 配置。
- 执行记录。
- 日志。
- 产物。
- 审批。
- 失败与返工。

后续通过 Adapter 接入 Hermes，把 Hermes 的 profile、Kanban、MCP、skills 等能力映射到本系统的 Project、StageTask、AgentRun、Artifact。

## 11. 错误处理与返工

第一版错误处理原则：

- Agent 执行失败时，记录 AgentRun 的错误和日志。
- 当前 StageTask 进入 `failed` 或 `blocked` 状态。
- 用户可以重试当前阶段，或修改输入后重跑。
- 测试失败不直接终止项目，而是进入研发返工。
- 审查失败可以打回研发阶段或产品阶段。
- 所有打回都必须保留原因和关联产物。

## 12. 测试与验收

第一版系统自身至少需要验证：

- 创建项目后能进入 PM 计划阶段。
- PM 计划完成后生成 Approval。
- 用户批准计划后进入 PRD 阶段。
- PRD 阶段能产生 PRD 和 wireframe 产物。
- 用户批准 PRD 后进入研发阶段。
- 研发阶段能产生代码路径、启动命令和运行地址。
- 测试阶段能产生测试用例和测试报告。
- 测试结果确认后进入审查阶段。
- 审查通过后项目进入 delivered。
- 测试失败或审批打回时，项目能进入正确返工路径。

## 13. 后续路线

V2 可扩展：

- 支持已有代码仓库改需求。
- 增加 Hermes Runtime Adapter。
- 增加 Claude/Codex/DeepSeek/OpenAI 多 runtime 配置。
- 支持更完整的 UI/UX 交互原型阶段。
- 支持更细粒度的前端/后端 Agent 拆分。
- 支持项目模板和团队模板。
- 支持长期记忆与知识库。
