import path from "node:path";
import { getArg, getDir } from "../../helpers";

export type SortBy = "loc" | "excess" | "name";

export interface LocCliArgs {
	readonly rootDir: string;
	readonly limit: number;
	readonly sortBy: SortBy;
	readonly exceptionsPath: string | undefined;
}

export const parseLocArgs = (): LocCliArgs => {
	const args = Bun.argv.slice(2);
	const rootDir = getDir(args);
	const limit = Number.parseInt(getArg(args, "limit", "250"), 10);
	const sortBy = getArg(args, "sort", "loc") as SortBy;
	const exceptionsArg = getArg(
		args,
		"exceptions",
		"docs/engineering/loc-exceptions.json",
	);
	return {
		rootDir,
		limit,
		sortBy,
		exceptionsPath:
			exceptionsArg.length > 0
				? path.resolve(rootDir, exceptionsArg)
				: undefined,
	};
};
