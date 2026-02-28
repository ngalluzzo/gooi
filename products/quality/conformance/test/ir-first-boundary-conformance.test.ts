import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

interface ForbiddenPattern {
	readonly id: string;
	readonly expression: RegExp;
}

const forbiddenPatterns: readonly ForbiddenPattern[] = [
	{
		id: "raw_spec_contract_import",
		expression: /from\s+["']@gooi\/app-spec-contracts\/spec["']/g,
	},
	{
		id: "raw_section_payload_execution",
		expression: /\bsections\.(?:domain|session|personas|scenarios)\b/g,
	},
	{
		id: "legacy_mutation_action_map_path",
		expression: /\bmutationEntrypointActionMap\b/g,
	},
];

const collectTypeScriptFiles = (directory: string): readonly string[] => {
	const files: string[] = [];
	const walk = (current: string) => {
		for (const entry of readdirSync(current)) {
			const resolved = join(current, entry);
			const stats = statSync(resolved);
			if (stats.isDirectory()) {
				walk(resolved);
				continue;
			}
			if (resolved.endsWith(".ts")) {
				files.push(resolved);
			}
		}
	};
	walk(directory);
	return files.sort((left, right) => left.localeCompare(right));
};

describe("ir-first boundary conformance", () => {
	test("runtime/kernel execution modules avoid raw-spec execution paths", () => {
		const executionRoots = [
			join(
				import.meta.dir,
				"..",
				"..",
				"..",
				"runtime",
				"domain-runtime",
				"src",
			),
			join(
				import.meta.dir,
				"..",
				"..",
				"..",
				"kernel",
				"execution-kernel",
				"src",
			),
		] as const;
		const repoRoot = join(import.meta.dir, "..", "..", "..", "..");

		const findings: string[] = [];
		for (const root of executionRoots) {
			for (const filePath of collectTypeScriptFiles(root)) {
				const source = readFileSync(filePath, "utf8");
				for (const pattern of forbiddenPatterns) {
					const expression = new RegExp(
						pattern.expression.source,
						pattern.expression.flags,
					);
					const match = expression.exec(source);
					if (match === null || match.index === undefined) {
						continue;
					}
					const preceding = source.slice(0, match.index);
					const line = preceding.split("\n").length;
					findings.push(
						`${relative(repoRoot, filePath)}:${line}:${pattern.id}`,
					);
				}
			}
		}

		expect(findings).toEqual([]);
	});
});
