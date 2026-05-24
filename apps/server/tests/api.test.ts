import { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { createTestDatabase } from "../src/test/test-db";

async function requestJson(baseUrl: string, path: string, init?: RequestInit): Promise<{ status: number; body: any }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  return { status: response.status, body: await response.json() };
}

describe("api", () => {
  let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
  let baseUrl: string;

  beforeEach(async () => {
    const app = createApp(createTestDatabase());
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("returns health and seeded agents", async () => {
    await expect(requestJson(baseUrl, "/api/health")).resolves.toMatchObject({
      status: 200,
      body: { ok: true }
    });

    const agents = await requestJson(baseUrl, "/api/agents");
    expect(agents.status).toBe(200);
    expect(agents.body.ok).toBe(true);
    expect(agents.body.agents.map((agent: { role: string }) => agent.role)).toEqual([
      "pm",
      "product",
      "uiux",
      "developer",
      "tester",
      "reviewer"
    ]);
  });

  it("creates a project and decides an approval", async () => {
    const created = await requestJson(baseUrl, "/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: "Todo app", goal: "做一个待办清单 Web 应用", uiStageEnabled: false })
    });
    expect(created.status).toBe(201);
    expect(created.body.snapshot.project.status).toBe("waiting_plan");

    const approvalId = created.body.snapshot.approvals[0].id;
    const decided = await requestJson(baseUrl, `/api/projects/approvals/${approvalId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "approved", comment: "通过" })
    });

    expect(decided.status).toBe(200);
    expect(decided.body.snapshot.project.status).toBe("waiting_prd");
    expect(decided.body.snapshot.artifacts.map((artifact: { type: string }) => artifact.type)).toContain("wireframe");
  });

  it("rejects invalid approval decisions", async () => {
    const created = await requestJson(baseUrl, "/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: "Todo app", goal: "做一个待办清单 Web 应用", uiStageEnabled: false })
    });
    const approvalId = created.body.snapshot.approvals[0].id;

    const response = await requestJson(baseUrl, `/api/projects/approvals/${approvalId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "approve", comment: "拼错了" })
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ ok: false, error: "invalid decision" });
  });

  it("returns conflict for repeated approval decisions", async () => {
    const created = await requestJson(baseUrl, "/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: "Todo app", goal: "做一个待办清单 Web 应用", uiStageEnabled: false })
    });
    const approvalId = created.body.snapshot.approvals[0].id;

    await requestJson(baseUrl, `/api/projects/approvals/${approvalId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "approved", comment: "通过" })
    });
    const response = await requestJson(baseUrl, `/api/projects/approvals/${approvalId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "approved", comment: "重复通过" })
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain("Approval is not pending");
  });

  it("returns not found for missing projects", async () => {
    const response = await requestJson(baseUrl, "/api/projects/missing");

    expect(response.status).toBe(404);
    expect(response.body.error).toContain("Project not found");
  });

  it("rejects empty project goals", async () => {
    const response = await requestJson(baseUrl, "/api/projects", {
      method: "POST",
      body: JSON.stringify({ goal: "" })
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ ok: false, error: "goal is required" });
  });
});
