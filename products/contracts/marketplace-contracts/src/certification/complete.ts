import { createCertificationError } from "./errors";
import {
	type CertificationRecord,
	completeCertificationInputSchema,
} from "./model";
import {
	canTransitionCertification,
	findCertificationRecordIndex,
	missingRequiredEvidenceKinds,
	sortCertificationEvidence,
} from "./policy";
import type { CertificationMutationResult } from "./result";
import {
	appendCertificationAuditEvent,
	listingExists,
	replaceCertificationRecord,
} from "./shared";

export const completeCertification = (
	value: unknown,
): CertificationMutationResult => {
	const parsedInput = completeCertificationInputSchema.safeParse(value);
	if (!parsedInput.success) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_schema_error",
				"Complete certification input failed schema validation.",
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
		policy,
		evidence,
		report,
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
	if (recordIndex === -1) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_not_found_error",
				"Certification record was not found. Start certification first.",
			),
		};
	}
	const existing = certificationState.records[recordIndex];
	if (existing === undefined) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_not_found_error",
				"Certification record was not found. Start certification first.",
			),
		};
	}
	const nextStatus: "certified" | "rejected" =
		report.outcome === "pass" ? "certified" : "rejected";
	if (!canTransitionCertification(existing.status, nextStatus)) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_transition_error",
				"Certification completion transition is not allowed from current status.",
			),
		};
	}
	if (policy.profileId !== report.profileId) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_policy_error",
				"Certification report profile must match policy profile.",
			),
		};
	}
	if (missingRequiredEvidenceKinds(policy, evidence).length > 0) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_policy_error",
				"Certification evidence is missing required policy evidence kinds.",
			),
		};
	}
	if (report.outcome === "fail" && report.failures.length === 0) {
		return {
			ok: false,
			error: createCertificationError(
				"certification_policy_error",
				"Failed certification report must include typed failure diagnostics.",
			),
		};
	}

	const record: CertificationRecord = {
		...existing,
		status: nextStatus,
		profileId: policy.profileId,
		evidence: sortCertificationEvidence(evidence),
		report,
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
		action: "complete",
		providerId,
		providerVersion,
		status: nextStatus,
	});
	return {
		ok: true,
		state: withAudit.state,
		record,
		auditEvent: withAudit.event,
	};
};
