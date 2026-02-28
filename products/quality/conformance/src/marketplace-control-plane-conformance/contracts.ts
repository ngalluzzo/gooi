import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceDiagnosticRecordBase } from "@gooi/conformance-contracts/diagnostics";
import type { ConformanceFixtureDescriptor } from "@gooi/conformance-contracts/fixtures";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type { CatalogProviderExecutionDescriptorIndex } from "@gooi/marketplace-contracts/catalog";
import type {
	CertificationEvidence,
	CertificationPolicyProfile,
	CertificationReport,
} from "@gooi/marketplace-contracts/certification";
import type {
	ListingMetadata,
	ListingRelease,
} from "@gooi/marketplace-contracts/listing";
import type { TrustDecisionReport } from "@gooi/marketplace-contracts/trust";

export type MarketplaceControlPlaneConformanceCheckId =
	| "listing_lifecycle_contract_behavior"
	| "catalog_contract_behavior"
	| "certification_contract_behavior"
	| "governance_report_contract_behavior";

export type MarketplaceControlPlaneConformanceCheckResult =
	ConformanceCheckResultBase<MarketplaceControlPlaneConformanceCheckId>;

export interface MarketplaceControlPlaneConformanceDiagnostic
	extends ConformanceDiagnosticRecordBase<
		"conformance_parity_error" | "certification_requirement_error"
	> {}

export interface RunMarketplaceControlPlaneConformanceInput {
	readonly fixture: ConformanceFixtureDescriptor;
	readonly actorId: string;
	readonly namespaceApprovals: readonly string[];
	readonly release: ListingRelease;
	readonly updatedMetadata: ListingMetadata;
	readonly descriptorIndex?: CatalogProviderExecutionDescriptorIndex;
	readonly catalogMirrorId: string;
	readonly publishOccurredAt: string;
	readonly updateOccurredAt: string;
	readonly deprecateOccurredAt: string;
	readonly certificationStartedAt: string;
	readonly certificationCompletedAt: string;
	readonly certificationPolicy: CertificationPolicyProfile;
	readonly certificationEvidence: readonly CertificationEvidence[];
	readonly certificationReport: CertificationReport;
	readonly certificationTrustDecision?: TrustDecisionReport;
}

export interface MarketplaceControlPlaneConformanceReport
	extends ConformanceSuiteReportBase<MarketplaceControlPlaneConformanceCheckResult> {
	readonly diagnostics: readonly MarketplaceControlPlaneConformanceDiagnostic[];
	readonly governanceEnvelopeDigest: string;
}
