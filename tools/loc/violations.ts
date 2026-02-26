#!/usr/bin/env bun

/**
 * @module violations
 * List files that exceed a lines-of-code threshold.
 *
 * Invoked via `bun loc:check` from the monorepo root.
 * Exits with code 0 when no violations are found.
 *
 * @example
 * ```sh
 * bun loc:check                   # default limit: 250 LOC
 * bun loc:check --limit=300
 * bun loc:check --sort=excess     # sort by amount over the limit
 * bun loc:check --sort=name       # alphabetical
 * ```
 *
 * Requires `tokei` to be installed (`brew install tokei`).
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	BOLD,
	buildFileMap,
	CYAN,
	DIM,
	GRN,
	getArg,
	getDir,
	R,
	RED,
	runTokei,
	YEL,
} from "./helpers";

interface LocViolation {
	readonly path: string;
	readonly loc: number;
	readonly excess: number;
}

interface LocBaseline {
	readonly limit: number;
	readonly generatedAt: string;
	readonly violations: readonly {
		readonly path: string;
		readonly loc: number;
	}[];
}

async function readBaseline(
	baselinePath: string | undefined,
): Promise<LocBaseline | null> {
	if (!baselinePath) {
		return null;
	}
	try {
		const raw = await readFile(baselinePath, "utf8");
		return JSON.parse(raw) as LocBaseline;
	} catch {
		return null;
	}
}

async function writeBaseline(input: {
	baselinePath: string;
	limit: number;
	violations: readonly LocViolation[];
}): Promise<void> {
	const payload: LocBaseline = {
		limit: input.limit,
		generatedAt: new Date().toISOString(),
		violations: input.violations.map((entry) => ({
			path: entry.path,
			loc: entry.loc,
		})),
	};
	await mkdir(path.dirname(input.baselinePath), { recursive: true });
	await writeFile(input.baselinePath, `${JSON.stringify(payload, null, 2)}\n`);
}

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Bun.argv.slice(2);
const rootDir = getDir(args);
const limit = Number.parseInt(getArg(args, "limit", "250"), 10);
const sortBy = getArg(args, "sort", "loc") as "loc" | "excess" | "name";
const baselineArg = getArg(args, "baseline", "");
const shouldWriteBaseline = getArg(args, "write-baseline", "false") === "true";
const baselinePath =
	baselineArg.length > 0 ? path.resolve(rootDir, baselineArg) : undefined;

// ── Build file map ────────────────────────────────────────────────────────────
const fileMap = buildFileMap(rootDir, runTokei(rootDir));

// ── Filter & sort violations ──────────────────────────────────────────────────
const violations = [...fileMap.entries()]
	.filter(([, loc]) => loc > limit)
	.map(([filePath, loc]) => ({ path: filePath, loc, excess: loc - limit }))
	.sort((a, b) => {
		if (sortBy === "name") return a.path.localeCompare(b.path);
		if (sortBy === "excess") return b.excess - a.excess;
		return b.loc - a.loc;
	});

const baseline = await readBaseline(baselinePath);
const baselineByPath = new Map<string, number>(
	(baseline?.violations ?? []).map((entry) => [entry.path, entry.loc]),
);
const regressions = baseline
	? violations.filter((entry) => {
			const baselineLoc = baselineByPath.get(entry.path);
			return baselineLoc === undefined || entry.loc > baselineLoc;
		})
	: violations;

if (shouldWriteBaseline) {
	if (!baselinePath) {
		console.error(
			`${RED}${BOLD}Missing --baseline path${R}; cannot write baseline without a file target.`,
		);
		process.exit(1);
	}
	await writeBaseline({
		baselinePath,
		limit,
		violations,
	});
	console.log(
		`${GRN}${BOLD}Wrote LOC baseline${R} (${violations.length} violation${violations.length === 1 ? "" : "s"}) -> ${baselinePath}`,
	);
	process.exit(0);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function severityColor(excess: number) {
	if (excess > limit) return RED;
	if (excess > limit * 0.5) return YEL;
	return GRN;
}

function severityLabel(excess: number) {
	if (excess > limit) return "critical";
	if (excess > limit * 0.5) return "warning ";
	return "ok+     ";
}

// ── Print ─────────────────────────────────────────────────────────────────────
const locW = 6;
const exW = 6;
const pathW = Math.max(...regressions.map((v) => v.path.length), 10);
const hr = `${DIM}${"─".repeat(pathW + locW + exW + 28)}${R}`;

console.log();

if (regressions.length === 0) {
	const frozenDebt = violations.length;
	console.log(
		frozenDebt === 0
			? `${GRN}${BOLD}✓ No violations${R} — all files are under ${limit} loc`
			: `${GRN}${BOLD}✓ No regressions${R} — ${frozenDebt} baseline violation${frozenDebt === 1 ? "" : "s"} are unchanged.`,
	);
	console.log();
	process.exit(0);
}

console.log(
	`${BOLD}${RED}Files exceeding ${limit} loc (new/regressed)${R}  ${DIM}(${regressions.length} violation${regressions.length === 1 ? "" : "s"}, sorted by ${sortBy})${R}`,
);
console.log(hr);
console.log(
	`  ${BOLD}${"loc".padStart(locW)}  ${"excess".padStart(exW)}  severity  ${CYAN}file${R}`,
);
console.log(hr);

for (const { path, loc, excess } of regressions) {
	const col = severityColor(excess);
	console.log(
		`  ${col}${BOLD}${String(loc).padStart(locW)}${R}` +
			`  ${DIM}+${String(excess).padStart(exW - 1)}${R}` +
			`  ${col}${severityLabel(excess)}${R}` +
			`  ${path}`,
	);
}

console.log(hr);

const avg = Math.round(
	regressions.reduce((s, v) => s + v.loc, 0) / regressions.length,
);
const worst = regressions[0];
const totEx = regressions.reduce((s, v) => s + v.excess, 0);

console.log();
console.log(
	`  ${BOLD}Worst offender:${R}  ${worst?.path} ${RED}(${worst?.loc} loc)${R}`,
);
console.log(`  ${BOLD}Avg loc:${R}         ${avg}`);
console.log(
	`  ${BOLD}Total excess:${R}    ${totEx} loc across new/regressed violations`,
);
console.log();
