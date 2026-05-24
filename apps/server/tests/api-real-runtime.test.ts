import { mkdtempSync, rmSync } from "node:fs";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

describe("api real runtime", () => {
  let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
  let baseUrl: string;
  let generatedRoot: string;
  let previousDeveloperRuntime: string | undefined;
  let previousGeneratedProjectsDir: string | undefined;
  let previousRealRuntimeVerify: string | undefined;

  beforeEach(async () => {
    generatedRoot = mkdtempSync(join(tmpdir(), "agent-army-api-real-runtime-"));
    previousDeveloperRuntime = process.env.AGENT_DEVELOPER_RUNTIME;
    previousGeneratedProjectsDir = process.env.GENERATED_PROJECTS_DIR;
    previousRealRuntimeVerify = process.env.REAL_RUNTIME_VERIFY;
    process.env.AGENT_DEVELOPER_RUNTIME = "codex_cli";
    process.env.GENERATED_PROJECTS_DIR = generatedRoot;
    process.env.REAL_RUNTIME_VERIFY = "false";

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
    if (previousDeveloperRuntime === undefined) {
      delete process.env.AGENT_DEVELOPER_RUNTIME;
    } else {
      process.env.AGENT_DEVELOPER_RUNTIME = previousDeveloperRuntime;
    }
    if (previousGeneratedProjectsDir === undefined) {
      delete process.env.GENERATED_PROJECTS_DIR;
    } else {
      process.env.GENERATED_PROJECTS_DIR = previousGeneratedProjectsDir;
    }
    if (previousRealRuntimeVerify === undefined) {
      delete process.env.REAL_RUNTIME_VERIFY;
    } else {
      process.env.REAL_RUNTIME_VERIFY = previousRealRuntimeVerify;
    }
    rmSync(generatedRoot, { recursive: true, force: true });
  });

  it("returns generated source file paths in project snapshots", async () => {
    const created = await requestJson(baseUrl, "/api/projects", {
      method: "POST",
      body: JSON.stringify({ title: "Todo app", goal: "做一个待办清单 Web 应用", uiStageEnabled: false })
    });
    const planApprovalId = created.body.snapshot.approvals[0].id;
    const planApproved = await requestJson(baseUrl, `/api/projects/approvals/${planApprovalId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "approved", comment: "通过" })
    });
    const prdApprovalId = planApproved.body.snapshot.approvals.find((approval: { status: string }) => approval.status === "pending").id;

    const prdApproved = await requestJson(baseUrl, `/api/projects/approvals/${prdApprovalId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision: "approved", comment: "通过" })
    });

    const sourceArtifact = prdApproved.body.snapshot.artifacts.find((artifact: { type: string }) => artifact.type === "source_code");
    expect(prdApproved.body.snapshot.project.status).toBe("waiting_test");
    expect(sourceArtifact.filePath).toContain(generatedRoot);
  });
});
