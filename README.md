# Agent 软件开发军团

一个用于探索多 Agent 软件开发协作的工作台。第一版聚焦从零创建 Web 全栈小应用，采用严格阶段门和半自动审批流程。

## MVP 范围

- 看板工作台
- 5 个核心 Agent
- 可选 UI/UX 阶段
- Project / StageTask / AgentRun / Artifact / Approval 数据模型
- Mock Runtime Adapter
- 可插拔 Runtime Registry
- 研发阶段本地项目生成器
- React/Vite + Express + SQLite

## 安装

```bash
npm install
```

## 开发启动

```bash
npm run dev
```

默认地址：

- API: `http://127.0.0.1:5050`
- Web: `http://127.0.0.1:5173`

## 真实研发运行时

默认流程仍使用 `mock`，方便快速演示。要让研发 Agent 在 `developing` 阶段真实生成一个本地 React/Vite 项目，可以这样启动：

```bash
AGENT_DEVELOPER_RUNTIME=codex_cli \
GENERATED_PROJECTS_DIR=generated-projects \
REAL_RUNTIME_VERIFY=false \
npm run dev
```

说明：

- `AGENT_DEVELOPER_RUNTIME=codex_cli` 会把研发 Agent 切到本地项目运行时。
- `GENERATED_PROJECTS_DIR` 是生成项目根目录，已被 `.gitignore` 忽略。
- `REAL_RUNTIME_VERIFY=true` 时会在生成项目目录内执行 `npm install`、`npm run build`、`npm run test`。
- 当前 `codex_cli` 先接的是确定性的本地生成器，后续可替换为真正的 Codex / Claude / DeepSeek / Hermes 适配器。

## 检查

```bash
npm run typecheck
npm run test
npm run build
```

## 设计文档

见：

```text
docs/superpowers/specs/2026-05-24-agent-army-mvp-design.md
docs/superpowers/specs/2026-05-25-real-agent-runtime-design.md
```
