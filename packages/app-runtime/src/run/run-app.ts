import type {
	RunAppInput,
	RunAppResult,
} from "@gooi/app-runtime-facade-contracts/run";

export const runApp = (input: RunAppInput): RunAppResult =>
	input.runtime.invoke(input.input);
