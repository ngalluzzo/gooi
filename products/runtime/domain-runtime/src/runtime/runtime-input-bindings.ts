import type {
	CompiledDomainMutationPlan,
	CompiledDomainValueSource,
} from "@gooi/app-spec-contracts/compiled";

const resolvePath = (
	root: Readonly<Record<string, unknown>>,
	path: string,
): unknown => {
	if (path.length === 0) {
		return root;
	}
	const segments = path.split(".");
	let cursor: unknown = root;
	for (const segment of segments) {
		if (typeof cursor !== "object" || cursor === null) {
			return undefined;
		}
		cursor = (cursor as Readonly<Record<string, unknown>>)[segment];
	}
	return cursor;
};

const resolveValueSource = (input: {
	readonly source: CompiledDomainValueSource;
	readonly payload: Readonly<Record<string, unknown>>;
}): unknown =>
	input.source.kind === "input"
		? resolvePath(input.payload, input.source.path)
		: input.source.value;

export const applyMutationInputBindings = (input: {
	readonly payload: Readonly<Record<string, unknown>>;
	readonly mutationPlan: CompiledDomainMutationPlan;
}): Readonly<Record<string, unknown>> => {
	const bindings = input.mutationPlan.inputBindings;
	if (Object.keys(bindings).length === 0) {
		return input.payload;
	}
	const resolved: Record<string, unknown> = {};
	for (const [fieldId, source] of Object.entries(bindings).sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		resolved[fieldId] = resolveValueSource({
			source,
			payload: input.payload,
		});
	}
	return resolved;
};
