import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PACKAGES_DIR = join(import.meta.dir, "../packages");
const SCOPE = "@gooi/";

interface PkgJson {
	name: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

async function loadPackages(): Promise<PkgJson[]> {
	const dirs = await readdir(PACKAGES_DIR, { withFileTypes: true });
	const pkgs: PkgJson[] = [];

	for (const d of dirs) {
		if (!d.isDirectory()) continue;
		const pkgPath = join(PACKAGES_DIR, d.name, "package.json");
		try {
			const raw = await readFile(pkgPath, "utf-8");
			pkgs.push(JSON.parse(raw));
		} catch {
			// skip dirs without package.json
		}
	}

	return pkgs;
}

function shortName(fullName: string) {
	return fullName.startsWith(SCOPE) ? fullName.slice(SCOPE.length) : fullName;
}

function toNodeId(name: string) {
	// Mermaid node ids can't have @ / -
	return shortName(name).replace(/[^a-zA-Z0-9]/g, "_");
}

function generateMermaid(pkgs: PkgJson[]): string {
	const internalNames = new Set(pkgs.map((p) => p.name));
	const lines: string[] = ["graph LR"];

	// Declare all nodes with labels
	for (const pkg of pkgs) {
		const id = toNodeId(pkg.name);
		const label = shortName(pkg.name);
		lines.push(`  ${id}["${label}"]`);
	}

	lines.push("");

	// Add edges for internal deps only
	for (const pkg of pkgs) {
		const allDeps = {
			...pkg.dependencies,
			...pkg.devDependencies,
			...pkg.peerDependencies,
		};

		for (const dep of Object.keys(allDeps)) {
			if (internalNames.has(dep)) {
				const from = toNodeId(pkg.name);
				const to = toNodeId(dep);
				lines.push(`  ${from} --> ${to}`);
			}
		}
	}

	return lines.join("\n");
}

async function main() {
	const pkgs = await loadPackages();

	if (pkgs.length === 0) {
		console.error("No packages found in packages/");
		process.exit(1);
	}

	const diagram = generateMermaid(pkgs);

	const outArg = Bun.argv[2];
	if (outArg) {
		await writeFile(outArg, diagram, "utf-8");
		console.log(`Written to ${outArg}`);
	} else {
		console.log(diagram);
	}
}

main();
