import type {
	CompiledScenarioCaptureBinding,
	CompiledScenarioPlan,
} from "@gooi/scenario-contracts/plans";
import { readPathValue } from "../shared/path";
import type { RuntimeState } from "./contracts";

const resolveCaptureValue = (input: {
	readonly binding: CompiledScenarioCaptureBinding;
	readonly state: RuntimeState;
	readonly context: CompiledScenarioPlan["context"];
}): unknown => {
	if (input.binding.source === "context") {
		return readPathValue(
			input.context as Readonly<Record<string, unknown>>,
			input.binding.path,
		);
	}
	if (input.binding.source === "last_trigger_output") {
		return readPathValue(
			(input.state.lastTrigger?.output ?? {}) as Readonly<
				Record<string, unknown>
			>,
			input.binding.path,
		);
	}
	if (input.binding.source === "last_signal_payload") {
		const signal = input.state.emittedSignals.at(-1);
		return readPathValue(signal?.payload ?? {}, input.binding.path);
	}
	return readPathValue(
		(input.state.lastExpectation ?? {}) as Readonly<Record<string, unknown>>,
		input.binding.path,
	);
};

export const applyCaptureBindings = (input: {
	readonly bindings: readonly CompiledScenarioCaptureBinding[];
	readonly state: RuntimeState;
	readonly context: CompiledScenarioPlan["context"];
}):
	| { readonly ok: true }
	| { readonly ok: false; readonly captureId: string } => {
	for (const binding of input.bindings) {
		const value = resolveCaptureValue({
			binding,
			state: input.state,
			context: input.context,
		});
		if (value === undefined) {
			return { ok: false, captureId: binding.captureId };
		}
		input.state.captures[binding.captureId] = value;
	}
	return { ok: true };
};
