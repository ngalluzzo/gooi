import { userInfo } from "node:os";
import { join } from "node:path";
import type { Model } from "@gooi/agent";
import { claude } from "@gooi/claude";
import { jsonl } from "@gooi/jsonl";
import type { Log } from "@gooi/log";
import { jsonlLog } from "@gooi/log/jsonl";
import { sqliteLog } from "@gooi/log/sqlite";
import { openaiCompatible } from "@gooi/openai";
import { sqlite } from "@gooi/sqlite";

// What every host wires the same way. Apps never see any of it.

type Env = Readonly<Record<string, string | undefined>>;

/** One of `options`, named by an environment variable, or `fallback` when it's unset. */
export function choose<T>(variable: string, options: Readonly<Record<string, T>>, fallback: string, env: Env = process.env): T {
  const name = env[variable] ?? fallback;
  if (!Object.hasOwn(options, name))
    throw new Error(`${variable} must be one of ${Object.keys(options).join(", ")}; got "${name}"`);
  return options[name]!;
}

/** The agent backings, by name. Keys are read from the environment (.env) when a turn starts. */
export function models(env: Env = process.env): Record<string, () => Model> {
  return {
    claude: () => claude({ apiKey: () => env.CLAUDE_API_KEY }),
    omlx: () =>
      openaiCompatible({
        baseURL: env.OMLX_BASE_URL ?? "http://127.0.0.1:8000/v1",
        apiKey: () => env.OMLX_API_KEY,
        model: env.OMLX_MODEL ?? "Qwen3.8-27B-Q8_0",
      }),
  };
}

/** A host's logs, each by name, under one directory: GOOI_STORE picks JSONL files or SQLite. */
export function logs(directory: string, env: Env = process.env): (name: string) => Log {
  return choose("GOOI_STORE", {
    jsonl: (name: string) => jsonlLog(jsonl(join(directory, name))),
    sqlite: (name: string) => sqliteLog(sqlite(join(directory, `${name}.sqlite`))),
  }, "jsonl", env);
}

/** The local user's name, in the characters a Matrix user ID allows. */
export function localUser(): string {
  return userInfo().username.toLowerCase().replace(/[^a-z0-9._=\-/+]/gu, "_");
}
