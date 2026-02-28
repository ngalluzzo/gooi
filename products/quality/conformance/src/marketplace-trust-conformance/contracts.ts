import type { ConformanceCheckResultBase } from "@gooi/conformance-contracts/checks";
import type { ConformanceDiagnosticRecordBase } from "@gooi/conformance-contracts/diagnostics";
import type { ConformanceSuiteReportBase } from "@gooi/conformance-contracts/reports";
import type {
	CertificationEvidence,
	CertificationPolicyProfile,
	CertificationReport,
} from "@gooi/marketplace-contracts/certification";
import type { ListingRelease } from "@gooi/marketplace-contracts/listing";
import type { ResolveTrustedProvidersInput } from "@gooi/marketplace-contracts/resolution";
import type {
	PublishTrustRevocationInput,
	VerifyReleaseTrustInput,
} from "@gooi/marketplace-contracts/trust";

type ResolveTrustedProvidersWithRevocation = ResolveTrustedProvidersInput & {
	readonly revocation: NonNullable<ResolveTrustedProvidersInput["revocation"]>;
};

export type MarketplaceTrustConformanceCheckId =
	| "trust_verification_and_certification_coupling"
	| "revocation_propagation_fail_closed_behavior"
	| "certified_release_path_gate_behavior";

export type MarketplaceTrustConformanceCheckResult =
	ConformanceCheckResultBase<MarketplaceTrustConformanceCheckId>;

export interface MarketplaceTrustConformanceDiagnostic
	extends ConformanceDiagnosticRecordBase<
		| "marketplace_revocation_propagation_error"
		| "certification_requirement_error"
		| "conformance_parity_error"
	> {}

export interface RunMarketplaceTrustConformanceInput {
	readonly actorId: string;
	readonly namespaceApprovals: readonly string[];
	readonly release: ListingRelease;
	readonly publishOccurredAt: string;
	readonly certificationStartedAt: string;
	readonly certificationCompletedAt: string;
	readonly certificationPolicy: CertificationPolicyProfile;
	readonly certificationEvidence: readonly CertificationEvidence[];
	readonly certificationReport: CertificationReport;
	readonly trustVerificationInput: VerifyReleaseTrustInput;
	readonly revokedTrustVerificationInput: VerifyReleaseTrustInput;
	readonly certificationMissingFailClosedInput: VerifyReleaseTrustInput;
	readonly revocationPublishInput: PublishTrustRevocationInput;
	readonly resolutionRevocationInput: ResolveTrustedProvidersWithRevocation;
	readonly resolutionStaleRevocationInput: ResolveTrustedProvidersWithRevocation;
}

export interface MarketplaceTrustConformanceReport
	extends ConformanceSuiteReportBase<MarketplaceTrustConformanceCheckResult> {
	readonly diagnostics: readonly MarketplaceTrustConformanceDiagnostic[];
}
