import { getRuntimeReachability } from "@gooi/app-runtime/reachability";
import type {
	AppRuntimeBindingPlan,
	AppRuntimeReachabilityQuery,
} from "@gooi/app-runtime-facade-contracts/reachability";
import type { CompiledEntrypointBundle } from "@gooi/app-spec-contracts/compiled";
import type { CliCommand } from "../../shared/command";
import { CliError } from "../../shared/errors";
import { createCliRuntime } from "../../shared/runtime";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null;

const readRuntimeReachabilityInput = (
	value: unknown,
): {
	readonly bundle: CompiledEntrypointBundle;
	readonly query: AppRuntimeReachabilityQuery;
	readonly bindingPlan?: AppRuntimeBindingPlan;
	readonly now?: string;
} => {
	if (!isRecord(value)) {
		throw new CliError({
			code: "input_validation_error",
			message: "Runtime reachability input must be an object.",
		});
	}
	if (!isRecord(value.query)) {
		throw new CliError({
			code: "input_validation_error",
			message: "Runtime reachability input requires `query` object.",
		});
	}
	if (!isRecord(value.bundle)) {
		throw new CliError({
			code: "input_validation_error",
			message: "Runtime reachability input requires `bundle` object.",
		});
	}
	return {
		bundle: value.bundle as unknown as CompiledEntrypointBundle,
		query: value.query as unknown as AppRuntimeReachabilityQuery,
		...(isRecord(value.bindingPlan)
			? { bindingPlan: value.bindingPlan as unknown as AppRuntimeBindingPlan }
			: {}),
		...(typeof value.now === "string" ? { now: value.now } : {}),
	};
};

export const runtimeReachabilityCommand: CliCommand = {
	id: "runtime reachability",
	summary: "Evaluate runtime reachability for one capability port requirement.",
	run: async (context) => {
		const input = readRuntimeReachabilityInput(await context.readJsonInput());
		const runtime = createCliRuntime({
			bundle: input.bundle,
			...(input.bindingPlan === undefined
				? {}
				: { bindingPlan: input.bindingPlan }),
			...(input.now === undefined ? {} : { now: input.now }),
		});
		return getRuntimeReachability({
			runtime,
			query: input.query,
		});
	},
};
