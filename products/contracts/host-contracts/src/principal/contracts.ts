/**
 * Canonical boundary contract API.
 */
import * as principal from "./principal";

export const { principalContextSchema } = principal;
export type {
	CreateHostPrincipalPortInput,
	CreateHostPrincipalProviderInput,
	HostPrincipalPort,
	HostPrincipalProvider,
	HostPrincipalProviderManifest,
	PrincipalContext,
} from "./principal";

export const principalContracts = Object.freeze({
	principalContextSchema: principal.principalContextSchema,
	createHostPrincipalPort: principal.createHostPrincipalPort,
	createHostPrincipalProvider: principal.createHostPrincipalProvider,
});
