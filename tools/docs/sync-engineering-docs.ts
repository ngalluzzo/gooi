#!/usr/bin/env bun

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "..", "..");
const sourceRoot = join(repoRoot, "docs", "engineering");
const destinationRoot = join(repoRoot, "apps", "docs", "docs", "engineering");

type CopyFilter = (fileName: string) => boolean;

function rewriteWorkspaceLinks(content: string): string {
	return content.replace(
		/\]\(\/Users\/ngalluzzo\/repos\/gooi\/([^)]+)\)/g,
		(_match, workspacePath: string) =>
			`](https://github.com/ngalluzzo/gooi/blob/main/${workspacePath})`,
	);
}

async function copyMarkdownDirectory(
	relativePath: string,
	filter?: CopyFilter,
): Promise<string[]> {
	const sourceDir = join(sourceRoot, relativePath);
	const destinationDir = join(destinationRoot, relativePath);

	await rm(destinationDir, { recursive: true, force: true });
	await mkdir(destinationDir, { recursive: true });

	const entries = await readdir(sourceDir, { withFileTypes: true });
	const copied: string[] = [];

	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(".md")) {
			continue;
		}

		if (filter && !filter(entry.name)) {
			continue;
		}

		const sourcePath = join(sourceDir, entry.name);
		const destinationPath = join(destinationDir, entry.name);
		const content = await readFile(sourcePath, "utf8");
		const rewritten = rewriteWorkspaceLinks(content);
		await writeFile(destinationPath, rewritten);
		copied.push(entry.name);
	}

	return copied.sort((left, right) => left.localeCompare(right));
}

async function writeEngineeringLanding(input: {
	rfcs: readonly string[];
	providers: readonly string[];
}): Promise<void> {
	const lines = [
		"---",
		"id: index",
		"title: Engineering",
		"---",
		"",
		"Engineering documentation for standards, RFCs, and provider operations.",
		"",
		"## RFCs",
		"",
		...input.rfcs.map(
			(file) => `- [${file}](./rfcs/${file.replace(/\.md$/, "")})`,
		),
		"",
		"## Provider Docs",
		"",
		...input.providers.map(
			(file) => `- [${file}](./providers/${file.replace(/\.md$/, "")})`,
		),
		"",
		"## Standards",
		"",
		"- [Commit and TSDoc Standards](./commit-and-tsdoc-standards)",
		"",
	];

	await writeFile(join(destinationRoot, "index.md"), lines.join("\n"));
}

async function sync(): Promise<void> {
	await mkdir(destinationRoot, { recursive: true });

	await cp(
		join(sourceRoot, "commit-and-tsdoc-standards.md"),
		join(destinationRoot, "commit-and-tsdoc-standards.md"),
	);

	const rfcs = await copyMarkdownDirectory("rfcs", (fileName) =>
		/^RFC-\d{4}.*\.md$/.test(fileName),
	);
	const providers = await copyMarkdownDirectory("providers");

	await writeEngineeringLanding({ rfcs, providers });

	console.log(
		`Synchronized engineering docs: ${rfcs.length} RFC file(s), ${providers.length} provider file(s).`,
	);
}

await sync();
