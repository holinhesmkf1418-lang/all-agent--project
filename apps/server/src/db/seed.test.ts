import { describe, expect, it } from "vitest";
import { AgentsRepository } from "../repositories/agents";
import { createTestDatabase } from "../test/test-db";

describe("seedDefaultAgents", () => {
  it("uses AGENT_DEVELOPER_RUNTIME for the developer agent", () => {
    process.env.AGENT_DEVELOPER_RUNTIME = "codex_cli";
    const db = createTestDatabase();

    const developer = new AgentsRepository(db).findByRole("developer");

    expect(developer.runtimeType).toBe("codex_cli");
    delete process.env.AGENT_DEVELOPER_RUNTIME;
  });
});
