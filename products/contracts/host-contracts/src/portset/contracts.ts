/**
 * Canonical boundary contract API.
 */
import * as portset from "./portset";

export type {
	HostPortContractIssue,
	HostPortSet,
	HostPortSetInput,
	HostPortSetValidationDetails,
} from "./portset";

export const portsetContracts = Object.freeze({
	HostPortSetValidationError: portset.HostPortSetValidationError,
	getMissingHostPortSetMembers: portset.getMissingHostPortSetMembers,
	parseHostPortSet: portset.parseHostPortSet,
});
