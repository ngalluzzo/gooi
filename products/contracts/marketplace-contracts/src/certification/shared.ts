import type {
	CertificationAuditAction,
	CertificationAuditEvent,
	CertificationRecord,
	CertificationRegistryState,
} from "./model";

export const listingExists = (
	listingState: {
		listings: readonly { providerId: string; providerVersion: string }[];
	},
	providerId: string,
	providerVersion: string,
): boolean => {
	return listingState.listings.some((listing) => {
		return (
			listing.providerId === providerId &&
			listing.providerVersion === providerVersion
		);
	});
};

export const sortCertificationRecords = (
	records: CertificationRegistryState["records"],
): CertificationRegistryState["records"] => {
	return [...records].sort((left, right) => {
		const providerRank = left.providerId.localeCompare(right.providerId);
		if (providerRank !== 0) {
			return providerRank;
		}
		return right.providerVersion.localeCompare(left.providerVersion);
	});
};

export const appendCertificationAuditEvent = (
	state: CertificationRegistryState,
	input: {
		occurredAt: string;
		actorId: string;
		action: CertificationAuditAction;
		providerId: string;
		providerVersion: string;
		status: "pending" | "certified" | "rejected" | "revoked";
		reason?: string;
	},
): { state: CertificationRegistryState; event: CertificationAuditEvent } => {
	const event: CertificationAuditEvent = {
		sequence: state.auditLog.length + 1,
		...input,
	};
	return {
		event,
		state: {
			...state,
			auditLog: [...state.auditLog, event],
		},
	};
};

export const replaceCertificationRecord = (
	state: CertificationRegistryState,
	recordIndex: number,
	record: CertificationRecord,
): CertificationRegistryState => {
	const records = [...state.records];
	records[recordIndex] = record;
	return {
		...state,
		records: sortCertificationRecords(records),
	};
};
