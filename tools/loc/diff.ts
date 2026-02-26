#!/usr/bin/env bun
/**
 * @module diff
 * Compare lines of code between two git refs.
 *
 * Invoked via `bun loc:diff` from the monorepo root.
 * Defaults: base = merge-base of HEAD and main, head = current working tree.
 *
 * @example
 * ```sh
 * bun loc:diff                          # current branch vs main
 * bun loc:diff --base=main --head=dev
 * bun loc:diff --base=HEAD~5
 * bun loc:diff --min-change=50          # hide files with small deltas
 * ```
 *
 * Requires `tokei` to be installed (`brew install tokei`).
 */

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
} from "./helpers";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Bun.argv.slice(2);
const rootDir = getDir(args);
const headRef = getArg(args, "head", ""); // empty = working tree
const baseRef = getArg(args, "base", ""); // empty = auto merge-base
const minChange = parseInt(getArg(args, "min-change", "1"), 10);

// ── Git helpers ───────────────────────────────────────────────────────────────
function git(...cmd: string[]): string {
	const proc = Bun.spawnSync(["git", ...cmd], { cwd: rootDir });
	if (proc.exitCode !== 0) {
		console.error(
			`git ${cmd[0]} failed:`, // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
			new TextDecoder().decode(proc.stderr).trim(),
		);

		process.exit(1);
	}
	return new TextDecoder().decode(proc.stdout).trim();
}

function gitCheckout(ref: string): () => void {
	const current = git("rev-parse", "--abbrev-ref", "HEAD");
	// stash any working tree changes so we can switch cleanly
	const stashed = git(
		"stash",
		"push",
		"--include-untracked",
		"-m",
		"loc-diff-tmp",
	);
	const didStash = !stashed.includes("No local changes");
	git("checkout", ref, "--detach");
	return () => {
		git("checkout", current);
		if (didStash) git("stash", "pop");
	};
}

// ── Resolve refs ──────────────────────────────────────────────────────────────
// Determine the default base: merge-base of HEAD with main/master
function resolveBase(): string {
	for (const branch of ["main", "master"]) {
		const proc = Bun.spawnSync(["git", "merge-base", "HEAD", branch], {
			cwd: rootDir,
		});
		if (proc.exitCode === 0)
			return new TextDecoder().decode(proc.stdout).trim();
	}
	// fallback: parent commit
	return git("rev-parse", "HEAD~1");
}

const resolvedBase = baseRef || resolveBase();
const resolvedHead = headRef || "working tree";

const baseLabel =
	baseRef ||
	`merge-base with ${git("rev-parse", "--abbrev-ref", `${resolvedBase}..HEAD`).split("\n")[0] || "main"}`;
const headLabel = headRef || "working tree";

// ── Collect LOC for a ref ─────────────────────────────────────────────────────
function locForRef(ref: string): Map<string, number> {
	if (ref === "" || ref === "working tree") {
		// just use current working tree
		return buildFileMap(rootDir, runTokei(rootDir));
	}
	const restore = gitCheckout(ref);
	const map = buildFileMap(rootDir, runTokei(rootDir));
	restore();
	return map;
}

// ── Run both sides ────────────────────────────────────────────────────────────
console.log(`\n${DIM}Collecting base (${resolvedBase})...${R}`);
const basemap = locForRef(resolvedBase);

console.log(`${DIM}Collecting head (${resolvedHead})...${R}\n`);
const headMap = locForRef(headRef);

// ── Compute diff ──────────────────────────────────────────────────────────────
interface FileDiff {
	path: string;
	before: number;
	after: number;
	delta: number;
}

const allPaths = new Set([...basemap.keys(), ...headMap.keys()]);
const diffs: FileDiff[] = [];

for (const path of allPaths) {
	const before = basemap.get(path) ?? 0;
	const after = headMap.get(path) ?? 0;
	const delta = after - before;
	if (Math.abs(delta) >= minChange) diffs.push({ path, before, after, delta });
}

diffs.sort((a, b) => b.delta - a.delta);

const added = diffs.filter((d) => d.before === 0);
const removed = diffs.filter((d) => d.after === 0);
const changed = diffs.filter((d) => d.before > 0 && d.after > 0);

// ── Print helpers ─────────────────────────────────────────────────────────────
const totalBefore = [...basemap.values()].reduce((a, b) => a + b, 0);
const totalAfter = [...headMap.values()].reduce((a, b) => a + b, 0);
const totalDelta = totalAfter - totalBefore;

const fmtDelta = (n: number) => {
	const s = (n > 0 ? "+" : "") + n.toLocaleString();
	return (n > 0 ? GRN : n < 0 ? RED : DIM) + s.padStart(8) + R;
};

const fmtLoc = (n: number) => DIM + n.toLocaleString().padStart(8) + R;

const pathW = Math.max(...diffs.map((d) => d.path.length), 10);

function section(title: string, items: FileDiff[], defaultColor: string) {
	if (items.length === 0) return;
	console.log(`${BOLD}${title}${R}`);
	for (const { path, before, after, delta } of items) {
		const bar =
			delta > 0 ? `${GRN}▲${R}` : delta < 0 ? `${RED}▼${R}` : `${DIM}~${R}`;
		const beforeStr = before > 0 ? fmtLoc(before) : " ".repeat(8);
		const afterStr = after > 0 ? fmtLoc(after) : " ".repeat(8);
		console.log(
			`  ${defaultColor}${path.padEnd(pathW)}${R}` +
				`  ${beforeStr} → ${afterStr}` +
				`  ${fmtDelta(delta)}  ${bar}`,
		);
	}
	console.log();
}

// ── Output ────────────────────────────────────────────────────────────────────
console.log(
	`${BOLD}${CYAN}LOC diff${R}  ${DIM}${baseLabel}${R} ${DIM}→${R} ${BOLD}${headLabel}${R}\n`,
);
console.log(
	`  ${"path".padEnd(pathW)}  ${"before".padStart(8)}   ${"after".padStart(8)}    ${"delta".padStart(8)}\n` +
		`${DIM}${"─".repeat(pathW + 40)}${R}`,
);

section("Modified", changed, R);
section("Added", added, GRN);
section("Removed", removed, RED);

// ── Summary ───────────────────────────────────────────────────────────────────
const deltaColor = totalDelta > 0 ? GRN : totalDelta < 0 ? RED : DIM;
console.log(`${DIM}${"─".repeat(pathW + 40)}${R}`);
console.log(
	`  ${BOLD}Total${R}` +
		`  ${fmtLoc(totalBefore)} → ${fmtLoc(totalAfter)}` +
		`  ${deltaColor}${BOLD}${(totalDelta > 0 ? "+" : "") + totalDelta.toLocaleString()} loc${R}` +
		`  ${diffs.length} file${diffs.length === 1 ? "" : "s"} changed`,
);
console.log();
