import type { RuntimeType } from "@agent-army/shared";
import type { RuntimeAdapter } from "./adapter";
import { LocalProjectRuntimeAdapter } from "./local-project-adapter";
import { MockRuntimeAdapter } from "./mock-adapter";

export class RuntimeRegistry {
  private readonly adapters = new Map<RuntimeType, RuntimeAdapter>();

  constructor() {
    this.adapters.set("mock", new MockRuntimeAdapter());
    this.adapters.set("codex_cli", new LocalProjectRuntimeAdapter());
  }

  get(runtimeType: RuntimeType): RuntimeAdapter {
    const adapter = this.adapters.get(runtimeType);
    if (!adapter) throw new Error(`No runtime adapter configured for ${runtimeType}`);
    return adapter;
  }
}
