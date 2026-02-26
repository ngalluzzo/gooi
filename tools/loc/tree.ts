#!/usr/bin/env bun
/**
 * @module tree
 * WizTree-style directory tree sorted by lines of code.
 *
 * Invoked via `bun loc:tree` from the monorepo root.
 *
 * @example
 * ```sh
 * bun loc:tree                    # full tree from repo root
 * bun loc:tree --min-loc=100      # hide entries below 100 LOC
 * bun loc:tree --depth=3          # limit tree depth
 * bun loc:tree --no-files         # directories only
 * ```
 *
 * Requires `tokei` to be installed (`brew install tokei`).
 */

import {
	BLUE,
	BOLD,
	buildFileMap,
	CYAN,
	DIM,
	GRN,
	getArg,
	getDir,
	padEnd,
	R,
	RED,
	runTokei,
	visLen,
	YEL,
} from "./helpers";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Bun.argv.slice(2);
const rootDir = getDir(args);
const minLoc = Number.parseInt(getArg(args, "min-loc", "0"), 10);
const maxDepth = Number.parseInt(getArg(args, "depth", "99"), 10);
const showFiles = !args.includes("--no-files");

// ── Build file map ────────────────────────────────────────────────────────────
const fileMap = buildFileMap(rootDir, runTokei(rootDir));

// ── Build directory tree ──────────────────────────────────────────────────────
interface Node {
	name: string;
	loc: number;
	isFile: boolean;
	children: Map<string, Node>;
}

const root: Node = {
	name: rootDir,
	loc: 0,
	isFile: false,
	children: new Map(),
};

for (const [rel, loc] of fileMap) {
	const parts = rel.split("/");
	let cur = root;
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (!part) continue;
		const isFile = i === parts.length - 1;
		if (!cur.children.has(part))
			cur.children.set(part, {
				name: part,
				loc: 0,
				isFile,
				children: new Map(),
			});
		const node = cur.children.get(part);
		if (!node) continue;
		node.loc += loc;
		cur = node;
	}
	root.loc += loc;
}

// ── Formatting ────────────────────────────────────────────────────────────────
function miniBar(loc: number, total: number, width = 14) {
	const filled = Math.round((loc / total) * width);
	const pct = loc / total;
	const col = pct > 0.6 ? RED : pct > 0.3 ? YEL : GRN;
	return col + "█".repeat(filled) + DIM + "░".repeat(width - filled) + R;
}

// ── Two-pass render ───────────────────────────────────────────────────────────
interface Row {
	indent: string;
	label: string;
	loc: number;
}

const rows: Row[] = [];

function collect(node: Node, prefix: string, depth: number) {
	if (depth > maxDepth) return;

	const children = [...node.children.values()]
		.filter((c) => c.loc >= minLoc && (showFiles || !c.isFile))
		.sort((a, b) =>
			a.isFile !== b.isFile ? (a.isFile ? 1 : -1) : b.loc - a.loc,
		);

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (!child) continue;
		const isLast = i === children.length - 1;
		const branch = isLast ? "└── " : "├── ";
		const next = isLast ? "    " : "│   ";
		const label = `${child.isFile ? R : BOLD + BLUE}${child.name}${child.isFile ? "" : "/"}${R}`;
		rows.push({ indent: DIM + prefix + branch + R, label, loc: child.loc });
		if (!child.isFile) collect(child, prefix + next, depth + 1);
	}
}

collect(root, "", 1);

// ── Print ─────────────────────────────────────────────────────────────────────
const nameColWidth = Math.max(
	...rows.map((r) => visLen(r.indent) + visLen(r.label)),
);

console.log();
console.log(
	`${BOLD}${CYAN}${rootDir}${R}  ${BOLD}${root.loc.toLocaleString().padStart(8)} loc${R}`,
);
console.log();

for (const { indent, label, loc } of rows) {
	const pct = ((loc / root.loc) * 100).toFixed(1).padStart(5);
	console.log(
		`${padEnd(indent + label, nameColWidth)}  ${miniBar(loc, root.loc)}  ${BOLD}${loc.toLocaleString().padStart(8)} loc${R}  ${DIM}${pct}%${R}`,
	);
}

console.log();
console.log(`${DIM}${"─".repeat(60)}${R}`);
console.log(
	`${BOLD}Total: ${GRN}${root.loc.toLocaleString()} loc${R}  across ${fileMap.size} files`,
);
console.log();
