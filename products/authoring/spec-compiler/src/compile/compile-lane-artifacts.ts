import type {
	CanonicalSpecModel,
	CompiledAccessPlan,
	CompiledBindingRequirements,
	CompiledDomainRuntimeIR,
	CompiledEntrypoint,
	CompiledJsonSchemaArtifact,
	CompiledProjectionIR,
	CompiledRefreshSubscription,
	CompiledSessionIR,
	CompiledSurfaceBinding,
} from "@gooi/app-spec-contracts/compiled";
import {
	buildArtifactManifestFromArtifacts,
	buildLaneArtifact,
	type CompiledArtifactManifest,
	type CompiledLaneArtifact,
} from "@gooi/artifact-model/manifest";
import type { CompiledViewRenderIR } from "@gooi/render-contracts/ir";
import type { CompiledScenarioPlanSet } from "@gooi/scenario-contracts/plans";
import type { CompiledSurfaceDispatchPlanSet } from "@gooi/surface-contracts/dispatch";

interface CompileLaneArtifactsInput {
	readonly canonicalModel: CanonicalSpecModel;
	readonly entrypoints: Readonly<Record<string, CompiledEntrypoint>>;
	readonly bindings: Readonly<Record<string, CompiledSurfaceBinding>>;
	readonly dispatchPlans: CompiledSurfaceDispatchPlanSet;
	readonly refreshSubscriptions: Readonly<
		Record<string, CompiledRefreshSubscription>
	>;
	readonly accessPlan: CompiledAccessPlan;
	readonly schemaArtifacts: Readonly<
		Record<string, CompiledJsonSchemaArtifact>
	>;
	readonly bindingRequirementsArtifact: CompiledBindingRequirements;
	readonly projectionIR: CompiledProjectionIR;
	readonly viewRenderIR: CompiledViewRenderIR;
	readonly domainRuntimeIR: CompiledDomainRuntimeIR;
	readonly sessionIR: CompiledSessionIR;
	readonly scenarioIR: CompiledScenarioPlanSet;
}

interface CompileLaneArtifactsOutput {
	readonly laneArtifacts: Readonly<Record<string, CompiledLaneArtifact>>;
	readonly artifactManifest: CompiledArtifactManifest;
}

const sortByKey = <T>(
	value: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
	Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
	);

/**
 * Builds deterministic lane artifacts and canonical manifest references.
 */
export const compileLaneArtifacts = (
	input: CompileLaneArtifactsInput,
): CompileLaneArtifactsOutput => {
	const laneArtifacts = sortByKey({
		authoringCanonicalModel: buildLaneArtifact({
			artifactId: "CompiledAuthoringCanonicalModel",
			artifactVersion: "1.0.0",
			lane: "authoring",
			payload: {
				sections: input.canonicalModel.sections,
				references: input.canonicalModel.references,
			},
		}),
		runtimeEntrypointContracts: buildLaneArtifact({
			artifactId: "CompiledRuntimeEntrypointContracts",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: {
				entrypoints: input.entrypoints,
				bindings: input.bindings,
				dispatchPlans: input.dispatchPlans,
				refreshSubscriptions: input.refreshSubscriptions,
				accessPlan: input.accessPlan,
				schemaArtifacts: input.schemaArtifacts,
				projectionIR: input.projectionIR,
				viewRenderIR: input.viewRenderIR,
				domainRuntimeIR: input.domainRuntimeIR,
				sessionIR: input.sessionIR,
			},
		}),
		viewRenderIR: buildLaneArtifact({
			artifactId: "CompiledViewRenderIR",
			artifactVersion: "1.0.0",
			lane: "runtime",
			payload: input.viewRenderIR,
		}),
		projectionIR: buildLaneArtifact({
			artifactId: "CompiledProjectionIR",
			artifactVersion: input.projectionIR.artifactVersion,
			lane: "runtime",
			payload: input.projectionIR,
		}),
		domainRuntimeIR: buildLaneArtifact({
			artifactId: "CompiledDomainRuntimeIR",
			artifactVersion: input.domainRuntimeIR.artifactVersion,
			lane: "runtime",
			payload: input.domainRuntimeIR,
		}),
		sessionIR: buildLaneArtifact({
			artifactId: "CompiledSessionIR",
			artifactVersion: input.sessionIR.artifactVersion,
			lane: "runtime",
			payload: input.sessionIR,
		}),
		scenarioIR: buildLaneArtifact({
			artifactId: "CompiledScenarioPlanSet",
			artifactVersion: input.scenarioIR.artifactVersion,
			lane: "quality",
			payload: input.scenarioIR,
		}),
		qualityConformanceSeed: buildLaneArtifact({
			artifactId: "CompiledQualityConformanceSeed",
			artifactVersion: "1.0.0",
			lane: "quality",
			payload: {
				queryIds: input.canonicalModel.references.queryIds,
				mutationIds: input.canonicalModel.references.mutationIds,
				routeIds: input.canonicalModel.references.routeIds,
				screenIds: input.canonicalModel.references.screenIds,
				personaIds: input.canonicalModel.references.personaIds,
				scenarioIds: input.canonicalModel.references.scenarioIds,
			},
		}),
		bindingRequirements: buildLaneArtifact({
			artifactId: input.bindingRequirementsArtifact.artifactId,
			artifactVersion: input.bindingRequirementsArtifact.artifactVersion,
			lane: "marketplace",
			payload: input.bindingRequirementsArtifact,
		}),
	});

	const artifactManifest = buildArtifactManifestFromArtifacts({
		artifacts: laneArtifacts,
		compatibilityByArtifactKey: {
			bindingRequirements: {
				...input.bindingRequirementsArtifact.compatibility,
			},
		},
	});

	return {
		laneArtifacts,
		artifactManifest,
	};
};
