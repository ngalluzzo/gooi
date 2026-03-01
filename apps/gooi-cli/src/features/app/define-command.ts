import { defineApp } from "@gooi/app/define";
import type { CliCommand } from "../../shared/command";
import { readSpecInput } from "../../shared/spec-file";

export const appDefineCommand: CliCommand = {
	id: "app define",
	summary: "Validate and normalize a Gooi app spec.",
	run: async (context) => {
		const spec = await readSpecInput(context);
		return defineApp({ spec });
	},
};
