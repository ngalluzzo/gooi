import { z } from "zod";
import { fail, ok } from "../shared/result";
import type { RuntimeResult } from "../shared/types";

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

const parseSemver = (
	version: string,
): RuntimeResult<{ major: number; minor: number; patch: number }> => {
	const parsed = semverSchema.safeParse(version);
	if (!parsed.success) {
		return fail("compatibility_error", "Invalid semver value.", { version });
	}

	const [majorText, minorText, patchText] = version.split(".");

	return ok({
		major: Number(majorText),
		minor: Number(minorText),
		patch: Number(patchText),
	});
};

const compareSemver = (left: string, right: string): RuntimeResult<number> => {
	const leftParsed = parseSemver(left);
	if (!leftParsed.ok) {
		return leftParsed;
	}

	const rightParsed = parseSemver(right);
	if (!rightParsed.ok) {
		return rightParsed;
	}

	if (leftParsed.value.major !== rightParsed.value.major) {
		return ok(leftParsed.value.major > rightParsed.value.major ? 1 : -1);
	}

	if (leftParsed.value.minor !== rightParsed.value.minor) {
		return ok(leftParsed.value.minor > rightParsed.value.minor ? 1 : -1);
	}

	if (leftParsed.value.patch !== rightParsed.value.patch) {
		return ok(leftParsed.value.patch > rightParsed.value.patch ? 1 : -1);
	}

	return ok(0);
};

const evaluateComparator = (
	comparator: string,
	version: string,
): RuntimeResult<boolean> => {
	const match = comparator.match(/^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/);
	if (!match) {
		return fail("compatibility_error", "Unsupported comparator.", {
			comparator,
		});
	}

	const [, operatorText, expected] = match;
	const operator = operatorText ?? "=";
	if (expected === undefined) {
		return fail("compatibility_error", "Comparator is missing semver value.", {
			comparator,
		});
	}
	const compared = compareSemver(version, expected);
	if (!compared.ok) {
		return compared;
	}

	switch (operator) {
		case "=":
			return ok(compared.value === 0);
		case ">":
			return ok(compared.value > 0);
		case ">=":
			return ok(compared.value >= 0);
		case "<":
			return ok(compared.value < 0);
		case "<=":
			return ok(compared.value <= 0);
		default:
			return fail("compatibility_error", "Unsupported range operator.", {
				operator,
			});
	}
};

/**
 * Evaluates host API compatibility with a provider `hostApiRange` expression.
 *
 * Supports `*`, exact semver (`1.2.3`), caret ranges (`^1.2.3`), and space-
 * separated comparator chains (for example `>=1.0.0 <2.0.0`).
 */
export const isHostApiCompatible = (
	hostApiRange: string,
	hostApiVersion: string,
): RuntimeResult<boolean> => {
	if (hostApiRange === "*") {
		return ok(true);
	}

	if (hostApiRange.startsWith("^")) {
		const baseline = hostApiRange.slice(1);
		const baseParsed = parseSemver(baseline);
		if (!baseParsed.ok) {
			return baseParsed;
		}

		const versionParsed = parseSemver(hostApiVersion);
		if (!versionParsed.ok) {
			return versionParsed;
		}

		const notOlder = compareSemver(hostApiVersion, baseline);
		if (!notOlder.ok) {
			return notOlder;
		}

		return ok(
			versionParsed.value.major === baseParsed.value.major &&
				notOlder.value >= 0,
		);
	}

	if (semverSchema.safeParse(hostApiRange).success) {
		const compared = compareSemver(hostApiVersion, hostApiRange);
		if (!compared.ok) {
			return compared;
		}

		return ok(compared.value === 0);
	}

	const comparators = hostApiRange
		.split(/\s+/)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);

	if (comparators.length === 0) {
		return fail("compatibility_error", "Empty host API range is not allowed.");
	}

	for (const comparator of comparators) {
		const evaluated = evaluateComparator(comparator, hostApiVersion);
		if (!evaluated.ok) {
			return evaluated;
		}

		if (!evaluated.value) {
			return ok(false);
		}
	}

	return ok(true);
};
