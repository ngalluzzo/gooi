import type {
	CompiledEntrypointKind,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";

export interface BindingRef {
	readonly surfaceId: string;
	readonly entrypointKind: CompiledEntrypointKind;
	readonly entrypointId: string;
}

const bindingKey = (binding: BindingRef): string =>
	`${binding.surfaceId}:${binding.entrypointKind}:${binding.entrypointId}`;

export const createBindingIndex = (
	bindings: Readonly<Record<string, CompiledSurfaceBinding>>,
): ReadonlyMap<string, CompiledSurfaceBinding> =>
	new Map(
		Object.values(bindings).map((binding) => [bindingKey(binding), binding]),
	);

export const resolveBinding = (
	index: ReadonlyMap<string, CompiledSurfaceBinding>,
	ref: BindingRef,
): CompiledSurfaceBinding | undefined => index.get(bindingKey(ref));

export const createMissingBindingFallback = (
	ref: BindingRef,
): CompiledSurfaceBinding => ({
	surfaceId: ref.surfaceId,
	entrypointKind: ref.entrypointKind,
	entrypointId: `__app_runtime_unbound__${ref.entrypointKind}__${ref.entrypointId}`,
	fieldBindings: {},
});
