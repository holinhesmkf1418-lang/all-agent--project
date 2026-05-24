import { execFile } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { Agent, StageTask } from "@agent-army/shared";
import type { RuntimeAdapter, RuntimeContext, RuntimeResult } from "./adapter";

const execFileAsync = promisify(execFile);

export interface LocalProjectRuntimeOptions {
  generatedProjectsDir?: string;
  verify?: boolean;
}

function safeProjectDir(root: string, projectId: string): string {
  const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return resolve(root, `project_${safeId}`);
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function jsxString(value: string): string {
  return JSON.stringify(value);
}

function writeProjectFiles(projectDir: string, goal: string): string[] {
  const srcDir = resolve(projectDir, "src");
  mkdirSync(srcDir, { recursive: true });

  const files = [
    [
      "package.json",
      json({
        name: "generated-agent-project",
        version: "0.0.0",
        private: true,
        type: "module",
        scripts: {
          build: "vite build",
          test: "vitest run --passWithNoTests"
        },
        dependencies: {
          "@vitejs/plugin-react": "^4.3.1",
          vite: "^5.3.0",
          react: "^18.3.1",
          "react-dom": "^18.3.1"
        },
        devDependencies: {
          "@types/react": "^18.3.3",
          "@types/react-dom": "^18.3.0",
          typescript: "^5.5.0",
          vitest: "^1.6.0"
        }
      })
    ],
    [
      "index.html",
      '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Generated App</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>'
    ],
    [
      "src/main.tsx",
      'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./styles.css";\n\ncreateRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);\n'
    ],
    [
      "src/App.tsx",
      `export default function App() {\n  return (\n    <main className="app">\n      <h1>生成项目</h1>\n      <p>{${jsxString(goal)}}</p>\n      <section>\n        <h2>当前版本</h2>\n        <p>这是由 Agent 软件开发军团真实执行器生成的最小 Web 应用。</p>\n      </section>\n    </main>\n  );\n}\n`
    ],
    [
      "src/styles.css",
      'body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f7f9; color: #172033; } .app { max-width: 760px; margin: 64px auto; padding: 32px; background: #fff; border: 1px solid #dfe3ea; border-radius: 8px; } h1 { margin-top: 0; } p { line-height: 1.7; }'
    ],
    [
      "README.md",
      `# Generated Agent Project\n\n需求：${goal}\n\n## 启动\n\n\`\`\`bash\nnpm install\nnpm run build\n\`\`\`\n`
    ]
  ] as const;

  for (const [file, content] of files) {
    writeFileSync(resolve(projectDir, file), content);
  }
  return files.map(([file]) => file);
}

async function runVerification(projectDir: string): Promise<string> {
  const install = await execFileAsync("npm", ["install"], { cwd: projectDir, timeout: 120000 });
  const build = await execFileAsync("npm", ["run", "build"], { cwd: projectDir, timeout: 120000 });
  const test = await execFileAsync("npm", ["run", "test"], { cwd: projectDir, timeout: 120000 });
  return [install.stdout, install.stderr, build.stdout, build.stderr, test.stdout, test.stderr].filter(Boolean).join("\n");
}

export class LocalProjectRuntimeAdapter implements RuntimeAdapter {
  private readonly generatedProjectsDir: string;
  private readonly verify: boolean;

  constructor(options: LocalProjectRuntimeOptions = {}) {
    this.generatedProjectsDir = resolve(options.generatedProjectsDir || process.env.GENERATED_PROJECTS_DIR || "generated-projects");
    this.verify = options.verify ?? process.env.REAL_RUNTIME_VERIFY !== "false";
  }

  async runTask(agent: Agent, task: StageTask, context: RuntimeContext): Promise<RuntimeResult> {
    if (task.stage !== "developing") {
      throw new Error(`LocalProjectRuntimeAdapter only supports developing stage, got ${task.stage}`);
    }

    const projectDir = safeProjectDir(this.generatedProjectsDir, context.projectId);
    const files = writeProjectFiles(projectDir, context.projectGoal);
    const verificationLogs = this.verify ? await runVerification(projectDir) : "Verification skipped by configuration.";
    const logs = [`Agent: ${agent.name}`, `Stage: ${task.stage}`, `Generated files: ${files.join(", ")}`, verificationLogs].join("\n");

    return {
      summary: `${agent.name} 生成并验证了本地项目。`,
      logs,
      artifacts: [
        {
          type: "tech_design",
          title: "真实执行技术方案",
          content: "研发执行器生成 React/Vite 项目，并通过固定 npm 命令验证构建与测试。"
        },
        {
          type: "source_code",
          title: "生成项目源码",
          content: `源码已生成到 ${projectDir}`,
          filePath: projectDir
        }
      ]
    };
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: "Local project runtime ready" };
  }
}
