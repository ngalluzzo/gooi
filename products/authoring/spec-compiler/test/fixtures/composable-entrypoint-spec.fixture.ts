import { createComposableEntrypointSpecFixture as createComposableEntrypointSpecFixtureValue } from "./composable-entrypoint-base.fixture";
import {
	createAmbiguousReachabilityRequirementsFixture as createAmbiguousReachabilityRequirementsFixtureValue,
	createBindingFieldMismatchFixture as createBindingFieldMismatchFixtureValue,
	createInvalidReachabilityModeFixture as createInvalidReachabilityModeFixtureValue,
	createUnknownReachabilityCapabilityIdFixture as createUnknownReachabilityCapabilityIdFixtureValue,
	createUnknownReachabilityCapabilityVersionFixture as createUnknownReachabilityCapabilityVersionFixtureValue,
	createUnsupportedScalarSpecFixture as createUnsupportedScalarSpecFixtureValue,
} from "./composable-entrypoint-invalid.fixture";

export const createComposableEntrypointSpecFixture = () =>
	createComposableEntrypointSpecFixtureValue();

export const createUnsupportedScalarSpecFixture = () =>
	createUnsupportedScalarSpecFixtureValue();

export const createBindingFieldMismatchFixture = () =>
	createBindingFieldMismatchFixtureValue();

export const createAmbiguousReachabilityRequirementsFixture = () =>
	createAmbiguousReachabilityRequirementsFixtureValue();

export const createInvalidReachabilityModeFixture = () =>
	createInvalidReachabilityModeFixtureValue();

export const createUnknownReachabilityCapabilityIdFixture = () =>
	createUnknownReachabilityCapabilityIdFixtureValue();

export const createUnknownReachabilityCapabilityVersionFixture = () =>
	createUnknownReachabilityCapabilityVersionFixtureValue();
