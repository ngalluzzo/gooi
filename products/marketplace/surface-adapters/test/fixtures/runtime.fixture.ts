import type { AppRuntime } from "@gooi/app-runtime-facade-contracts/create";

const invokeResultFixture = {
	envelopeVersion: "1.0.0",
	traceId: "trace_1",
	invocationId: "invocation_1",
	ok: true,
	output: { ids: ["m_1"] },
	emittedSignals: [],
	observedEffects: [],
	timings: {
		startedAt: "2026-03-01T00:00:00.000Z",
		completedAt: "2026-03-01T00:00:00.001Z",
		durationMs: 1,
	},
	meta: {
		replayed: false,
		artifactHash: "artifact_hash",
		affectedQueryIds: [],
		refreshTriggers: [],
	},
} as const;

export const createRuntimeStubFixture = () => {
	const invocations: unknown[] = [];
	const runtime = {
		invoke: async (input: unknown) => {
			invocations.push(input);
			return invokeResultFixture;
		},
		describeReachability: () => {
			throw new Error("not used in surface adapter tests");
		},
	} as unknown as AppRuntime;
	return { runtime, invocations };
};
