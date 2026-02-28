import {
	type CompileAppInput,
	type CompileAppResult,
	compileContracts,
} from "@gooi/app-facade-contracts/compile";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import { toCompileDiagnostics } from "../shared/diagnostics";

const { compileAppInputSchema } = compileContracts;

export const compileApp = (input: CompileAppInput): CompileAppResult => {
	const parsedInput = compileAppInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return {
			ok: false,
			diagnostics: toCompileDiagnostics(parsedInput.error.issues, {
				code: "facade_configuration_error",
				rootPath: "input",
			}),
		};
	}
	return compileEntrypointBundle({
		spec: parsedInput.data.definition.spec,
		compilerVersion: parsedInput.data.compilerVersion,
	});
};
