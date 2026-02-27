import {
	createHostPrincipalPort,
	createHostPrincipalProvider,
	type HostPrincipalPort,
	type PrincipalContext,
	principalContextSchema,
} from "@gooi/host-contracts/principal";
import { hostFail, hostOk } from "@gooi/host-contracts/result";

/**
 * Creates an in-memory principal port with deterministic validation.
 */
export const createMemoryPrincipalPort =
	(): HostPrincipalPort<PrincipalContext> =>
		createHostPrincipalPort({
			validatePrincipal: (value) => {
				const parsed = principalContextSchema.safeParse(value);
				if (!parsed.success) {
					return hostFail(
						"principal_validation_error",
						"Invalid principal context.",
						{
							issues: parsed.error.issues,
						},
					);
				}
				return hostOk(parsed.data);
			},
		});

/**
 * Reference principal provider for marketplace contributor implementations.
 */
export const memoryPrincipalProvider = createHostPrincipalProvider({
	manifest: {
		providerId: "gooi.marketplace.memory",
		providerVersion: "1.0.0",
		hostApiRange: "^1.0.0",
	},
	createPort: createMemoryPrincipalPort,
});
