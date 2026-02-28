/**
 * Canonical provider manifest base contract API.
 */
import {
	parseProviderManifestBase,
	safeParseProviderManifestBase,
	semverPattern,
} from "./base";

export type {
	ProviderManifestBase,
	ProviderManifestParseError,
	ProviderManifestParseIssue,
	ProviderManifestParseResult,
} from "./base";
export {
	parseProviderManifestBase,
	semverPattern,
	safeParseProviderManifestBase,
};

export const providerManifestContracts = Object.freeze({
	semverPattern,
	parseProviderManifestBase,
	safeParseProviderManifestBase,
});
