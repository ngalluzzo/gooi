import {
	type HostPrincipalPort,
	type PrincipalContext,
	principalContextSchema,
	principalContracts,
} from "@gooi/host-contracts/principal";
import { resultContracts } from "@gooi/host-contracts/result";

/**
 * Creates an in-memory principal port with deterministic validation.
 */
export const createMemoryPrincipalPort =
	(): HostPrincipalPort<PrincipalContext> =>
		principalContracts.createHostPrincipalPort({
			validatePrincipal: (value: unknown) => {
				const parsed = principalContextSchema.safeParse(value);
				if (!parsed.success) {
					return resultContracts.hostFail(
						"principal_validation_error",
						"Invalid principal context.",
						{
							issues: parsed.error.issues,
						},
					);
				}
				return resultContracts.hostOk(parsed.data);
			},
		});

/**
 * Reference principal provider for marketplace contributor implementations.
 */
export const memoryPrincipalProvider =
	principalContracts.createHostPrincipalProvider({
		manifest: {
			providerId: "gooi.marketplace.memory",
			providerVersion: "1.0.0",
			hostApiRange: "^1.0.0",
		},
		createPort: createMemoryPrincipalPort,
	});
