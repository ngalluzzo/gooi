import {
	type DefineAppInput,
	type DefineAppResult,
	defineContracts,
} from "@gooi/app-facade-contracts/define";
import { specContracts } from "@gooi/app-spec-contracts/spec";
import { toFacadeDiagnostics } from "../shared/diagnostics";

const { defineAppInputSchema } = defineContracts;
const { gooiAppSpecSchema, parseGooiAppSpec } = specContracts;

export const defineApp = (input: DefineAppInput): DefineAppResult => {
	const parsedInput = defineAppInputSchema.safeParse(input);
	if (!parsedInput.success) {
		return {
			ok: false,
			diagnostics: toFacadeDiagnostics(parsedInput.error.issues, {
				code: "facade_input_error",
				rootPath: "input",
			}),
		};
	}

	const parsedSpec = gooiAppSpecSchema.safeParse(parsedInput.data.spec);
	if (!parsedSpec.success) {
		return {
			ok: false,
			diagnostics: toFacadeDiagnostics(parsedSpec.error.issues, {
				code: "facade_input_error",
				rootPath: "spec",
			}),
		};
	}

	return {
		ok: true,
		definition: {
			spec: parseGooiAppSpec(parsedSpec.data),
		},
	};
};
