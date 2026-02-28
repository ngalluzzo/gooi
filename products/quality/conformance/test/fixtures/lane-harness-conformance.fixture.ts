import type { RunLaneHarnessConformanceInput } from "../../src/lane-harness-conformance/contracts";

const hash = (char: string) => char.repeat(64);

const laneFixture = (
	laneId: "L0" | "L1" | "L2" | "L3",
): RunLaneHarnessConformanceInput["lanes"][number] => ({
	laneId,
	fixture: {
		contractVersion: "1.0.0",
		fixtureId: `lane-fixture-${laneId.toLowerCase()}`,
		laneId,
		fixtureHash: hash(
			laneId === "L0"
				? "a"
				: laneId === "L1"
					? "b"
					: laneId === "L2"
						? "c"
						: "d",
		),
		artifactHashes: {
			bundle: hash(
				laneId === "L0"
					? "1"
					: laneId === "L1"
						? "2"
						: laneId === "L2"
							? "3"
							: "4",
			),
		},
	},
	run: async () => ({
		passed: true,
		checks: [
			{
				id: "semantic_parity",
				passed: true,
				detail: `${laneId} semantic parity passed`,
			},
			{
				id: "typed_envelope",
				passed: true,
				detail: `${laneId} typed envelope passed`,
			},
		],
	}),
});

export const createLaneHarnessFixture = (): RunLaneHarnessConformanceInput => ({
	lanes: [
		laneFixture("L0"),
		laneFixture("L1"),
		laneFixture("L2"),
		laneFixture("L3"),
	],
});

export const createLaneHarnessMissingLaneFixture =
	(): RunLaneHarnessConformanceInput => ({
		lanes: [laneFixture("L0"), laneFixture("L1"), laneFixture("L2")],
	});
