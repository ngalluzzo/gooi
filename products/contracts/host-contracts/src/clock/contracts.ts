/**
 * Canonical boundary contract API.
 */
import * as clock from "./clock";

export type {
	CreateHostClockProviderInput,
	HostClockPort,
	HostClockProvider,
	HostClockProviderManifest,
} from "./clock";

export const clockContracts = Object.freeze({
	createHostClockProvider: clock.createHostClockProvider,
	createSystemClockPort: clock.createSystemClockPort,
});
