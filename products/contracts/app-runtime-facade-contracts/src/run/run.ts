import type { ResultEnvelope } from "@gooi/surface-contracts/envelope";
import type { AppRuntime, AppRuntimeInvokeInput } from "../create/create";

export interface RunAppInput {
	readonly runtime: AppRuntime;
	readonly input: AppRuntimeInvokeInput;
}

export type RunAppResult = Promise<ResultEnvelope<unknown, unknown>>;
