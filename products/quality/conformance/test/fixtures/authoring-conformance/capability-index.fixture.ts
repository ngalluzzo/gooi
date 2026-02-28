import { buildCapabilityIndexSnapshot } from "@gooi/capability-index";
import type { BuildCapabilityIndexSnapshotInput } from "@gooi/capability-index/contracts";

const capabilityIndexInput: BuildCapabilityIndexSnapshotInput = {
	sourceHash: "1".repeat(64),
	catalogIdentity: {
		catalogSource: "demo-catalog",
		catalogVersion: "2026-02-26",
		catalogHash: "2".repeat(64),
	},
	localCapabilities: [
		{
			capabilityId: "message.is_allowed",
			capabilityVersion: "1.0.0",
			declaredEffects: ["read"],
			ioSchemaRefs: {
				inputSchemaRef: "schema://local/message.is_allowed/input",
				outputSchemaRef: "schema://local/message.is_allowed/output",
				errorSchemaRef: "schema://local/message.is_allowed/error",
			},
			deprecation: { isDeprecated: false },
			examples: { input: { userId: "u_1" }, output: { allowed: true } },
			providerAvailability: [],
			certificationState: "uncertified",
			trustTier: "unknown",
			lastVerifiedAt: null,
		},
	],
	catalogCapabilities: [
		{
			capabilityId: "gooi-marketplace-bun-sqlite.insert_message",
			capabilityVersion: "1.0.0",
			declaredEffects: ["write", "emit"],
			ioSchemaRefs: {
				inputSchemaRef: "schema://catalog/sqlite.insert_message/input",
				outputSchemaRef: "schema://catalog/sqlite.insert_message/output",
				errorSchemaRef: "schema://catalog/sqlite.insert_message/error",
			},
			deprecation: { isDeprecated: false },
			examples: { input: { message: "hello" }, output: { id: "m_1" } },
			providerAvailability: [
				{
					providerId: "gooi-marketplace-bun-sqlite",
					providerVersion: "1.0.0",
					status: "available",
				},
			],
			certificationState: "certified",
			trustTier: "trusted",
			lastVerifiedAt: "2026-02-26T00:00:00.000Z",
		},
	],
};

export const capabilityIndexSnapshot =
	buildCapabilityIndexSnapshot(capabilityIndexInput);
