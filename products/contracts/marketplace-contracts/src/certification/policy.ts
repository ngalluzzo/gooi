import type {
	CertificationEvidence,
	CertificationPolicyProfile,
	CertificationRecord,
	CertificationStatus,
} from "./model";

const allowedTransitions = {
	none: ["pending"],
	pending: ["certified", "rejected"],
	rejected: ["pending"],
	certified: ["revoked"],
	revoked: [],
} as const;

export const canTransitionCertification = (
	from: CertificationStatus | "none",
	to: CertificationStatus,
): boolean => {
	return (allowedTransitions[from] as readonly CertificationStatus[]).includes(
		to,
	);
};

export const sortCertificationEvidence = (
	evidence: readonly CertificationEvidence[],
): CertificationEvidence[] => {
	return [...evidence].sort((left, right) => {
		const kindRank = left.kind.localeCompare(right.kind);
		if (kindRank !== 0) {
			return kindRank;
		}
		const hashRank = left.artifactHash.localeCompare(right.artifactHash);
		if (hashRank !== 0) {
			return hashRank;
		}
		return left.artifactUri.localeCompare(right.artifactUri);
	});
};

export const missingRequiredEvidenceKinds = (
	policy: CertificationPolicyProfile,
	evidence: readonly CertificationEvidence[],
): string[] => {
	const evidenceKinds = new Set(evidence.map((item) => item.kind));
	return policy.requiredEvidenceKinds.filter(
		(kind) => !evidenceKinds.has(kind),
	);
};

export const findCertificationRecordIndex = (
	records: readonly CertificationRecord[],
	providerId: string,
	providerVersion: string,
): number => {
	return records.findIndex(
		(record) =>
			record.providerId === providerId &&
			record.providerVersion === providerVersion,
	);
};
