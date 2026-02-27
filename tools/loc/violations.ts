#!/usr/bin/env bun

import { parseLocArgs } from "./lib/violations/args";
import { loadViolations, sortViolations } from "./lib/violations/calculation";
import {
	isExemptedByException,
	type LocException,
	type LocViolation,
	readExceptions,
} from "./lib/violations/config";
/**
 * @module violations
 * List files that exceed a lines-of-code threshold.
 *
 * Invoked via `bun loc:check` from the monorepo root.
 * Exits with code 0 when no critical violations are found.
 */
import {
	printCriticalExceptions,
	printEmpty,
	printFailureOnCritical,
	printSummary,
	printViolations,
} from "./lib/violations/report";

const args = parseLocArgs();
const { rootDir, limit, sortBy, exceptionsPath } = args;

const regressions = sortViolations(loadViolations(rootDir, limit), sortBy);
const exceptions = await readExceptions(exceptionsPath);

const severityGroups = regressions.reduce(
	(
		acc,
		violation,
	): {
		criticalFindings: LocViolation[];
		criticalExceptions: ReadonlyArray<{
			violation: LocViolation;
			exception: LocException;
		}>;
	} => {
		const exception = isExemptedByException(violation, exceptions);
		const isCriticalViolation = violation.excess > limit;

		if (isCriticalViolation) {
			if (exception) {
				acc.criticalExceptions = acc.criticalExceptions.concat({
					violation,
					exception,
				});
			} else {
				acc.criticalFindings.push(violation);
			}
		}
		return acc;
	},
	{ criticalFindings: [], criticalExceptions: [] },
);

if (regressions.length === 0) {
	printEmpty(regressions, limit);
	process.exit(0);
}

printViolations(regressions, limit, sortBy);
printSummary(regressions, limit, severityGroups.criticalExceptions.length > 0);
printCriticalExceptions(severityGroups.criticalExceptions);

if (severityGroups.criticalFindings.length > 0) {
	printFailureOnCritical();
}

if (
	severityGroups.criticalExceptions.length > 0 &&
	severityGroups.criticalFindings.length === 0
) {
	process.exit(0);
}
