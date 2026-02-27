import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

interface AmbientGlobalPattern {
	readonly id: string;
	readonly expression: RegExp;
}

const ambientGlobalPatterns: readonly AmbientGlobalPattern[] = [
	{ id: "new_date", expression: /\bnew\s+Date\s*\(/g },
	{ id: "date_static", expression: /\bDate\.(?:now|parse|UTC)\s*\(/g },
	{ id: "random_uuid", expression: /\bcrypto\.randomUUID\s*\(/g },
	{ id: "math_random", expression: /\bMath\.random\s*\(/g },
	{ id: "performance_now", expression: /\bperformance\.now\s*\(/g },
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

describe("runtime ambient host globals conformance", () => {
	test("runtime source paths avoid ambient singleton host globals", () => {
		const runtimeRoots = [
			join(
				import.meta.dir,
				"..",
				"..",
				"..",
				"runtime",
				"entrypoint-runtime",
				"src",
			),
			join(
				import.meta.dir,
				"..",
				"..",
				"..",
				"runtime",
				"provider-runtime",
				"src",
			),
			join(
				import.meta.dir,
				"..",
				"..",
				"..",
				"runtime",
				"surface-runtime",
				"src",
			),
		] as const;
		const repoRoot = join(import.meta.dir, "..", "..", "..", "..");

		const findings: string[] = [];
		for (const root of runtimeRoots) {
			for (const filePath of collectTypeScriptFiles(root)) {
				const source = readFileSync(filePath, "utf8");
				for (const pattern of ambientGlobalPatterns) {
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
