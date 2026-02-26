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

import { readFile } from "node:fs/promises";
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

interface LocException {
	readonly path: string;
	readonly maxLoc?: number;
	readonly maxExcess?: number;
	readonly reason?: string;
	readonly expiresAt?: string;
}

interface LocExceptionConfig {
	readonly generatedAt?: string;
	readonly exceptions: readonly LocException[];
}

function normalizePath(input: string): string {
	return input.replaceAll("\\", "/");
}

function wildcardToRegExp(pattern: string): RegExp {
	const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const wildcardPattern = escaped
		.replaceAll("\\*", ".*")
		.replaceAll("\\?", ".");
	return new RegExp(`^${wildcardPattern}$`);
}

function isExpired(expiresAt: string | undefined): boolean {
	if (!expiresAt) {
		return false;
	}
	const parsed = new Date(expiresAt);
	if (Number.isNaN(parsed.getTime())) {
		return false;
	}
	return new Date() > parsed;
}

function matchesException(pattern: string, filePath: string): boolean {
	const normalizedPattern = normalizePath(pattern);
	const normalizedPath = normalizePath(filePath);

	if (!normalizedPattern.includes("*") && !normalizedPattern.includes("?")) {
		return normalizedPattern === normalizedPath;
	}

	return wildcardToRegExp(normalizedPattern).test(normalizedPath);
}

async function readExceptions(
	exceptionsPath: string | undefined,
): Promise<readonly LocException[]> {
	if (!exceptionsPath) {
		return [];
	}
	try {
		const raw = await readFile(exceptionsPath, "utf8");
		const parsed = JSON.parse(raw) as LocExceptionConfig;
		return parsed.exceptions ?? [];
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return [];
		}
		console.error(
			`${RED}${BOLD}Invalid LOC exception file${R}: ${exceptionsPath}`,
		);
		console.error(error);
		process.exit(1);
	}
}

function isExemptedByException(
	violation: LocViolation,
	exceptions: readonly LocException[],
): LocException | null {
	for (const exception of exceptions) {
		if (!matchesException(exception.path, violation.path)) {
			continue;
		}
		if (isExpired(exception.expiresAt)) {
			continue;
		}
		if (
			exception.maxExcess !== undefined &&
			violation.excess <= exception.maxExcess
		) {
			return exception;
		}
		if (exception.maxLoc !== undefined && violation.loc <= exception.maxLoc) {
			return exception;
		}
	}
	return null;
}

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Bun.argv.slice(2);
const rootDir = getDir(args);
const limit = Number.parseInt(getArg(args, "limit", "250"), 10);
const sortBy = getArg(args, "sort", "loc") as "loc" | "excess" | "name";
const exceptionsArg = getArg(
	args,
	"exceptions",
	"docs/engineering/loc-exceptions.json",
);
const exceptionsPath =
	exceptionsArg.length > 0 ? path.resolve(rootDir, exceptionsArg) : undefined;

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

const exceptions = await readExceptions(exceptionsPath);
const regressions = violations;

const severityGroups = regressions.reduce(
	(acc, violation) => {
		const exception = isExemptedByException(violation, exceptions);
		const isCriticalViolation = violation.excess > limit;

		if (isCriticalViolation) {
			if (exception) {
				acc.criticalExceptions.push({ violation, exception });
			} else {
				acc.criticalFindings.push(violation);
			}
		} else {
			// no-op: non-critical findings are still reported but never fail the gate
		}

		return acc;
	},
	{
		criticalFindings: [] as LocViolation[],
		criticalExceptions: [] as {
			violation: LocViolation;
			exception: LocException;
		}[],
	},
);

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

function exceptionAllowanceText(exception: LocException): string {
	if (exception.maxLoc !== undefined) {
		return `${exception.maxLoc} loc`;
	}
	if (exception.maxExcess !== undefined) {
		return `${exception.maxExcess} excess`;
	}
	return "configured";
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
			: `${GRN}${BOLD}✓ ${frozenDebt} violation${frozenDebt === 1 ? "" : "s"} over limit.${R}`,
	);
	console.log();
	process.exit(0);
}

console.log(
	`${BOLD}${RED}Files exceeding ${limit} loc${R}  ${DIM}(${regressions.length} violation${regressions.length === 1 ? "" : "s"}, sorted by ${sortBy})${R}`,
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
console.log(`  ${BOLD}Total excess:${R}    ${totEx} loc across violations`);
console.log();

if (severityGroups.criticalExceptions.length > 0) {
	console.log(
		`${YEL}${BOLD}⚠ Critical findings exempted by exceptions:${R} ${severityGroups.criticalExceptions.length}`,
	);
	for (const { violation, exception } of severityGroups.criticalExceptions) {
		console.log(
			`  ${violation.path} ${DIM}(allowance: ${exceptionAllowanceText(exception)})${R}`,
		);
		if (exception.reason) {
			console.log(`    ${DIM}${exception.reason}${R}`);
		}
	}
	console.log();
}

const hasCritical = severityGroups.criticalFindings.length > 0;
if (hasCritical) {
	console.log(
		`${RED}${BOLD}❗ LOC policy gate failed${R} — critical findings detected (excess > ${limit} loc).`,
	);
	process.exit(1);
}

if (severityGroups.criticalExceptions.length > 0 && !hasCritical) {
	console.log(
		`${YEL}${BOLD}⚠ LOC policy passed with exceptions${R}: all critical findings are exempted.`,
	);
}
