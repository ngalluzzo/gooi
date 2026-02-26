/**
 * @module helpers
 * Shared utilities for the LOC (lines-of-code) tracking scripts.
 *
 * Provides ANSI colour constants, terminal formatting helpers, a tokei runner,
 * a file-map builder, and CLI argument parsers used by `tree`, `diff`, and
 * `violations`.
 */

import { relative, resolve } from "node:path";

// ── ANSI ──────────────────────────────────────────────────────────────────────
export const R = "\x1b[0m";
export const BOLD = "\x1b[1m";
export const DIM = "\x1b[2m";
export const CYAN = "\x1b[36m";
export const BLUE = "\x1b[34m";
export const GRN = "\x1b[32m";
export const YEL = "\x1b[33m";
export const RED = "\x1b[31m";

function stripAnsi(input: string): string {
	let output = "";
	let index = 0;

	while (index < input.length) {
		const current = input.charCodeAt(index);
		const next = input[index + 1];
		if (current === 27 && next === "[") {
			index += 2;
			while (index < input.length && input[index] !== "m") {
				index += 1;
			}
			if (index < input.length) {
				index += 1;
			}
			continue;
		}

		output += input[index];
		index += 1;
	}

	return output;
}

/** Strip ANSI codes to get printable length */
export const visLen = (s: string) => stripAnsi(s).length;

/** Pad a string (which may contain ANSI) to a visible width */
export const padEnd = (s: string, w: number) =>
	s + " ".repeat(Math.max(0, w - visLen(s)));

// ── Tokei ─────────────────────────────────────────────────────────────────────
type TokeiOutput = Record<
	string,
	{
		reports: { name: string; stats: { code: number } }[];
	}
>;

/** Run tokei on a directory and return parsed JSON output */
export function runTokei(rootDir: string): TokeiOutput {
	const proc = Bun.spawnSync(
		["tokei", rootDir, "--output", "json", "--sort", "code"],
		{ cwd: rootDir },
	);
	if (proc.exitCode !== 0) {
		console.error("tokei failed:", new TextDecoder().decode(proc.stderr));
		process.exit(1);
	}
	return JSON.parse(new TextDecoder().decode(proc.stdout));
}

/** Build a flat map of relative path → code lines from tokei output */
export function buildFileMap(
	rootDir: string,
	tokeiOut: TokeiOutput,
): Map<string, number> {
	const fileMap = new Map<string, number>();
	for (const lang of Object.values(tokeiOut)) {
		for (const r of lang.reports) {
			const rel = relative(rootDir, resolve(r.name));
			if (rel.startsWith("..")) continue;
			fileMap.set(rel, (fileMap.get(rel) ?? 0) + r.stats.code);
		}
	}
	return fileMap;
}

// ── CLI args ──────────────────────────────────────────────────────────────────
/** Parse a named --flag=value arg, returning a default if absent */
export function getArg(args: string[], flag: string, def: string): string {
	return args.find((a) => a.startsWith(`--${flag}=`))?.split("=")[1] ?? def;
}

/** Get the first non-flag positional arg (the directory) */
export function getDir(args: string[]): string {
	return resolve(args.find((a) => !a.startsWith("--")) ?? ".");
}
