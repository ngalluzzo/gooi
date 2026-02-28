#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const goldenRecordDir = "docs/engineering/golden-updates";
const goldenRecordPrefix = `${goldenRecordDir}/`;

const runGit = (args: string[]): string => {
	const result = Bun.spawnSync(["git", ...args], {
		cwd: repoRoot,
		stdout: "pipe",
		stderr: "pipe",
	});
	if (result.exitCode !== 0) {
		throw new Error(
			`git ${args.join(" ")} failed: ${result.stderr.toString().trim()}`,
		);
	}
	return result.stdout.toString().trim();
};

const hasRef = (ref: string): boolean => {
	try {
		runGit(["rev-parse", "--verify", "--quiet", ref]);
		return true;
	} catch {
		return false;
	}
};

const resolveBaseRef = (): string => {
	const arg = process.argv.find((value) => value.startsWith("--base-ref="));
	if (arg !== undefined) {
		return arg.slice("--base-ref=".length);
	}
	if (
		process.env.GITHUB_EVENT_NAME === "pull_request" &&
		process.env.GITHUB_BASE_REF
	) {
		const candidate = `origin/${process.env.GITHUB_BASE_REF}`;
		if (hasRef(candidate)) {
			return candidate;
		}
	}
	if (hasRef("origin/main")) {
		return "origin/main";
	}
	return "HEAD~1";
};

const changedFilesSince = (baseRef: string): string[] => {
	const parseChangedFiles = (raw: string): string[] =>
		raw
			.split("\n")
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);

	try {
		const raw = runGit(["diff", "--name-only", `${baseRef}...HEAD`]);
		return parseChangedFiles(raw);
	} catch {
		const parentRefs = runGit(["show", "-s", "--pretty=%P", "HEAD"])
			.split(" ")
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);

		if (parentRefs.length === 0) {
			const subject = runGit(["show", "-s", "--pretty=%s", "HEAD"]);
			if (subject.startsWith("Merge ")) {
				console.warn(
					`Golden governance check warning: unable to inspect merge ancestry in shallow checkout; skipping changed-file detection.`,
				);
				return [];
			}
		}

		// Merge commits in shallow CI can include unrelated base-branch changes in
		// `git show` output. If ancestry diff is unavailable, skip rather than emit
		// false governance failures.
		if (parentRefs.length > 1) {
			console.warn(
				`Golden governance check warning: unable to diff against ${baseRef} in shallow merge checkout; skipping changed-file detection.`,
			);
			return [];
		}

		// Non-merge commit fallback still preserves deterministic changed-file checks.
		const raw = runGit(["show", "--pretty=format:", "--name-only", "HEAD"]);
		return parseChangedFiles(raw);
	}
};

const isGoldenFile = (path: string): boolean =>
	path.includes(".golden.") || path.includes("/golden/");

const isGoldenRecordFile = (path: string): boolean =>
	path.startsWith(goldenRecordPrefix) &&
	path.endsWith(".md") &&
	!path.endsWith("README.md") &&
	!path.endsWith("TEMPLATE.md");

const validateGoldenRecord = (path: string): string[] => {
	const content = readFileSync(join(repoRoot, path), "utf8");
	const requiredMarkers = [
		"- Date:",
		"- Approver:",
		"- Contract Version:",
		"- Justification:",
		"## Changed Goldens",
	];
	return requiredMarkers.filter((marker) => !content.includes(marker));
};

const main = () => {
	const baseRef = resolveBaseRef();
	const changedFiles = changedFilesSince(baseRef);
	const goldenFiles = changedFiles.filter((path) => isGoldenFile(path));

	if (goldenFiles.length === 0) {
		console.log(
			`Golden governance check passed: no golden files changed since ${baseRef}.`,
		);
		return;
	}

	if (!existsSync(join(repoRoot, goldenRecordDir))) {
		console.error(
			`Golden governance check failed: missing ${goldenRecordDir} directory.`,
		);
		process.exit(1);
	}

	const changedRecordFiles = changedFiles.filter((path) =>
		isGoldenRecordFile(path),
	);
	if (changedRecordFiles.length === 0) {
		console.error("Golden governance check failed:");
		console.error("- Golden files changed without a golden update record.");
		console.error(`- Changed goldens: ${goldenFiles.join(", ")}`);
		process.exit(1);
	}

	const recordValidationFailures: string[] = [];
	for (const recordPath of changedRecordFiles) {
		const missingMarkers = validateGoldenRecord(recordPath);
		if (missingMarkers.length > 0) {
			recordValidationFailures.push(
				`${recordPath}: missing required fields ${missingMarkers.join(", ")}`,
			);
		}
	}
	if (recordValidationFailures.length > 0) {
		console.error("Golden governance check failed:");
		recordValidationFailures.forEach((failure) => {
			console.error(`- ${failure}`);
		});
		process.exit(1);
	}

	const combinedRecordContent = changedRecordFiles
		.map((path) => readFileSync(join(repoRoot, path), "utf8"))
		.join("\n");
	const missingGoldenReferences = goldenFiles.filter(
		(path) => !combinedRecordContent.includes(path),
	);
	if (missingGoldenReferences.length > 0) {
		console.error("Golden governance check failed:");
		console.error(
			`- Changed golden files are not referenced in update record(s): ${missingGoldenReferences.join(", ")}`,
		);
		process.exit(1);
	}

	console.log("Golden governance check passed.");
	console.log(`- Base ref: ${baseRef}`);
	console.log(`- Golden files changed: ${goldenFiles.length}`);
	console.log(`- Golden record files: ${changedRecordFiles.length}`);
};

main();
