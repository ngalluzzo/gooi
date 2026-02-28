/**
 * Canonical boundary contract API.
 */
import * as identity from "./identity";

export type {
	CreateHostIdentityProviderInput,
	CreateSystemIdentityPortInput,
	HostIdentityPort,
	HostIdentityProvider,
	HostIdentityProviderManifest,
} from "./identity";

export const identityContracts = Object.freeze({
	createHostIdentityProvider: identity.createHostIdentityProvider,
	createSystemIdentityPort: identity.createSystemIdentityPort,
});
