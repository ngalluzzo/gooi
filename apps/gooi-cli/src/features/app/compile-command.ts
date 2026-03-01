import { compileApp } from "@gooi/app/compile";
import { defineApp } from "@gooi/app/define";
import type { CliCommand } from "../../shared/command";
import { getOptionString } from "../../shared/command";
import { readSpecInput } from "../../shared/spec-file";

export const appCompileCommand: CliCommand = {
	id: "app compile",
	summary: "Compile a Gooi app spec into canonical runtime artifacts.",
	run: async (context) => {
		const compilerVersion =
			getOptionString(context.options, "compiler-version") ?? "gooi-cli-0.1.0";
		const spec = await readSpecInput(context);
		const definition = defineApp({ spec });
		if (!definition.ok) {
			return definition;
		}
		return compileApp({
			definition: definition.definition,
			compilerVersion,
		});
	},
};
