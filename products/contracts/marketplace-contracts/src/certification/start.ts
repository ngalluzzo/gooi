import { createCertificationError } from "./errors";
import { startCertificationInputSchema } from "./model";
import {
	canTransitionCertification,
	findCertificationRecordIndex,
} from "./policy";
import type { CertificationMutationResult } from "./result";
import {
	appendCertificationAuditEvent,
	listingExists,
	replaceCertificationRecord,
	sortCertificationRecords,
} from "./shared";

export const startCertification = (
	value: unknown,
): CertificationMutationResult => {
	const parsedInput = startCertificationInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_schema_error",
				"Start certification input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}
	const {
		listingState,
		certificationState,
		actorId,
		occurredAt,
		providerId,
		providerVersion,
		profileId,
	} = parsedInput.data;
	if (!listingExists(listingState, providerId, providerVersion)) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_not_found_error",
				"Listing release was not found for certification workflow.",
			),
		};
	}

	const recordIndex = findCertificationRecordIndex(
		certificationState.records,
		providerId,
		providerVersion,
	);
	const existing =
		recordIndex === -1 ? undefined : certificationState.records[recordIndex];
	if (existing !== undefined && existing.status === "pending") {
		return { ok: true, state: certificationState, record: existing };
	}
	if (
		existing !== undefined &&
		!canTransitionCertification(existing.status, "pending")
	) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_transition_error",
				"Transition to pending is not allowed from current certification status.",
			),
		};
	}

	const record = {
		providerId,
		providerVersion,
		status: "pending" as const,
		profileId,
		evidence: existing?.evidence ?? [],
		...(existing?.trustDecision === undefined
			? {}
			: { trustDecision: existing.trustDecision }),
		updatedAt: occurredAt,
		updatedBy: actorId,
		transitionCount: (existing?.transitionCount ?? 0) + 1,
	};
	const nextState =
		existing === undefined
			? {
					...certificationState,
					records: sortCertificationRecords([
						...certificationState.records,
						record,
					]),
				}
			: replaceCertificationRecord(certificationState, recordIndex, record);
	const withAudit = appendCertificationAuditEvent(nextState, {
		occurredAt,
		actorId,
		action: "start",
		providerId,
		providerVersion,
		status: "pending",
	});
	return {
		ok: true,
		state: withAudit.state,
		record,
		auditEvent: withAudit.event,
	};
};
