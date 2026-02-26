import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const PACKAGES_DIR = join(import.meta.dir, "../packages");
const PRODUCTS_DIR = join(import.meta.dir, "../products");
const TOOLS_DIR = join(import.meta.dir, "../tools");
const SCOPE = "@gooi/";

interface PkgJson {
	name: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

async function loadPackages(): Promise<PkgJson[]> {
	const pkgs: PkgJson[] = [];
	const seen = new Set<string>();

	const tryLoad = async (pkgPath: string) => {
		try {
			const raw = await readFile(pkgPath, "utf-8");
			const parsed = JSON.parse(raw) as PkgJson;
			if (!seen.has(parsed.name)) {
				seen.add(parsed.name);
				pkgs.push(parsed);
			}
		} catch {
			// skip dirs without package.json
		}
	};

	const packageDirs = await readdir(PACKAGES_DIR, { withFileTypes: true });
	for (const d of packageDirs) {
		if (!d.isDirectory()) continue;
		await tryLoad(join(PACKAGES_DIR, d.name, "package.json"));
	}

	const productCategories = await readdir(PRODUCTS_DIR, { withFileTypes: true });
	for (const category of productCategories) {
		if (!category.isDirectory()) continue;
		const productDirs = await readdir(join(PRODUCTS_DIR, category.name), {
			withFileTypes: true,
		});
		for (const d of productDirs) {
			if (!d.isDirectory()) continue;
			await tryLoad(
				join(PRODUCTS_DIR, category.name, d.name, "package.json"),
			);
		}
	}

	const toolDirs = await readdir(TOOLS_DIR, { withFileTypes: true });
	for (const d of toolDirs) {
		if (!d.isDirectory()) continue;
		await tryLoad(join(TOOLS_DIR, d.name, "package.json"));
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
		console.error("No packages found in packages/, products/*/*, or tools/*.");
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
