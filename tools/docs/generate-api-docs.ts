#!/usr/bin/env bun

import {
	mkdir,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { basename, join, resolve } from "node:path";

interface Group {
	readonly id: string;
	readonly label: string;
	readonly path: string;
	readonly depth: number;
	readonly position: number;
}

interface PackageMetadata {
	readonly directory: string;
	readonly packageName: string;
	readonly group: Group;
}

const repoRoot = resolve(import.meta.dir, "..", "..");
const apiDocsRoot = join(repoRoot, "apps", "docs", "docs", "api");

// Each group maps to a subdirectory under api/ with its own _category_.json
const groups: readonly Group[] = [
	{
		id: "core",
		label: "Core Contracts",
		path: join(repoRoot, "packages"),
		depth: 1,
		position: 1,
	},
	{
		id: "authoring",
		label: "Authoring",
		path: join(repoRoot, "products", "authoring"),
		depth: 1,
		position: 2,
	},
	{
		id: "runtime",
		label: "Runtime",
		path: join(repoRoot, "products", "runtime"),
		depth: 1,
		position: 3,
	},
	{
		id: "quality",
		label: "Quality",
		path: join(repoRoot, "products", "quality"),
		depth: 1,
		position: 4,
	},
	{
		id: "marketplace",
		label: "Marketplace",
		path: join(repoRoot, "marketplace"),
		depth: 1,
		position: 5,
	},
];

async function pathExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function loadPackageMetadata(
	packageDir: string,
	group: Group,
): Promise<PackageMetadata | null> {
	const typedocConfigPath = join(packageDir, "typedoc.json");
	const packageJsonPath = join(packageDir, "package.json");

	const hasConfig = await pathExists(typedocConfigPath);
	const hasPackage = await pathExists(packageJsonPath);

	if (!hasConfig || !hasPackage) {
		return null;
	}

	const raw = await readFile(packageJsonPath, "utf8");
	const parsed = JSON.parse(raw) as { name?: string };

	return {
		directory: packageDir,
		packageName: parsed.name ?? basename(packageDir),
		group,
	};
}

async function collectDirectories(
	root: string,
	depth: number,
): Promise<string[]> {
	const entries = await readdir(root, { withFileTypes: true });
	const dirs = entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => join(root, entry.name));

	if (depth <= 1) return dirs;

	const nested: string[] = [];
	for (const dir of dirs) {
		const children = await readdir(dir, { withFileTypes: true });
		for (const child of children) {
			if (child.isDirectory()) {
				nested.push(join(dir, child.name));
			}
		}
	}
	return nested;
}

async function resolvePackages(): Promise<readonly PackageMetadata[]> {
	const packages: PackageMetadata[] = [];

	for (const group of groups) {
		const groupExists = await pathExists(group.path);
		if (!groupExists) continue;

		const dirs = await collectDirectories(group.path, group.depth);
		dirs.sort((a, b) => a.localeCompare(b));

		for (const directory of dirs) {
			const metadata = await loadPackageMetadata(directory, group);
			if (metadata !== null) {
				packages.push(metadata);
			}
		}
	}

	return packages;
}

function runTypedoc(packageDir: string, outDir: string): void {
	const result = Bun.spawnSync(
		["bunx", "typedoc", "--options", "typedoc.json", "--out", outDir],
		{
			cwd: packageDir,
			stdout: "inherit",
			stderr: "inherit",
		},
	);

	if (result.exitCode !== 0) {
		throw new Error(`Typedoc failed for package at ${packageDir}`);
	}
}

async function writeCategoryJson(
	groupDir: string,
	group: Group,
): Promise<void> {
	const category = {
		label: group.label,
		position: group.position,
		collapsible: true,
		collapsed: false,
	};
	await writeFile(
		join(groupDir, "_category_.json"),
		JSON.stringify(category, null, "\t"),
	);
}

async function writeApiLanding(
	packages: readonly PackageMetadata[],
): Promise<void> {
	const byGroup = new Map<string, PackageMetadata[]>();
	for (const pkg of packages) {
		const list = byGroup.get(pkg.group.id) ?? [];
		list.push(pkg);
		byGroup.set(pkg.group.id, list);
	}

	const lines = [
		"---",
		"id: index",
		"title: API Reference",
		"---",
		"",
		"API documentation is generated from package-level TypeDoc.",
		"Run `bun run docs:api` from the repo root to regenerate.",
		"",
	];

	for (const group of groups) {
		const pkgs = byGroup.get(group.id);
		if (!pkgs || pkgs.length === 0) continue;

		lines.push(`## ${group.label}`, "");
		for (const pkg of pkgs) {
			const slug = basename(pkg.directory);
			lines.push(`- [${pkg.packageName}](./${group.id}/${slug})`);
		}
		lines.push("");
	}

	await writeFile(join(apiDocsRoot, "index.md"), lines.join("\n"));
}

async function generate(): Promise<void> {
	const packages = await resolvePackages();

	await rm(apiDocsRoot, { recursive: true, force: true });
	await mkdir(apiDocsRoot, { recursive: true });

	// Create group subdirectories with _category_.json
	const usedGroups = new Set(packages.map((p) => p.group.id));
	for (const group of groups) {
		if (!usedGroups.has(group.id)) continue;
		const groupDir = join(apiDocsRoot, group.id);
		await mkdir(groupDir, { recursive: true });
		await writeCategoryJson(groupDir, group);
	}

	// Generate TypeDoc output into group subdirectories
	for (const pkg of packages) {
		const slug = basename(pkg.directory);
		const outDir = join(apiDocsRoot, pkg.group.id, slug);
		await mkdir(outDir, { recursive: true });
		runTypedoc(pkg.directory, outDir);
	}

	await writeApiLanding(packages);

	console.log(`Generated API docs for ${packages.length} package(s).`);
}

await generate();
