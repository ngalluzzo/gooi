import { describe, expect, test } from "bun:test";
import type { ProjectionSemanticExecutionResult } from "@gooi/kernel-contracts/projection-semantic";
import { envelopesContracts } from "@gooi/projection-contracts/envelopes";
import type { CompiledAggregateProjectionPlan } from "@gooi/projection-contracts/plans";
import { shapeProjectionQueryOutput } from "../src/projection/shape-query-output";

const aggregatePlan: CompiledAggregateProjectionPlan = {
	projectionId: "user_activity",
	strategy: "aggregate",
	sourceRef: {
		projectionId: "user_activity",
		path: "domain.projections.user_activity",
		strategy: "aggregate",
	},
	primary: { collectionId: "hello_messages", alias: "m" },
	joins: [],
	groupBy: [{ field: "m.user_id", as: "user_id" }],
	metrics: [{ metricId: "message_count", op: "count" }],
	sort: [{ field: "message_count", direction: "desc" }],
	pagination: {
		mode: "page",
		pageArg: "page",
		pageSizeArg: "page_size",
		defaultPage: 1,
		defaultPageSize: 20,
		maxPageSize: 100,
	},
};

describe("projection query output shaping", () => {
	test("shapes semantic success into canonical projection envelope", () => {
		const semanticResult: ProjectionSemanticExecutionResult = {
			ok: true,
			rows: [{ user_id: "u1", message_count: 2 }],
			pagination: {
				mode: "page",
				page: 1,
				pageSize: 20,
				totalRows: 1,
				totalPages: 1,
			},
		};

		const envelope = shapeProjectionQueryOutput({
			plan: aggregatePlan,
			artifactHash: "projection_artifact_hash",
			result: semanticResult,
		});

		expect(envelope).toEqual({
			envelopeVersion: envelopesContracts.projectionResultEnvelopeVersion,
			ok: true,
			rows: [{ user_id: "u1", message_count: 2 }],
			meta: {
				projectionId: "user_activity",
				strategy: "aggregate",
				artifactHash: "projection_artifact_hash",
				pagination: {
					mode: "page",
					page: 1,
					pageSize: 20,
					totalRows: 1,
					totalPages: 1,
				},
			},
		});
	});

	test("shapes semantic failure into canonical projection envelope", () => {
		const semanticResult: ProjectionSemanticExecutionResult = {
			ok: false,
			error: {
				code: "projection_plan_error",
				message: "Failed plan",
				sourceRef: aggregatePlan.sourceRef,
			},
		};

		const envelope = shapeProjectionQueryOutput({
			plan: aggregatePlan,
			artifactHash: "projection_artifact_hash",
			result: semanticResult,
		});

		expect(envelope).toEqual({
			envelopeVersion: envelopesContracts.projectionResultEnvelopeVersion,
			ok: false,
			error: {
				code: "projection_plan_error",
				message: "Failed plan",
				sourceRef: aggregatePlan.sourceRef,
			},
		});
	});
});
