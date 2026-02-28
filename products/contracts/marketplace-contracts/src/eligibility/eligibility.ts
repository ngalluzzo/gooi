import { z } from "zod";
import {
	type ProviderCatalogEntry,
	providerCatalogViewSchema,
	providerDiscoveryCompatibilitySchema,
	providerDiscoveryTrustSchema,
} from "../discovery/discovery";
import {
	createResolverError,
	type ResolverError,
	resolverErrorSchema,
} from "../shared/resolver-errors";

export const providerEligibilityStatusSchema = z.enum([
	"eligible",
	"ineligible",
]);

export type ProviderEligibilityStatus = z.infer<
	typeof providerEligibilityStatusSchema
>;

export const providerEligibilityInputSchema = z.object({
	catalog: providerCatalogViewSchema,
	requiredCertifications: z.array(z.string().min(1)).default([]),
});

export type ProviderEligibilityInput = z.input<
	typeof providerEligibilityInputSchema
>;

export const providerEligibilityEntrySchema = z.object({
	providerId: z.string().min(1),
	providerVersion: z.string().min(1),
	integrity: z.string().min(1),
	status: providerEligibilityStatusSchema,
	reasons: z.array(z.string().min(1)),
	missingCertifications: z.array(z.string().min(1)),
	compatibility: providerDiscoveryCompatibilitySchema,
	trust: providerDiscoveryTrustSchema,
});

export type ProviderEligibilityEntry = z.infer<
	typeof providerEligibilityEntrySchema
>;

export const providerEligibilityReportSchema = z.object({
	query: providerCatalogViewSchema.shape.query,
	requiredCertifications: z.array(z.string().min(1)),
	providers: z.array(providerEligibilityEntrySchema),
	summary: z.object({
		totalProviders: z.number().int().nonnegative(),
		eligibleProviders: z.number().int().nonnegative(),
		ineligibleProviders: z.number().int().nonnegative(),
	}),
});

export type ProviderEligibilityReport = z.infer<
	typeof providerEligibilityReportSchema
>;

export const providerEligibilitySuccessSchema = z.object({
	ok: z.literal(true),
	report: providerEligibilityReportSchema,
});

export const providerEligibilityFailureSchema = z.object({
	ok: z.literal(false),
	error: resolverErrorSchema,
});

export const providerEligibilityResultSchema = z.discriminatedUnion("ok", [
	providerEligibilitySuccessSchema,
	providerEligibilityFailureSchema,
]);

export type ProviderEligibilityResult = z.infer<
	typeof providerEligibilityResultSchema
>;

const toMissingCertifications = (
	available: readonly string[],
	required: readonly string[],
): string[] => {
	const availableSet = new Set(available);
	return required.filter((requiredCertification) => {
		return !availableSet.has(requiredCertification);
	});
};

const toEligibilityEntry = (
	provider: ProviderCatalogEntry,
	requiredCertifications: readonly string[],
): ProviderEligibilityEntry => {
	const missingCertifications = toMissingCertifications(
		provider.trust.certifications,
		requiredCertifications,
	);
	const status =
		provider.selection.eligible && missingCertifications.length === 0
			? "eligible"
			: "ineligible";
	const reasons = [
		...provider.selection.reasons,
		...(missingCertifications.length > 0 ? ["certification_missing"] : []),
	];

	return {
		providerId: provider.providerId,
		providerVersion: provider.providerVersion,
		integrity: provider.integrity,
		status,
		reasons,
		missingCertifications,
		compatibility: provider.compatibility,
		trust: provider.trust,
	};
};

const toRequestError = (
	issues: readonly { path: readonly PropertyKey[]; message: string }[],
): ResolverError => {
	return createResolverError(
		"resolver_request_schema_error",
		"Eligibility input failed schema validation.",
		issues,
	);
};

export const explainProviderEligibility = (
	value: unknown,
): ProviderEligibilityResult => {
	const parsedInput = providerEligibilityInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: toRequestError(parsedInput.error.issues),
		};
	}

	const providers = parsedInput.data.catalog.providers.map((provider) =>
		toEligibilityEntry(provider, parsedInput.data.requiredCertifications),
	);
	const eligibleProviders = providers.filter(
		(provider) => provider.status === "eligible",
	).length;

	return {
		ok: true,
		report: {
			query: parsedInput.data.catalog.query,
			requiredCertifications: parsedInput.data.requiredCertifications,
			providers,
			summary: {
				totalProviders: providers.length,
				eligibleProviders,
				ineligibleProviders: providers.length - eligibleProviders,
			},
		},
	};
};
