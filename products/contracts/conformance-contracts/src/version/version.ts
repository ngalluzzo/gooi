import { z } from "zod";

export const conformanceContractVersionSchema = z.enum(["1.0.0"]);

export type ConformanceContractVersion = z.infer<
	typeof conformanceContractVersionSchema
>;

export const supportedConformanceContractVersions = Object.freeze(
	conformanceContractVersionSchema.options,
);

export const isConformanceContractVersionSupported = (
	value: string,
): value is ConformanceContractVersion =>
	supportedConformanceContractVersions.includes(
		value as ConformanceContractVersion,
	);

export const assertSupportedConformanceContractVersion = (
	value: string,
): ConformanceContractVersion => conformanceContractVersionSchema.parse(value);
