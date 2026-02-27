import type { DomainRuntimePort } from "./domain";
import { createEntrypointRuntime } from "./execution/create-entrypoint-runtime";
import { runEntrypoint } from "./execution/run-entrypoint";
import { createDefaultHostPorts } from "./host";
import type { EntrypointKernelCallInput } from "./kernel";
import { invokeEntrypointViaKernel } from "./kernel";
import type {
	CreateEntrypointRuntimeInput,
	EntrypointRuntime,
	RunEntrypointCallInput,
	RunEntrypointInput,
} from "./types/types";

export {
	createEntrypointRuntime,
	createDefaultHostPorts,
	invokeEntrypointViaKernel,
	runEntrypoint,
};
export type {
	CreateEntrypointRuntimeInput,
	DomainRuntimePort,
	EntrypointRuntime,
	EntrypointKernelCallInput,
	RunEntrypointCallInput,
	RunEntrypointInput,
};
