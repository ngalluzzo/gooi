#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface WorkspacePackageJson {
	readonly name?: string;
	readonly version?: string;
	readonly exports?: Readonly<Record<string, unknown>>;
	readonly dependencies?: Readonly<Record<string, string>>;
	readonly peerDependencies?: Readonly<Record<string, string>>;
}

const repoRoot = process.cwd();

const facadePackagePaths = [
	"packages/app/package.json",
	"packages/app-runtime/package.json",
	"packages/app-testing/package.json",
	"packages/app-marketplace/package.json",
];

const policyDocPath =
	"docs/engineering/policies/progressive-dx-facade-compatibility.md";
const requiredPolicySections = [
	"## Semver Policy",
	"## Deprecation Policy",
	"## Codemod Strategy",
];

const parsePackageJson = (relativePath: string): WorkspacePackageJson => {
	const absolutePath = join(repoRoot, relativePath);
	return JSON.parse(readFileSync(absolutePath, "utf8")) as WorkspacePackageJson;
};

const parseMajorVersion = (version: string): number | null => {
	const match = /^(\d+)\.\d+\.\d+$/.exec(version.trim());
	if (match === null) {
		return null;
	}
	return Number.parseInt(match[1], 10);
};

const workspacePackageFiles = [
	...new Bun.Glob("packages/*/package.json").scanSync({ cwd: repoRoot }),
	...new Bun.Glob("products/*/*/package.json").scanSync({ cwd: repoRoot }),
	...new Bun.Glob("apps/*/package.json").scanSync({ cwd: repoRoot }),
	...new Bun.Glob("tools/*/package.json").scanSync({ cwd: repoRoot }),
];

const workspacePackagesByName = new Map<
	string,
	{ path: string; packageJson: WorkspacePackageJson }
>();
for (const relativePath of workspacePackageFiles) {
	const packageJson = parsePackageJson(relativePath);
	if (!packageJson.name) {
		continue;
	}
	workspacePackagesByName.set(packageJson.name, {
		path: relativePath,
		packageJson,
	});
}

const issues: string[] = [];

for (const facadePath of facadePackagePaths) {
	if (!existsSync(join(repoRoot, facadePath))) {
		continue;
	}
	const packageJson = parsePackageJson(facadePath);
	if (!packageJson.name || !packageJson.version) {
		issues.push(`${facadePath}: missing required name/version fields.`);
		continue;
	}

	const facadeMajor = parseMajorVersion(packageJson.version);
	if (facadeMajor === null) {
		issues.push(
			`${facadePath}: version "${packageJson.version}" is not semver-compatible (x.y.z).`,
		);
		continue;
	}

	const exportsMap = packageJson.exports ?? {};
	if (Object.hasOwn(exportsMap, ".")) {
		issues.push(
			`${facadePath}: root "." export is disallowed; use explicit feature-scoped subpaths only.`,
		);
	}

	const featureExports = Object.keys(exportsMap).filter(
		(key) => key !== "./package.json",
	);
	if (featureExports.length === 0) {
		issues.push(
			`${facadePath}: no feature-scoped exports found (expected explicit subpath exports).`,
		);
	}

	const facadeRootDir = join(repoRoot, dirname(facadePath));
	if (existsSync(join(facadeRootDir, "src/contracts"))) {
		issues.push(
			`${facadePath}: facade-local shared contracts module detected at src/contracts (shared/public contracts belong in products/contracts/*).`,
		);
	}

	const dependencies = {
		...(packageJson.dependencies ?? {}),
		...(packageJson.peerDependencies ?? {}),
	};
	for (const [dependencyName, dependencyVersion] of Object.entries(
		dependencies,
	)) {
		if (dependencyVersion !== "workspace:*") {
			continue;
		}
		const dependencyPackage = workspacePackagesByName.get(dependencyName);
		if (!dependencyPackage?.packageJson.version) {
			continue;
		}
		const dependencyMajor = parseMajorVersion(
			dependencyPackage.packageJson.version,
		);
		if (dependencyMajor === null) {
			continue;
		}
		if (dependencyMajor !== facadeMajor) {
			issues.push(
				`${facadePath}: ${packageJson.name} major (${facadeMajor}) must match workspace dependency ${dependencyName} major (${dependencyMajor}).`,
			);
		}
	}
}

const policyDocAbsolutePath = join(repoRoot, policyDocPath);
if (!existsSync(policyDocAbsolutePath)) {
	issues.push(`${policyDocPath}: missing compatibility policy document.`);
} else {
	const policyDoc = readFileSync(policyDocAbsolutePath, "utf8");
	for (const section of requiredPolicySections) {
		if (!policyDoc.includes(section)) {
			issues.push(
				`${policyDocPath}: missing required policy section "${section}".`,
			);
		}
	}
}

if (issues.length > 0) {
	console.error("Facade compatibility checks failed:");
	for (const issue of issues) {
		console.error(`- ${issue}`);
	}
	process.exit(1);
}

console.log("Facade compatibility checks passed.");
