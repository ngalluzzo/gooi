import { buildFileMap, runTokei } from "../../helpers";
import type { SortBy } from "./args";
import type { LocViolation } from "./config";

export const loadViolations = (
	rootDir: string,
	limit: number,
): LocViolation[] => {
	const fileMap = buildFileMap(rootDir, runTokei(rootDir));
	return [...fileMap.entries()]
		.filter(([, loc]) => loc > limit)
		.map(([filePath, loc]) => ({ path: filePath, loc, excess: loc - limit }));
};

export const sortViolations = (
	violations: readonly LocViolation[],
	sortBy: SortBy,
): LocViolation[] =>
	[...violations].sort((a, b) => {
		if (sortBy === "name") return a.path.localeCompare(b.path);
		if (sortBy === "excess") return b.excess - a.excess;
		return b.loc - a.loc;
	});
