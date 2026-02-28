import type {
	TieredConformanceTierDefinition,
	TieredConformanceTierId,
} from "./contracts";
import { tieredConformanceStrategyVersion } from "./contracts";

export const tieredConformanceDefinitions: Readonly<
	Record<TieredConformanceTierId, TieredConformanceTierDefinition>
> = Object.freeze({
	smoke: {
		version: tieredConformanceStrategyVersion,
		tierId: "smoke",
		gateRole: "pull_request_gate",
		suites: [
			{
				suiteId: "determinism_gate",
				maxRuntimeMs: 90_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "entrypoint_conformance",
				maxRuntimeMs: 60_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "provider_conformance",
				maxRuntimeMs: 60_000,
				maxFlakyRate: 0,
				required: true,
			},
		],
	},
	full: {
		version: tieredConformanceStrategyVersion,
		tierId: "full",
		gateRole: "release_candidate_gate",
		suites: [
			{
				suiteId: "determinism_gate",
				maxRuntimeMs: 90_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "entrypoint_provider_host_replay",
				maxRuntimeMs: 120_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "projection_reachability",
				maxRuntimeMs: 120_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "dispatch_render_transport",
				maxRuntimeMs: 120_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "guard_scenario",
				maxRuntimeMs: 90_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "marketplace_control_plane",
				maxRuntimeMs: 90_000,
				maxFlakyRate: 0,
				required: true,
			},
		],
	},
	expanded: {
		version: tieredConformanceStrategyVersion,
		tierId: "expanded",
		gateRole: "pre_release_expansion",
		suites: [
			{
				suiteId: "determinism_gate",
				maxRuntimeMs: 90_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "entrypoint_provider_host_replay",
				maxRuntimeMs: 120_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "projection_reachability",
				maxRuntimeMs: 120_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "dispatch_render_transport",
				maxRuntimeMs: 120_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "guard_scenario",
				maxRuntimeMs: 90_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "marketplace_control_plane",
				maxRuntimeMs: 90_000,
				maxFlakyRate: 0,
				required: true,
			},
			{
				suiteId: "authoring_cross_client_lane_harness",
				maxRuntimeMs: 120_000,
				maxFlakyRate: 0,
				required: true,
			},
		],
	},
});

export const getTieredConformanceDefinition = (
	tierId: TieredConformanceTierId,
): TieredConformanceTierDefinition => tieredConformanceDefinitions[tierId];
