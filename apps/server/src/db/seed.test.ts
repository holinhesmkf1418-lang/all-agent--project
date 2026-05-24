import { afterEach, describe, expect, it } from "vitest";
import { AgentsRepository } from "../repositories/agents";
import { createTestDatabase } from "../test/test-db";
import { seedDefaultAgents } from "./seed";

describe("seedDefaultAgents", () => {
  afterEach(() => {
    delete process.env.AGENT_DEVELOPER_RUNTIME;
  });

  it("uses AGENT_DEVELOPER_RUNTIME for the developer agent", () => {
    process.env.AGENT_DEVELOPER_RUNTIME = "codex_cli";
    const db = createTestDatabase();

    const developer = new AgentsRepository(db).findByRole("developer");

    expect(developer.runtimeType).toBe("codex_cli");
  });

  it("updates an existing developer agent when AGENT_DEVELOPER_RUNTIME changes", () => {
    process.env.AGENT_DEVELOPER_RUNTIME = "mock";
    const db = createTestDatabase();
    expect(new AgentsRepository(db).findByRole("developer").runtimeType).toBe("mock");

    process.env.AGENT_DEVELOPER_RUNTIME = "codex_cli";
    seedDefaultAgents(db);

    expect(new AgentsRepository(db).findByRole("developer").runtimeType).toBe("codex_cli");
  });
});
