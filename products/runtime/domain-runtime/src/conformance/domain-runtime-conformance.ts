import {
	createDomainRuntimeConformanceHarness as createDomainRuntimeConformanceHarnessImpl,
	type CreateDomainRuntimeInput as RuntimeCreateDomainRuntimeInput,
	type DomainRuntimeConformanceHarness as RuntimeDomainRuntimeConformanceHarness,
} from "../runtime/create-domain-runtime";

export type CreateDomainRuntimeInput = RuntimeCreateDomainRuntimeInput;
export type DomainRuntimeConformanceHarness =
	RuntimeDomainRuntimeConformanceHarness;

export const createDomainRuntimeConformanceHarness = (
	input: CreateDomainRuntimeInput,
): DomainRuntimeConformanceHarness =>
	createDomainRuntimeConformanceHarnessImpl(input);
