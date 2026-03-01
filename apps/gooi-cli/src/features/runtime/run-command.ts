import { runApp } from "@gooi/app-runtime/run";
import { createContracts } from "@gooi/app-runtime-facade-contracts/create";
import type { AppRuntimeBindingPlan } from "@gooi/app-runtime-facade-contracts/reachability";
import type { CompiledEntrypointBundle } from "@gooi/app-spec-contracts/compiled";
import type { CliCommand } from "../../shared/command";
import { CliError } from "../../shared/errors";
import { createCliRuntime } from "../../shared/runtime";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

const readRuntimeRunInput = (
	value: unknown,
): {
	readonly bundle: CompiledEntrypointBundle;
	readonly invocation: unknown;
	readonly bindingPlan?: AppRuntimeBindingPlan;
	readonly replayTtlSeconds?: number;
	readonly now?: string;
} => {
	if (!isRecord(value)) {
		throw new CliError({
			code: "input_validation_error",
			message: "Runtime run input must be an object.",
		});
	}
	if (!isRecord(value.bundle)) {
		throw new CliError({
			code: "input_validation_error",
			message: "Runtime run input requires `bundle` object.",
		});
	}
	if (!isRecord(value.invocation)) {
		throw new CliError({
			code: "input_validation_error",
			message: "Runtime run input requires `invocation` object.",
		});
	}
	return {
		bundle: value.bundle as unknown as CompiledEntrypointBundle,
		invocation: value.invocation,
		...(isRecord(value.bindingPlan)
			? { bindingPlan: value.bindingPlan as unknown as AppRuntimeBindingPlan }
			: {}),
		...(typeof value.replayTtlSeconds === "number"
			? { replayTtlSeconds: value.replayTtlSeconds }
			: {}),
		...(typeof value.now === "string" ? { now: value.now } : {}),
	};
};

export const runtimeRunCommand: CliCommand = {
	id: "runtime run",
	summary:
		"Run one query or mutation through app-runtime and kernel orchestration.",
	run: async (context) => {
		const input = readRuntimeRunInput(await context.readJsonInput());
		const invocation = createContracts.parseAppRuntimeInvokeInput(
			input.invocation,
		);
		const runtime = createCliRuntime({
			bundle: input.bundle,
			...(input.bindingPlan === undefined
				? {}
				: { bindingPlan: input.bindingPlan }),
			...(input.replayTtlSeconds === undefined
				? {}
				: { replayTtlSeconds: input.replayTtlSeconds }),
			...(input.now === undefined ? {} : { now: input.now }),
		});
		return runApp({
			runtime,
			input: invocation,
		});
	},
};
