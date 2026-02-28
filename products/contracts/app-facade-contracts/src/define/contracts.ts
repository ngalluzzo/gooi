/**
 * Canonical boundary contract API.
 */
import * as define from "./define";

export type {
	AppDefinition,
	AppFacadeDiagnostic,
	DefineAppFailure,
	DefineAppInput,
	DefineAppResult,
	DefineAppSuccess,
} from "./define";

export const defineContracts = Object.freeze({
	appFacadeDiagnosticCodeSchema: define.appFacadeDiagnosticCodeSchema,
	appFacadeDiagnosticSchema: define.appFacadeDiagnosticSchema,
	defineAppInputSchema: define.defineAppInputSchema,
	appDefinitionSchema: define.appDefinitionSchema,
	parseDefineAppInput: define.parseDefineAppInput,
	parseAppDefinition: define.parseAppDefinition,
	parseGooiAppSpec: define.parseGooiAppSpec,
});
