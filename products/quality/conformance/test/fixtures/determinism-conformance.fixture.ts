import type { RunDeterminismConformanceInput } from "../../src/determinism-conformance/contracts";

export const createDeterminismConformanceFixture =
	(): RunDeterminismConformanceInput => ({
		artifactCases: [
			{
				id: "compiled_bundle",
				run: () => ({
					artifactHash: "abc123",
					version: "1.0.0",
				}),
			},
		],
		envelopeCases: [
			{
				id: "runtime_envelope",
				run: () => ({
					ok: true,
					output: { id: "entrypoint.list" },
					emittedSignals: [],
				}),
			},
		],
		iterations: 3,
	});

export const createDeterminismConformanceMismatchFixture =
	(): RunDeterminismConformanceInput => {
		let artifactRun = 0;
		let envelopeRun = 0;
		return {
			artifactCases: [
				{
					id: "compiled_bundle",
					run: () => {
						artifactRun += 1;
						return {
							artifactHash: artifactRun === 1 ? "abc123" : "def456",
						};
					},
				},
			],
			envelopeCases: [
				{
					id: "runtime_envelope",
					run: () => {
						envelopeRun += 1;
						return {
							ok: true,
							output: { nonce: envelopeRun },
						};
					},
				},
			],
			iterations: 3,
		};
	};
