import { readFile } from "node:fs/promises";
import path from "node:path";
import { BOLD, R } from "../../helpers";

export interface LocViolation {
	readonly path: string;
	readonly loc: number;
	readonly excess: number;
}

export interface LocException {
	readonly path: string;
	readonly maxLoc?: number;
	readonly maxExcess?: number;
	readonly reason?: string;
	readonly expiresAt?: string;
}

export interface LocExceptionConfig {
	readonly generatedAt?: string;
	readonly exceptions: readonly LocException[];
}

function normalizePath(input: string): string {
	return input.replaceAll("\\", "/");
}

function isExpired(expiresAt: string | undefined): boolean {
	if (!expiresAt) {
		return false;
	}
	const parsed = new Date(expiresAt);
	if (Number.isNaN(parsed.getTime())) {
		return false;
	}
	return new Date() > parsed;
}

function matchesWildcard(pattern: string, value: string): boolean {
	let patternIndex = 0;
	let valueIndex = 0;
	let starPatternIndex = -1;
	let starMatchValueIndex = 0;

	while (valueIndex < value.length) {
		const patternChar = pattern[patternIndex];
		const valueChar = value[valueIndex];

		if (patternChar === valueChar || patternChar === "?") {
			patternIndex += 1;
			valueIndex += 1;
			continue;
		}

		if (patternChar === "*") {
			starPatternIndex = patternIndex;
			starMatchValueIndex = valueIndex;
			patternIndex += 1;
			continue;
		}

		if (starPatternIndex !== -1) {
			patternIndex = starPatternIndex + 1;
			starMatchValueIndex += 1;
			valueIndex = starMatchValueIndex;
			continue;
		}

		return false;
	}

	while (pattern[patternIndex] === "*") {
		patternIndex += 1;
	}

	return patternIndex === pattern.length;
}

function matchesException(pattern: string, filePath: string): boolean {
	const normalizedPattern = normalizePath(pattern);
	const normalizedPath = normalizePath(filePath);

	if (!normalizedPattern.includes("*") && !normalizedPattern.includes("?")) {
		return normalizedPattern === normalizedPath;
	}

	return matchesWildcard(normalizedPattern, normalizedPath);
}

export async function readExceptions(
	exceptionsPath: string | undefined,
): Promise<readonly LocException[]> {
	if (!exceptionsPath) {
		return [];
	}
	try {
		const raw = await readFile(exceptionsPath, "utf8");
		const parsed = JSON.parse(raw) as LocExceptionConfig;
		return parsed.exceptions ?? [];
	} catch (error) {
		if (
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ENOENT"
		) {
			return [];
		}
		console.error(`${BOLD}Invalid LOC exception file${R}: ${exceptionsPath}`);
		console.error(error);
		process.exit(1);
	}
}

export function isExemptedByException(
	violation: LocViolation,
	exceptions: readonly LocException[],
): LocException | null {
	for (const exception of exceptions) {
		if (!matchesException(exception.path, violation.path)) {
			continue;
		}
		if (isExpired(exception.expiresAt)) {
			continue;
		}
		if (
			exception.maxExcess !== undefined &&
			violation.excess <= exception.maxExcess
		) {
			return exception;
		}
		if (exception.maxLoc !== undefined && violation.loc <= exception.maxLoc) {
			return exception;
		}
	}
	return null;
}

export function resolveExceptionsPath(
	rootDir: string,
	exceptionsArg: string,
): string | undefined {
	return exceptionsArg.length > 0
		? path.resolve(rootDir, exceptionsArg)
		: undefined;
}
