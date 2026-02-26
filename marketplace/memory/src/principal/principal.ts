import {
	createHostPrincipalPort,
	createHostPrincipalProvider,
	type HostPrincipalPort,
	type PrincipalContext,
	principalContextSchema,
} from "@gooi/host-contracts/principal";
import { hostFail, hostOk } from "@gooi/host-contracts/result";

/**
 * Creates an in-memory principal port with deterministic role derivation.
 */
export const createMemoryPrincipalPort = <
	TAccessPlan = unknown,
>(): HostPrincipalPort<PrincipalContext, TAccessPlan> =>
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
		deriveRoles: ({ principal }) => {
			const roles = new Set(principal.tags);
			if (principal.subject === null) {
				roles.add("anonymous");
			} else {
				roles.add("authenticated");
			}
			return hostOk(
				[...roles].sort((left, right) => left.localeCompare(right)),
			);
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
