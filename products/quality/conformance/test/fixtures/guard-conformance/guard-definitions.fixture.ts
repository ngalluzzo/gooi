import type {
	CompiledGuardDefinition,
	CompiledInvariantDefinition,
} from "@gooi/guard-contracts/plans";
import { sha256, stableStringify } from "@gooi/stable-json";

export const collectionInvariant: CompiledInvariantDefinition = {
	sourceRef: {
		primitiveKind: "collection",
		primitiveId: "hello_messages",
		path: "domain.collections.hello_messages.invariants",
	},
	onFail: "abort",
	structural: [
		{
			guardId: "message_exists",
			description: "message exists",
			operator: "exists",
			left: { kind: "path", path: "message" },
		},
	],
};

export const actionGuard: CompiledGuardDefinition = {
	sourceRef: {
		primitiveKind: "action",
		primitiveId: "guestbook.submit",
		path: "domain.actions.guestbook.submit.guards",
	},
	onFail: "abort",
	structural: [
		{
			guardId: "message_non_empty",
			description: "message must not be empty",
			operator: "neq",
			left: { kind: "path", path: "input.message" },
			right: { kind: "literal", value: "" },
		},
	],
	semantic: [
		{
			guardId: "message_quality",
			description: "message quality",
			rule: "Message should read naturally.",
			confidence: "high",
			sampling: { production: 1, simulation: 1, ci: 1 },
		},
	],
};

export const signalGuard: CompiledGuardDefinition = {
	sourceRef: {
		primitiveKind: "signal",
		primitiveId: "message.rejected",
		path: "domain.signals.custom.message.rejected.guards",
	},
	onFail: "emit_violation",
	structural: [
		{
			guardId: "reason_present",
			description: "reason must be present",
			operator: "neq",
			left: { kind: "path", path: "payload.reason" },
			right: { kind: "literal", value: "" },
		},
	],
	semantic: [],
};

export const flowGuard: CompiledGuardDefinition = {
	sourceRef: {
		primitiveKind: "flow",
		primitiveId: "rejection_followup",
		path: "domain.flows.rejection_followup.guards",
	},
	onFail: "log_and_continue",
	structural: [
		{
			guardId: "log_step_ok",
			description: "log step should pass",
			operator: "eq",
			left: { kind: "path", path: "steps.notify.ok" },
			right: { kind: "literal", value: true },
		},
	],
	semantic: [],
};

export const projectionGuard: CompiledInvariantDefinition = {
	sourceRef: {
		primitiveKind: "projection",
		primitiveId: "messages_with_authors",
		path: "domain.projections.messages_with_authors.guards",
	},
	onFail: "log_and_continue",
	structural: [
		{
			guardId: "user_id_present",
			description: "user_id should be present",
			operator: "exists",
			left: { kind: "path", path: "row.user_id" },
		},
	],
};

export const createSignalPayloadHash = (
	payload: Readonly<Record<string, unknown>>,
) => sha256(stableStringify(payload));
