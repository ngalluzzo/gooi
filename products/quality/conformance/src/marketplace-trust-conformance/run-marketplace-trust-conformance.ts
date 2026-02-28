import { certificationContracts } from "@gooi/marketplace-contracts/certification";
import { listingContracts } from "@gooi/marketplace-contracts/listing";
import { resolutionContracts } from "@gooi/marketplace-contracts/resolution";
import { trustContracts } from "@gooi/marketplace-contracts/trust";
import type {
	MarketplaceTrustConformanceCheckResult,
	MarketplaceTrustConformanceDiagnostic,
	MarketplaceTrustConformanceReport,
	RunMarketplaceTrustConformanceInput,
} from "./contracts";

const buildCheck = (
	id: MarketplaceTrustConformanceCheckResult["id"],
	passed: boolean,
	detail: string,
): MarketplaceTrustConformanceCheckResult => ({
	id,
	passed,
	detail,
});

const appendDiagnostic = (
	diagnostics: MarketplaceTrustConformanceDiagnostic[],
	code: MarketplaceTrustConformanceDiagnostic["code"],
	path: string,
	message: string,
): void => {
	diagnostics.push({ code, path, message });
};

const mergeRevocationRefs = (
	input: NonNullable<
		RunMarketplaceTrustConformanceInput["resolutionRevocationInput"]
	>,
	revokedProviderRefs: readonly string[],
): NonNullable<
	RunMarketplaceTrustConformanceInput["resolutionRevocationInput"]
> => ({
	...input,
	revocation: {
		...input.revocation,
		revokedProviderRefs: [...revokedProviderRefs],
	},
});

/**
 * Runs conformance checks for marketplace trust verification, certification
 * coupling, revocation propagation, and certified-release fail-closed gates.
 */
export const runMarketplaceTrustConformance = (
	input: RunMarketplaceTrustConformanceInput,
): MarketplaceTrustConformanceReport => {
	const diagnostics: MarketplaceTrustConformanceDiagnostic[] = [];

	const trustVerified = trustContracts.verifyReleaseTrust(
		input.trustVerificationInput,
	);
	const published = listingContracts.publishListing({
		state: { listings: [], auditLog: [] },
		actorId: input.actorId,
		occurredAt: input.publishOccurredAt,
		namespaceApprovals: input.namespaceApprovals,
		release: input.release,
	});

	const started =
		published.ok &&
		certificationContracts.startCertification({
			listingState: published.state,
			certificationState: { records: [], auditLog: [] },
			actorId: input.actorId,
			occurredAt: input.certificationStartedAt,
			providerId: input.release.providerId,
			providerVersion: input.release.providerVersion,
			profileId: input.certificationPolicy.profileId,
		});

	const completed =
		published.ok &&
		started !== false &&
		started.ok &&
		trustVerified.ok &&
		certificationContracts.completeCertification({
			listingState: published.state,
			certificationState: started.state,
			actorId: input.actorId,
			occurredAt: input.certificationCompletedAt,
			providerId: input.release.providerId,
			providerVersion: input.release.providerVersion,
			policy: input.certificationPolicy,
			evidence: input.certificationEvidence,
			report: input.certificationReport,
			trustDecision: trustVerified.report,
		});

	const couplingPassed =
		trustVerified.ok &&
		published.ok &&
		started !== false &&
		started.ok &&
		completed !== false &&
		completed.ok &&
		completed.record.status === "certified";
	if (!couplingPassed) {
		appendDiagnostic(
			diagnostics,
			"certification_requirement_error",
			"trust.certification_coupling",
			"Trust verification and certification coupling failed required certified transition behavior.",
		);
	}

	const revocationPublished = trustContracts.publishTrustRevocation(
		input.revocationPublishInput,
	);
	const revokedProviderRefs = revocationPublished.ok
		? trustContracts.deriveRevokedProviderRefs(
				revocationPublished.ledger.events,
			)
		: [];

	const freshResolution = resolutionContracts.resolveTrustedProviders(
		mergeRevocationRefs(input.resolutionRevocationInput, revokedProviderRefs),
	);
	const revokedTrust = trustContracts.verifyReleaseTrust(
		input.revokedTrustVerificationInput,
	);

	const revocationPropagationPassed =
		revocationPublished.ok &&
		revokedProviderRefs.includes(
			`${input.revocationPublishInput.providerId}@${input.revocationPublishInput.providerVersion}`,
		) &&
		freshResolution.ok &&
		(
			freshResolution.decision.explainability.diagnostics
				?.eligibilityDiagnostics ?? []
		).some(
			(diagnostic) => diagnostic.code === "resolver_eligibility_revoked",
		) &&
		!revokedTrust.ok &&
		revokedTrust.error.code === "trust_revoked_error";
	if (!revocationPropagationPassed) {
		appendDiagnostic(
			diagnostics,
			"marketplace_revocation_propagation_error",
			"trust.revocation_propagation",
			"Revocation propagation did not fail closed across resolution and trust verification contracts.",
		);
	}

	const staleResolution = resolutionContracts.resolveTrustedProviders(
		mergeRevocationRefs(
			input.resolutionStaleRevocationInput,
			revokedProviderRefs,
		),
	);
	const certificationMissingFailClosed = trustContracts.verifyReleaseTrust(
		input.certificationMissingFailClosedInput,
	);
	const certifiedReleaseGatePassed =
		!staleResolution.ok &&
		staleResolution.error.code === "resolver_policy_rejection_error" &&
		!certificationMissingFailClosed.ok &&
		certificationMissingFailClosed.error.code ===
			"trust_certification_missing_error";
	if (!certifiedReleaseGatePassed) {
		appendDiagnostic(
			diagnostics,
			"conformance_parity_error",
			"trust.certified_release_gate",
			"Certified release fail-closed gates did not enforce stale-revocation or certification-required behavior.",
		);
	}

	const checks: MarketplaceTrustConformanceCheckResult[] = [
		buildCheck(
			"trust_verification_and_certification_coupling",
			couplingPassed,
			couplingPassed
				? "Trust verification and certification contracts are correctly coupled for certified releases."
				: "Trust/certification coupling behavior regressed.",
		),
		buildCheck(
			"revocation_propagation_fail_closed_behavior",
			revocationPropagationPassed,
			revocationPropagationPassed
				? "Revocation propagation fails closed across trust and resolution contracts."
				: "Revocation propagation fail-closed behavior regressed.",
		),
		buildCheck(
			"certified_release_path_gate_behavior",
			certifiedReleaseGatePassed,
			certifiedReleaseGatePassed
				? "Certified release path enforces stale-revocation and certification-required fail-closed gates."
				: "Certified release path fail-closed gate behavior regressed.",
		),
	];

	return {
		passed: checks.every((check) => check.passed),
		checks,
		diagnostics,
	};
};
