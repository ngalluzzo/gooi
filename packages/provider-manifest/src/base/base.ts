/**
 * Semver regular expression in MAJOR.MINOR.PATCH format.
 */
export const semverPattern = /^\d+\.\d+\.\d+$/;

/**
 * Shared base fields for provider manifests.
 */
export interface ProviderManifestBase {
	readonly providerId: string;
	readonly providerVersion: string;
	readonly hostApiRange: string;
}

/**
 * Parse issue produced by provider manifest validation.
 */
export interface ProviderManifestParseIssue {
	readonly path: readonly string[];
	readonly message: string;
}

/**
 * Structured parse error payload.
 */
export interface ProviderManifestParseError {
	readonly issues: readonly ProviderManifestParseIssue[];
}

/**
 * Result type returned by safe provider manifest parsing.
 */
export type ProviderManifestParseResult<T> =
	| { readonly success: true; readonly data: T }
	| { readonly success: false; readonly error: ProviderManifestParseError };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === "string" && value.length > 0;

interface ParsedProviderManifestBaseRecord {
	readonly providerId: string;
	readonly providerVersion: string;
	readonly hostApiRange: string;
}

const safeParseProviderManifestBaseRecord = (
	value: unknown,
): ProviderManifestParseResult<ParsedProviderManifestBaseRecord> => {
	if (!isRecord(value)) {
		return {
			success: false,
			error: {
				issues: [{ path: [], message: "Expected object." }],
			},
		};
	}

	const issues: ProviderManifestParseIssue[] = [];
	const { providerId, providerVersion, hostApiRange } = value;

	if (!isNonEmptyString(providerId)) {
		issues.push({
			path: ["providerId"],
			message: "Expected non-empty string providerId.",
		});
	}

	if (
		typeof providerVersion !== "string" ||
		!semverPattern.test(providerVersion)
	) {
		issues.push({
			path: ["providerVersion"],
			message: "Expected semver in MAJOR.MINOR.PATCH format.",
		});
	}

	if (!isNonEmptyString(hostApiRange)) {
		issues.push({
			path: ["hostApiRange"],
			message: "Expected non-empty string hostApiRange.",
		});
	}

	if (issues.length > 0) {
		return {
			success: false,
			error: { issues },
		};
	}

	if (
		!isNonEmptyString(providerId) ||
		typeof providerVersion !== "string" ||
		!semverPattern.test(providerVersion) ||
		!isNonEmptyString(hostApiRange)
	) {
		return {
			success: false,
			error: { issues },
		};
	}

	return {
		success: true,
		data: {
			providerId,
			providerVersion,
			hostApiRange,
		},
	};
};

/**
 * Parses and validates shared provider manifest base fields.
 */
export const parseProviderManifestBase = (
	value: unknown,
): ProviderManifestBase => {
	const parsed = safeParseProviderManifestBaseRecord(value);
	if (!parsed.success) {
		throw new Error(
			`Invalid provider manifest base: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
		);
	}
	return {
		providerId: parsed.data.providerId,
		providerVersion: parsed.data.providerVersion,
		hostApiRange: parsed.data.hostApiRange,
	};
};

/**
 * Safely parses shared provider manifest base fields.
 */
export const safeParseProviderManifestBase = (
	value: unknown,
): ProviderManifestParseResult<ProviderManifestBase> => {
	return safeParseProviderManifestBaseRecord(value);
};
