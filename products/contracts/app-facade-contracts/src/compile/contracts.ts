/**
 * Canonical boundary contract API.
 */
import * as compile from "./compile";

export type {
	CompileAppFailure,
	CompileAppInput,
	CompileAppResult,
} from "./compile";

export const compileContracts = Object.freeze({
	compileAppInputSchema: compile.compileAppInputSchema,
	parseCompileAppInput: compile.parseCompileAppInput,
});
