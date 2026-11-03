import { invoke, type Implementation } from "@gooi/exchange";
import { artifact } from "@gooi/kernel/evidence";

export interface Options {
  /** Program name shown in usage. */
  readonly name?: string;
  readonly out?: (text: string) => void;
  readonly err?: (text: string) => void;
}

/** Expose any named edges as commands. `<edge> --field value` builds a flat
 * record of strings under the edge's input contract; the output value prints
 * as JSON. Returns the process exit code. */
export async function cli(
  edges: Readonly<Record<string, Implementation>>,
  argv: readonly string[],
  options: Options = {},
): Promise<number> {
  const { name = "gooi", out = console.log, err = console.error } = options;
  const usage = `Usage: ${name} <command> [--field value ...]\n\nCommands: ${Object.keys(edges).sort().join(", ")}`;
  const [command, ...rest] = argv;
  if (command === undefined) {
    err(usage);
    return 1;
  }
  if (command === "help" || command === "--help") {
    out(usage);
    return 0;
  }
  const edge = Object.hasOwn(edges, command) ? edges[command] : undefined;
  if (!edge) {
    err(`Unknown command: ${command}\n\n${usage}`);
    return 1;
  }
  try {
    const result = await invoke(edge, artifact(edge.operation.input, flags(rest)));
    out(JSON.stringify(result.artifact.value, null, 2));
    return 0;
  } catch (error) {
    err(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function flags(args: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const match = /^--([a-z][a-z0-9-]*)(?:=(.*))?$/su.exec(args[i]!);
    if (!match) throw new Error(`Unexpected argument: ${args[i]}`);
    const key = match[1]!;
    let value = match[2];
    if (value === undefined && args[i + 1] !== undefined && !args[i + 1]!.startsWith("--"))
      value = args[++i];
    if (value === undefined) throw new Error(`Missing value for --${key}`);
    if (Object.hasOwn(values, key)) throw new Error(`Repeated flag: --${key}`);
    values[key] = value;
  }
  return values;
}
