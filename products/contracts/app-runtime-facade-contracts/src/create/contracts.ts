/**
 * Canonical boundary contract API.
 */
import * as create from "./create";

export type {
	AppRuntime,
	AppRuntimeEntrypointKind,
	AppRuntimeInvocationMeasurement,
	AppRuntimeInvokeInput,
	CreateAppRuntimeInput,
} from "./create";

export const createContracts = Object.freeze({
	appRuntimeEntrypointKindSchema: create.appRuntimeEntrypointKindSchema,
	appRuntimeInvokeInputSchema: create.appRuntimeInvokeInputSchema,
	parseAppRuntimeInvokeInput: create.parseAppRuntimeInvokeInput,
	parsePrincipalContext: create.parsePrincipalContext,
});
