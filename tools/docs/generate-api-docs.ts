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

interface PackageMetadata {
	readonly directory: string;
	readonly packageName: string;
}

const repoRoot = resolve(import.meta.dir, "..", "..");
const apiDocsRoot = join(repoRoot, "apps", "docs", "docs", "api");

// Roots to scan: { path, depth } where depth=1 means direct children,
// depth=2 means grandchildren (e.g. products/authoring/authoring-contracts)
const scanRoots = [
	{ path: join(repoRoot, "packages"), depth: 1 },
	{ path: join(repoRoot, "products"), depth: 2 },
	{ path: join(repoRoot, "marketplace"), depth: 1 },
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
	const allDirectories: string[] = [];

	for (const { path, depth } of scanRoots) {
		const dirs = await collectDirectories(path, depth);
		allDirectories.push(...dirs);
	}

	allDirectories.sort((left, right) => left.localeCompare(right));

	const packages: PackageMetadata[] = [];

	for (const directory of allDirectories) {
		const metadata = await loadPackageMetadata(directory);
		if (metadata !== null) {
			packages.push(metadata);
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

async function writeApiLanding(
	packages: readonly PackageMetadata[],
): Promise<void> {
	const lines = [
		"---",
		"id: index",
		"title: API Reference",
		"---",
		"",
		"API documentation is generated from package-level Typedoc.",
		"",
		...packages.map((pkg) => {
			const slug = basename(pkg.directory);
			return `- [${pkg.packageName}](./${slug})`;
		}),
		"",
		"Run from repo root:",
		"",
		"```bash",
		"bun run docs:api",
		"```",
		"",
	];

	await writeFile(join(apiDocsRoot, "index.md"), lines.join("\n"));
}

async function generate(): Promise<void> {
	const packages = await resolvePackages();

	await rm(apiDocsRoot, { recursive: true, force: true });
	await mkdir(apiDocsRoot, { recursive: true });

	for (const pkg of packages) {
		const slug = basename(pkg.directory);
		const outDir = join(apiDocsRoot, slug);
		await mkdir(outDir, { recursive: true });
		runTypedoc(pkg.directory, outDir);
	}

	await writeApiLanding(packages);

	console.log(`Generated API docs for ${packages.length} package(s).`);
}

await generate();
