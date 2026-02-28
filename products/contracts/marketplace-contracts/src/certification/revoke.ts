import { createCertificationError } from "./errors";
import { revokeCertificationInputSchema } from "./model";
import {
	canTransitionCertification,
	findCertificationRecordIndex,
} from "./policy";
import type { CertificationMutationResult } from "./result";
import {
	appendCertificationAuditEvent,
	replaceCertificationRecord,
} from "./shared";

export const revokeCertification = (
	value: unknown,
): CertificationMutationResult => {
	const parsedInput = revokeCertificationInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_schema_error",
				"Revoke certification input failed schema validation.",
				parsedInput.error.issues,
			),
		};
	}
	const {
		certificationState,
		actorId,
		occurredAt,
		providerId,
		providerVersion,
		reason,
	} = parsedInput.data;
	const recordIndex = findCertificationRecordIndex(
		certificationState.records,
		providerId,
		providerVersion,
	);
	if (recordIndex === -1) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_not_found_error",
				"Certification record was not found for revocation.",
			),
		};
	}
	const existing = certificationState.records[recordIndex];
	if (existing === undefined) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_not_found_error",
				"Certification record was not found for revocation.",
			),
		};
	}
	if (!canTransitionCertification(existing.status, "revoked")) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_transition_error",
				"Transition to revoked is not allowed from current certification status.",
			),
		};
	}
	const record = {
		...existing,
		status: "revoked" as const,
		updatedAt: occurredAt,
		updatedBy: actorId,
		transitionCount: existing.transitionCount + 1,
	};
	const withRecord = replaceCertificationRecord(
		certificationState,
		recordIndex,
		record,
	);
	const withAudit = appendCertificationAuditEvent(withRecord, {
		occurredAt,
		actorId,
		action: "revoke",
		providerId,
		providerVersion,
		status: "revoked",
		reason,
	});
	return {
		ok: true,
		state: withAudit.state,
		record,
		auditEvent: withAudit.event,
	};
};
