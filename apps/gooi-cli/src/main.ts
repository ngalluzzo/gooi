#!/usr/bin/env bun

import { cliCommands } from "./registry";
import { parseArgv } from "./shared/argv";
import type { CliCommand } from "./shared/command";
import type { CliEnvelope } from "./shared/envelope";
import { CliError, toCliError } from "./shared/errors";
import { type CliIo, createProcessIo, readJsonInput } from "./shared/input";
import { writeEnvelope } from "./shared/output";

interface CliRunResult {
	readonly envelope: CliEnvelope;
	readonly exitCode: number;
}

const commandSegments = (id: string): readonly string[] => id.split(" ");

const resolveCommand = (
	positionals: readonly string[],
	commands: readonly CliCommand[],
): {
	readonly command: CliCommand;
	readonly args: readonly string[];
} | null => {
	const sorted = [...commands].sort(
		(left, right) =>
			commandSegments(right.id).length - commandSegments(left.id).length,
	);

	for (const command of sorted) {
		const segments = commandSegments(command.id);
		if (segments.length > positionals.length) {
			continue;
		}
		const matches = segments.every(
			(segment, index) => positionals[index] === segment,
		);
		if (!matches) {
			continue;
		}
		return {
			command,
			args: positionals.slice(segments.length),
		};
	}
	return null;
};

const buildCommandList = (): readonly {
	readonly id: string;
	readonly summary: string;
}[] =>
	cliCommands.map((command) => ({
		id: command.id,
		summary: command.summary,
	}));

const elapsedMs = (startedAt: number, completedAt: number): number =>
	Math.max(0, completedAt - startedAt);

export const runCli = async (input: {
	readonly argv: readonly string[];
	readonly io: CliIo;
}): Promise<CliRunResult> => {
	const parsed = parseArgv(input.argv);
	const helpRequested =
		parsed.options.help === true || parsed.options.h === true;
	const resolved = resolveCommand(parsed.positionals, cliCommands);

	if (helpRequested || resolved === null) {
		const message =
			resolved === null && !helpRequested
				? "Command not found."
				: "Gooi CLI command reference.";
		const startedAt = input.io.nowIso();
		const completedAt = input.io.nowIso();
		const envelope: CliEnvelope =
			resolved === null && !helpRequested
				? {
						ok: false,
						command: parsed.positionals.join(" ") || "help",
						error: {
							code: "usage_error",
							message,
							details: {
								commands: buildCommandList(),
							},
						},
						timings: {
							startedAt,
							completedAt,
							durationMs: 0,
						},
					}
				: {
						ok: true,
						command: "help",
						result: {
							usage:
								"gooi <command> [--input <path>|-] [--output <path>|-] [--format json|pretty]",
							commands: buildCommandList(),
						},
						timings: {
							startedAt,
							completedAt,
							durationMs: 0,
						},
					};
		return {
			envelope,
			exitCode: envelope.ok ? 0 : 2,
		};
	}

	let inputLoaded = false;
	let inputValue: unknown = null;
	const startedAtWall = Date.now();
	const startedAtIso = input.io.nowIso();

	try {
		const result = await resolved.command.run({
			options: parsed.options,
			args: resolved.args,
			nowIso: input.io.nowIso,
			readJsonInput: async () => {
				if (inputLoaded) {
					return inputValue;
				}
				inputValue = await readJsonInput(parsed.options, input.io);
				inputLoaded = true;
				return inputValue;
			},
		});
		const completedAtIso = input.io.nowIso();
		const completedAtWall = Date.now();
		return {
			envelope: {
				ok: true,
				command: resolved.command.id,
				result,
				timings: {
					startedAt: startedAtIso,
					completedAt: completedAtIso,
					durationMs: elapsedMs(startedAtWall, completedAtWall),
				},
			},
			exitCode: 0,
		};
	} catch (error) {
		const cliError = toCliError(error);
		const completedAtIso = input.io.nowIso();
		const completedAtWall = Date.now();
		return {
			envelope: {
				ok: false,
				command: resolved.command.id,
				error: {
					code: cliError.code,
					message: cliError.message,
					...(cliError.details === undefined
						? {}
						: { details: cliError.details }),
				},
				timings: {
					startedAt: startedAtIso,
					completedAt: completedAtIso,
					durationMs: elapsedMs(startedAtWall, completedAtWall),
				},
			},
			exitCode: cliError.exitCode,
		};
	}
};

const main = async () => {
	const io = createProcessIo();
	const runResult = await runCli({
		argv: process.argv.slice(2),
		io,
	});
	await writeEnvelope({
		io,
		options: parseArgv(process.argv.slice(2)).options,
		envelope: runResult.envelope,
	});
	process.exitCode = runResult.exitCode;
};

if (import.meta.main) {
	void main().catch((error) => {
		const cliError = toCliError(
			error instanceof CliError
				? error
				: new CliError({
						code: "internal_error",
						message:
							error instanceof Error
								? error.message
								: "Unexpected CLI failure.",
					}),
		);
		process.stderr.write(
			`${JSON.stringify(
				{
					ok: false,
					error: {
						code: cliError.code,
						message: cliError.message,
					},
				},
				null,
				2,
			)}\n`,
		);
		process.exitCode = cliError.exitCode;
	});
}
