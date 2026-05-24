# Agent 软件开发军团

一个用于探索多 Agent 软件开发协作的工作台。第一版聚焦从零创建 Web 全栈小应用，采用严格阶段门和半自动审批流程。

## MVP 范围

- 看板工作台
- 5 个核心 Agent
- 可选 UI/UX 阶段
- Project / StageTask / AgentRun / Artifact / Approval 数据模型
- Mock Runtime Adapter
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
```
