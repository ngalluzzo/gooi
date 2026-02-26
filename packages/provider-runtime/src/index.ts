import {
	areBindingArtifactsAligned,
	type BindingPlan,
	type DeploymentLockfile,
	getCapabilityBinding,
	getLockedProvider,
} from "@gooi/binding-plan";
import {
	type CapabilityPortContract,
	type EffectKind,
	effectKindSchema,
	type ProviderManifest,
	parseProviderManifest,
} from "@gooi/contracts-capability";
import { z } from "zod";
import {
	createDefaultProviderRuntimeHostPorts,
	type ProviderRuntimeHostPorts,
} from "./host-ports";

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

/**
 * Runtime error categories for provider activation and invocation.
 */
export type RuntimeErrorKind =
	| "validation_error"
	| "compatibility_error"
	| "activation_error"
	| "invocation_error"
	| "timeout_error"
	| "effect_violation_error";

/**
 * Structured runtime error payload.
 */
export interface RuntimeError {
	/** Error category for deterministic handling. */
	readonly kind: RuntimeErrorKind;
	/** Human-readable message. */
	readonly message: string;
	/** Optional structured details for diagnostics. */
	readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Result type used by runtime functions.
 */
export type RuntimeResult<T> =
	| { readonly ok: true; readonly value: T }
	| { readonly ok: false; readonly error: RuntimeError };

/**
 * Principal context attached to capability calls.
 */
export interface PrincipalContext {
	/** Unique subject id for authenticated principal. */
	readonly subject: string;
	/** Effective principal roles. */
	readonly roles: readonly string[];
}

/**
 * Invocation context attached to capability calls.
 */
export interface InvocationContext {
	/** Invocation id unique within runtime scope. */
	readonly id: string;
	/** Trace id for distributed observability. */
	readonly traceId: string;
	/** Current timestamp in ISO-8601 format. */
	readonly now: string;
}

/**
 * Capability invocation envelope sent to provider instances.
 */
export interface CapabilityCall {
	/** Capability port id. */
	readonly portId: string;
	/** Capability port version. */
	readonly portVersion: string;
	/** Input payload validated by boundary contract. */
	readonly input: unknown;
	/** Principal context for authorization and tenancy policies. */
	readonly principal: PrincipalContext;
	/** Runtime invocation context. */
	readonly ctx: InvocationContext;
}

/**
 * Provider response envelope for one capability invocation.
 */
export interface CapabilityResult {
	/** True when invocation completed with output payload. */
	readonly ok: boolean;
	/** Output payload when `ok` is true. */
	readonly output?: unknown;
	/** Error payload when `ok` is false. */
	readonly error?: unknown;
	/** Runtime-observed side effects. */
	readonly observedEffects: readonly EffectKind[];
}

/**
 * Host activation context for provider modules.
 */
export interface ActivateContext {
	/** Host API version used for compatibility checks. */
	readonly hostApiVersion: string;
	/** Monotonic timestamp used for activation telemetry. */
	readonly activatedAt: string;
}

/**
 * Provider instance lifecycle contract.
 */
export interface ProviderInstance {
	/** Handles capability invocation envelopes. */
	readonly invoke: (call: CapabilityCall) => Promise<CapabilityResult>;
	/** Performs provider shutdown and cleanup. */
	readonly deactivate: () => Promise<void>;
}

/**
 * Provider module contract loaded via dynamic import.
 */
export interface ProviderModule {
	/** Static provider manifest used for compatibility checks. */
	readonly manifest: unknown;
	/** Activation entrypoint producing an invocation instance. */
	readonly activate: (context: ActivateContext) => Promise<ProviderInstance>;
}

/**
 * Activation arguments for provider runtime.
 */
export interface ActivateProviderInput {
	/** Untrusted provider module loaded from runtime. */
	readonly providerModule: ProviderModule;
	/** Host API version for compatibility checks. */
	readonly hostApiVersion: string;
	/** Capability contracts expected to be fulfilled by this activation. */
	readonly contracts: readonly CapabilityPortContract[];
	/** Optional resolved binding plan artifact for enforcement. */
	readonly bindingPlan?: BindingPlan;
	/** Optional lockfile artifact for deterministic provider resolution. */
	readonly lockfile?: DeploymentLockfile;
	/** Optional activation timestamp override. */
	readonly activatedAt?: string;
	/** Optional host ports for clock and activation policy behavior. */
	readonly hostPorts?: ProviderRuntimeHostPorts;
}

/**
 * Activated provider state tracked by runtime host.
 */
export interface ActivatedProvider {
	/** Parsed provider manifest. */
	readonly manifest: ProviderManifest;
	/** Runtime provider instance. */
	readonly instance: ProviderInstance;
	/** Capability contracts indexed by `portId@portVersion`. */
	readonly contracts: ReadonlyMap<string, CapabilityPortContract>;
}

const ok = <T>(value: T): RuntimeResult<T> => ({ ok: true, value });

const fail = (
	kind: RuntimeErrorKind,
	message: string,
	details?: Readonly<Record<string, unknown>>,
): RuntimeResult<never> => ({
	ok: false,
	error: details === undefined ? { kind, message } : { kind, message, details },
});

const capabilityKey = (portId: string, portVersion: string): string =>
	`${portId}@${portVersion}`;

const parseSemver = (
	version: string,
): RuntimeResult<{ major: number; minor: number; patch: number }> => {
	const parsed = semverSchema.safeParse(version);
	if (!parsed.success) {
		return fail("compatibility_error", "Invalid semver value.", { version });
	}

	const [majorText, minorText, patchText] = version.split(".");

	return ok({
		major: Number(majorText),
		minor: Number(minorText),
		patch: Number(patchText),
	});
};

const compareSemver = (left: string, right: string): RuntimeResult<number> => {
	const leftParsed = parseSemver(left);
	if (!leftParsed.ok) {
		return leftParsed;
	}

	const rightParsed = parseSemver(right);
	if (!rightParsed.ok) {
		return rightParsed;
	}

	if (leftParsed.value.major !== rightParsed.value.major) {
		return ok(leftParsed.value.major > rightParsed.value.major ? 1 : -1);
	}

	if (leftParsed.value.minor !== rightParsed.value.minor) {
		return ok(leftParsed.value.minor > rightParsed.value.minor ? 1 : -1);
	}

	if (leftParsed.value.patch !== rightParsed.value.patch) {
		return ok(leftParsed.value.patch > rightParsed.value.patch ? 1 : -1);
	}

	return ok(0);
};

const evaluateComparator = (
	comparator: string,
	version: string,
): RuntimeResult<boolean> => {
	const match = comparator.match(/^(>=|<=|>|<|=)?(\d+\.\d+\.\d+)$/);
	if (!match) {
		return fail("compatibility_error", "Unsupported comparator.", {
			comparator,
		});
	}

	const [, operatorText, expected] = match;
	const operator = operatorText ?? "=";
	if (expected === undefined) {
		return fail("compatibility_error", "Comparator is missing semver value.", {
			comparator,
		});
	}
	const compared = compareSemver(version, expected);
	if (!compared.ok) {
		return compared;
	}

	switch (operator) {
		case "=":
			return ok(compared.value === 0);
		case ">":
			return ok(compared.value > 0);
		case ">=":
			return ok(compared.value >= 0);
		case "<":
			return ok(compared.value < 0);
		case "<=":
			return ok(compared.value <= 0);
		default:
			return fail("compatibility_error", "Unsupported range operator.", {
				operator,
			});
	}
};

/**
 * Evaluates host API compatibility with a provider `hostApiRange` expression.
 *
 * Supports `*`, exact semver (`1.2.3`), caret ranges (`^1.2.3`), and space-
 * separated comparator chains (for example `>=1.0.0 <2.0.0`).
 *
 * @param hostApiRange - Provider-declared host API range.
 * @param hostApiVersion - Runtime host API version.
 * @returns Compatibility decision.
 *
 * @example
 * const compatible = isHostApiCompatible("^1.0.0", "1.2.3");
 */
export const isHostApiCompatible = (
	hostApiRange: string,
	hostApiVersion: string,
): RuntimeResult<boolean> => {
	if (hostApiRange === "*") {
		return ok(true);
	}

	if (hostApiRange.startsWith("^")) {
		const baseline = hostApiRange.slice(1);
		const baseParsed = parseSemver(baseline);
		if (!baseParsed.ok) {
			return baseParsed;
		}

		const versionParsed = parseSemver(hostApiVersion);
		if (!versionParsed.ok) {
			return versionParsed;
		}

		const notOlder = compareSemver(hostApiVersion, baseline);
		if (!notOlder.ok) {
			return notOlder;
		}

		return ok(
			versionParsed.value.major === baseParsed.value.major &&
				notOlder.value >= 0,
		);
	}

	if (semverSchema.safeParse(hostApiRange).success) {
		const compared = compareSemver(hostApiVersion, hostApiRange);
		if (!compared.ok) {
			return compared;
		}

		return ok(compared.value === 0);
	}

	const comparators = hostApiRange
		.split(/\s+/)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);

	if (comparators.length === 0) {
		return fail("compatibility_error", "Empty host API range is not allowed.");
	}

	for (const comparator of comparators) {
		const evaluated = evaluateComparator(comparator, hostApiVersion);
		if (!evaluated.ok) {
			return evaluated;
		}

		if (!evaluated.value) {
			return ok(false);
		}
	}

	return ok(true);
};

/**
 * Ensures all observed side effects were declared in the capability contract.
 *
 * @param declaredEffects - Declared effect set from capability contract.
 * @param observedEffects - Provider-observed effect set from invocation.
 * @returns Success when observed effects are a subset of declared effects.
 *
 * @example
 * const checked = ensureObservedEffectsDeclared(["write"], ["write"]);
 */
export const ensureObservedEffectsDeclared = (
	declaredEffects: readonly EffectKind[],
	observedEffects: readonly EffectKind[],
): RuntimeResult<void> => {
	const declared = new Set(declaredEffects);

	for (const effect of observedEffects) {
		if (!declared.has(effect)) {
			return fail("effect_violation_error", "Observed undeclared effect.", {
				effect,
			});
		}
	}

	return ok(undefined);
};

const validateBindingRequirements = (
	manifest: ProviderManifest,
	contracts: readonly CapabilityPortContract[],
	bindingPlan: BindingPlan,
	lockfile: DeploymentLockfile,
): RuntimeResult<void> => {
	if (!areBindingArtifactsAligned(bindingPlan, lockfile)) {
		return fail(
			"activation_error",
			"Binding plan and lockfile are not aligned for app/environment/host API.",
		);
	}

	const lockEntry = getLockedProvider(
		lockfile,
		manifest.providerId,
		manifest.providerVersion,
	);

	if (lockEntry === null) {
		return fail("activation_error", "Provider version not found in lockfile.", {
			providerId: manifest.providerId,
			providerVersion: manifest.providerVersion,
		});
	}

	for (const contract of contracts) {
		const binding = getCapabilityBinding(
			bindingPlan,
			contract.id,
			contract.version,
		);

		if (binding === null) {
			return fail("activation_error", "Missing capability binding in plan.", {
				portId: contract.id,
				portVersion: contract.version,
			});
		}

		if (binding.providerId !== manifest.providerId) {
			return fail(
				"activation_error",
				"Capability is bound to a different provider in binding plan.",
				{
					portId: contract.id,
					portVersion: contract.version,
					expectedProviderId: binding.providerId,
					actualProviderId: manifest.providerId,
				},
			);
		}

		const manifestCapability = manifest.capabilities.find(
			(capability) =>
				capability.portId === contract.id &&
				capability.portVersion === contract.version &&
				capability.contractHash === contract.artifacts.contractHash,
		);

		if (manifestCapability === undefined) {
			return fail(
				"activation_error",
				"Provider manifest missing required capability or contract hash mismatch.",
				{
					portId: contract.id,
					portVersion: contract.version,
				},
			);
		}

		const lockedCapability = lockEntry.capabilities.find(
			(capability) =>
				capability.portId === contract.id &&
				capability.portVersion === contract.version &&
				capability.contractHash === contract.artifacts.contractHash,
		);

		if (lockedCapability === undefined) {
			return fail(
				"activation_error",
				"Lockfile missing required capability hash for provider.",
				{
					portId: contract.id,
					portVersion: contract.version,
				},
			);
		}
	}

	return ok(undefined);
};

/**
 * Activates a provider module with compatibility and binding checks.
 *
 * @param input - Activation input.
 * @returns Activated provider state or typed runtime error.
 *
 * @example
 * const activated = await activateProvider({
 *   providerModule,
 *   hostApiVersion: "1.0.0",
 *   contracts: [contract],
 * });
 */
export const activateProvider = async (
	input: ActivateProviderInput,
): Promise<RuntimeResult<ActivatedProvider>> => {
	const hostPorts = input.hostPorts ?? createDefaultProviderRuntimeHostPorts();
	const parsedManifestResult = providerManifestSafeParse(
		input.providerModule.manifest,
	);
	if (!parsedManifestResult.ok) {
		return parsedManifestResult;
	}

	const manifest = parsedManifestResult.value;

	const compatibility = isHostApiCompatible(
		manifest.hostApiRange,
		input.hostApiVersion,
	);

	if (!compatibility.ok) {
		return compatibility;
	}

	if (!compatibility.value) {
		return fail(
			"compatibility_error",
			"Provider host API range is incompatible with runtime host API version.",
			{
				hostApiRange: manifest.hostApiRange,
				hostApiVersion: input.hostApiVersion,
			},
		);
	}

	if ((input.bindingPlan === undefined) !== (input.lockfile === undefined)) {
		return fail(
			"activation_error",
			"Binding plan and lockfile must be provided together.",
		);
	}

	if (input.bindingPlan && input.lockfile) {
		const alignment = hostPorts.activationPolicy.assertHostVersionAligned({
			runtimeHostApiVersion: input.hostApiVersion,
			bindingPlanHostApiVersion: input.bindingPlan.hostApiVersion,
			lockfileHostApiVersion: input.lockfile.hostApiVersion,
		});
		if (!alignment.ok) {
			return fail(
				"activation_error",
				alignment.error.message,
				alignment.error.details,
			);
		}

		const bindingValidation = validateBindingRequirements(
			manifest,
			input.contracts,
			input.bindingPlan,
			input.lockfile,
		);

		if (!bindingValidation.ok) {
			return bindingValidation;
		}
	}

	let instance: ProviderInstance;

	try {
		instance = await input.providerModule.activate({
			hostApiVersion: input.hostApiVersion,
			activatedAt: input.activatedAt ?? hostPorts.clock.nowIso(),
		});
	} catch (error) {
		return fail("activation_error", "Provider activation failed.", {
			cause: error instanceof Error ? error.message : String(error),
		});
	}

	if (
		typeof instance !== "object" ||
		instance === null ||
		typeof instance.invoke !== "function" ||
		typeof instance.deactivate !== "function"
	) {
		return fail(
			"activation_error",
			"Provider activation returned invalid instance.",
		);
	}

	const contracts = new Map<string, CapabilityPortContract>(
		input.contracts.map((contract) => [
			capabilityKey(contract.id, contract.version),
			contract,
		]),
	);

	return ok({
		manifest,
		instance,
		contracts,
	});
};

const providerManifestSafeParse = (
	manifest: unknown,
): RuntimeResult<ProviderManifest> => {
	try {
		return ok(parseProviderManifest(manifest));
	} catch (error) {
		return fail("validation_error", "Invalid provider manifest.", {
			cause: error instanceof Error ? error.message : String(error),
		});
	}
};

const capabilityResultSchema = z.object({
	ok: z.boolean(),
	output: z.unknown().optional(),
	error: z.unknown().optional(),
	observedEffects: z.array(effectKindSchema),
});

/**
 * Invokes a validated capability contract on an activated provider.
 *
 * @param activated - Activated provider state.
 * @param call - Invocation envelope.
 * @returns Parsed output or typed runtime error.
 *
 * @example
 * const result = await invokeCapability(activated, call);
 */
export const invokeCapability = async (
	activated: ActivatedProvider,
	call: CapabilityCall,
): Promise<RuntimeResult<CapabilityResult>> => {
	const contract = activated.contracts.get(
		capabilityKey(call.portId, call.portVersion),
	);

	if (contract === undefined) {
		return fail(
			"invocation_error",
			"No contract registered for capability call.",
			{
				portId: call.portId,
				portVersion: call.portVersion,
			},
		);
	}

	const inputValidation = contract.schemas.input.safeParse(call.input);
	if (!inputValidation.success) {
		return fail("validation_error", "Capability input validation failed.", {
			issues: inputValidation.error.issues,
		});
	}

	let rawResult: unknown;

	try {
		rawResult = await activated.instance.invoke({
			...call,
			input: inputValidation.data,
		});
	} catch (error) {
		return fail("invocation_error", "Provider invocation threw an exception.", {
			cause: error instanceof Error ? error.message : String(error),
		});
	}

	const resultValidation = capabilityResultSchema.safeParse(rawResult);
	if (!resultValidation.success) {
		return fail("validation_error", "Provider response envelope is invalid.", {
			issues: resultValidation.error.issues,
		});
	}

	const response = resultValidation.data;

	const effectCheck = ensureObservedEffectsDeclared(
		contract.declaredEffects,
		response.observedEffects,
	);

	if (!effectCheck.ok) {
		return effectCheck;
	}

	if (response.ok) {
		const outputValidation = contract.schemas.output.safeParse(response.output);
		if (!outputValidation.success) {
			return fail("validation_error", "Capability output validation failed.", {
				issues: outputValidation.error.issues,
			});
		}

		return ok({
			ok: true,
			output: outputValidation.data,
			observedEffects: response.observedEffects,
		});
	}

	const errorValidation = contract.schemas.error.safeParse(response.error);
	if (!errorValidation.success) {
		return fail(
			"validation_error",
			"Capability error payload validation failed.",
			{
				issues: errorValidation.error.issues,
			},
		);
	}

	return ok({
		ok: false,
		error: errorValidation.data,
		observedEffects: response.observedEffects,
	});
};

/**
 * Deactivates an activated provider instance.
 *
 * @param activated - Activated provider state.
 * @returns Success when provider deactivation completes.
 *
 * @example
 * await deactivateProvider(activated);
 */
export const deactivateProvider = async (
	activated: ActivatedProvider,
): Promise<RuntimeResult<void>> => {
	try {
		await activated.instance.deactivate();
		return ok(undefined);
	} catch (error) {
		return fail("activation_error", "Provider deactivation failed.", {
			cause: error instanceof Error ? error.message : String(error),
		});
	}
};
