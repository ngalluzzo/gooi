import { describe, expect, test } from "bun:test";

import {
	computeAuthoringLockfileArtifactHash,
	createAuthoringLockfile,
	parseAuthoringLockfile,
} from "../src/lockfile/authoring-lockfile";
import { authoringLockfileContentFixture } from "./fixtures/authoring-contracts.fixture";
import goldenLockfile from "./fixtures/authoring-lockfile.golden.json";

describe("authoring lockfile", () => {
	test("creates lockfile with deterministic artifact hash", () => {
		const created = createAuthoringLockfile(authoringLockfileContentFixture);
		expect(created).toEqual(parseAuthoringLockfile(goldenLockfile));
	});

	test("validates lockfile artifact hash integrity", () => {
		const parsed = parseAuthoringLockfile(goldenLockfile);
		expect(parsed.artifactHash).toBe(goldenLockfile.artifactHash);
	});

	test("rejects lockfile when artifact hash does not match content", () => {
		const invalid = {
			...goldenLockfile,
			artifactHash: "0".repeat(64),
		};

		expect(() => parseAuthoringLockfile(invalid)).toThrow(
			"Authoring lockfile artifactHash does not match normalized lockfile content.",
		);
	});

	test("computes stable hash for parsed content", () => {
		const parsed = parseAuthoringLockfile(goldenLockfile);
		const { artifactHash, ...content } = parsed;
		expect(computeAuthoringLockfileArtifactHash(content)).toBe(artifactHash);
	});
});
