import type { Agent, AgentRole, RuntimeType } from "@agent-army/shared";
import type { AppDatabase } from "../db/connection";

interface AgentRow {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  runtime_type: RuntimeType;
  enabled: number;
}

function mapAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    description: row.description,
    runtimeType: row.runtime_type,
    enabled: Boolean(row.enabled)
  };
}

export class AgentsRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): Agent[] {
    return this.db.prepare("SELECT * FROM agents ORDER BY rowid ASC").all().map((row) => mapAgent(row as AgentRow));
  }

  findByRole(role: AgentRole): Agent {
    const row = this.db.prepare("SELECT * FROM agents WHERE role = ? AND enabled = 1 LIMIT 1").get(role);
    if (!row) throw new Error(`No enabled agent for role: ${role}`);
    return mapAgent(row as AgentRow);
  }
}
