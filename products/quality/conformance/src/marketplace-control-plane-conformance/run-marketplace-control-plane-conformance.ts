import { reportsContracts } from "@gooi/conformance-contracts/reports";
import { catalogContracts } from "@gooi/marketplace-contracts/catalog";
import { certificationContracts } from "@gooi/marketplace-contracts/certification";
import { listingContracts } from "@gooi/marketplace-contracts/listing";
import type {
	MarketplaceControlPlaneConformanceCheckResult,
	MarketplaceControlPlaneConformanceDiagnostic,
	MarketplaceControlPlaneConformanceReport,
	RunMarketplaceControlPlaneConformanceInput,
} from "./contracts";

const buildCheck = (
	id: MarketplaceControlPlaneConformanceCheckResult["id"],
	passed: boolean,
	detail: string,
): MarketplaceControlPlaneConformanceCheckResult => ({
	id,
	passed,
	detail,
});

const appendDiagnostic = (
	diagnostics: MarketplaceControlPlaneConformanceDiagnostic[],
	code: MarketplaceControlPlaneConformanceDiagnostic["code"],
	path: string,
	message: string,
): void => {
	diagnostics.push({ code, path, message });
};

/**
 * Runs conformance checks for marketplace control-plane listing, catalog,
 * certification workflows, plus governance report serialization.
 */
export const runMarketplaceControlPlaneConformance = (
	input: RunMarketplaceControlPlaneConformanceInput,
): MarketplaceControlPlaneConformanceReport => {
	const diagnostics: MarketplaceControlPlaneConformanceDiagnostic[] = [];

	const published = listingContracts.publishListing({
		state: { listings: [], auditLog: [] },
		actorId: input.actorId,
		occurredAt: input.publishOccurredAt,
		namespaceApprovals: input.namespaceApprovals,
		release: input.release,
	});
	const updated =
		published.ok === false
			? published
			: listingContracts.updateListing({
					state: published.state,
					actorId: input.actorId,
					occurredAt: input.updateOccurredAt,
					providerId: input.release.providerId,
					providerVersion: input.release.providerVersion,
					metadata: input.updatedMetadata,
				});
	const deprecated =
		updated.ok === false
			? updated
			: listingContracts.deprecateListing({
					state: updated.state,
					actorId: input.actorId,
					occurredAt: input.deprecateOccurredAt,
					providerId: input.release.providerId,
					providerVersion: input.release.providerVersion,
					reason: "conformance-lifecycle",
				});

	const listingPassed =
		published.ok &&
		updated.ok &&
		deprecated.ok &&
		deprecated.listing.status === "deprecated";
	if (!listingPassed) {
		appendDiagnostic(
			diagnostics,
			"conformance_parity_error",
			"listing.lifecycle",
			"Listing lifecycle contracts did not complete publish/update/deprecate transitions.",
		);
	}

	const catalogState = updated.ok
		? updated.state
		: { listings: [], auditLog: [] };
	const search = catalogContracts.searchCatalog({
		state: catalogState,
		descriptorIndex: input.descriptorIndex,
		query: {
			providerNamespace: input.release.providerNamespace,
			status: "active",
			limit: 10,
			offset: 0,
		},
	});
	const detail = catalogContracts.getCatalogDetail({
		state: catalogState,
		descriptorIndex: input.descriptorIndex,
		providerId: input.release.providerId,
		providerVersion: input.release.providerVersion,
	});
	const snapshot = catalogContracts.exportCatalogSnapshot({
		state: catalogState,
		descriptorIndex: input.descriptorIndex,
		mirrorId: input.catalogMirrorId,
		includeDeprecated: false,
	});

	const catalogPassed =
		search.ok &&
		detail.ok &&
		snapshot.ok &&
		search.result.total === 1 &&
		snapshot.snapshot.listingCount === 1;
	if (!catalogPassed) {
		appendDiagnostic(
			diagnostics,
			"conformance_parity_error",
			"catalog.search_detail_snapshot",
			"Catalog search/detail/snapshot contracts returned unexpected results for active listings.",
		);
	}

	const started = certificationContracts.startCertification({
		listingState: catalogState,
		certificationState: { records: [], auditLog: [] },
		actorId: input.actorId,
		occurredAt: input.certificationStartedAt,
		providerId: input.release.providerId,
		providerVersion: input.release.providerVersion,
		profileId: input.certificationPolicy.profileId,
	});
	const completed =
		started.ok === false
			? started
			: certificationContracts.completeCertification({
					listingState: catalogState,
					certificationState: started.state,
					actorId: input.actorId,
					occurredAt: input.certificationCompletedAt,
					providerId: input.release.providerId,
					providerVersion: input.release.providerVersion,
					policy: input.certificationPolicy,
					evidence: input.certificationEvidence,
					report: input.certificationReport,
					...(input.certificationTrustDecision === undefined
						? {}
						: { trustDecision: input.certificationTrustDecision }),
				});

	const expectedCertificationStatus =
		input.certificationReport.outcome === "pass" ? "certified" : "rejected";
	const certificationPassed =
		started.ok &&
		completed.ok &&
		completed.record.status === expectedCertificationStatus;
	if (!certificationPassed) {
		appendDiagnostic(
			diagnostics,
			"certification_requirement_error",
			"certification.workflow",
			"Certification contracts failed start/complete workflow or policy requirements.",
		);
	}

	const checks: MarketplaceControlPlaneConformanceCheckResult[] = [
		buildCheck(
			"listing_lifecycle_contract_behavior",
			listingPassed,
			listingPassed
				? "Listing publish/update/deprecate lifecycle contracts are deterministic and valid."
				: "Listing lifecycle contract behavior regressed.",
		),
		buildCheck(
			"catalog_contract_behavior",
			catalogPassed,
			catalogPassed
				? "Catalog search/detail/snapshot contracts produced deterministic active-listing outputs."
				: "Catalog contract behavior regressed.",
		),
		buildCheck(
			"certification_contract_behavior",
			certificationPassed,
			certificationPassed
				? "Certification start/complete contracts satisfied policy and trust coupling requirements."
				: "Certification contract behavior regressed.",
		),
	];

	const governanceEnvelope = {
		contractVersion: input.fixture.contractVersion,
		fixture: input.fixture,
		report: {
			passed: checks.every((check) => check.passed),
			checks,
		},
	};

	let governanceDigest =
		reportsContracts.serializeConformanceReportDeterministically(
			governanceEnvelope,
		);
	let governancePassed = true;
	try {
		const parsed =
			reportsContracts.parseVersionedConformanceSuiteReport(governanceEnvelope);
		const firstDigest =
			reportsContracts.serializeConformanceReportDeterministically(parsed);
		const secondDigest =
			reportsContracts.serializeConformanceReportDeterministically(parsed);
		governancePassed = firstDigest === secondDigest;
		governanceDigest = firstDigest;
	} catch {
		governancePassed = false;
		appendDiagnostic(
			diagnostics,
			"conformance_parity_error",
			"governance.report",
			"Versioned control-plane conformance report failed governance contract parsing.",
		);
	}

	checks.push(
		buildCheck(
			"governance_report_contract_behavior",
			governancePassed,
			governancePassed
				? "Versioned control-plane conformance report is parseable and deterministically serializable."
				: "Governance report contract behavior regressed.",
		),
	);

	return {
		passed: checks.every((check) => check.passed),
		checks,
		diagnostics,
		governanceEnvelopeDigest: governanceDigest,
	};
};
