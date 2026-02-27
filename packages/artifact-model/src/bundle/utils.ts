import { zstdCompressSync, zstdDecompressSync } from "node:zlib";
import type { JsonValue } from "@gooi/contract-primitives/json";
import { sha256, stableStringify } from "@gooi/stable-json";
import type { PackagedAppBundle } from "./schema";

export const sortKeys = <T>(
	value: Readonly<Record<string, T>>,
): Readonly<Record<string, T>> =>
	Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
	);

export const compressPayload = (
	value: JsonValue | Readonly<object>,
): string => {
	const source = Buffer.from(stableStringify(value), "utf8");
	return zstdCompressSync(source).toString("base64");
};

export const decompressPayload = (value: string): JsonValue => {
	const decoded = Buffer.from(value, "base64");
	const uncompressed = zstdDecompressSync(decoded).toString("utf8");
	return JSON.parse(uncompressed) as JsonValue;
};

export const bundleHashInput = (
	bundle: Omit<PackagedAppBundle, "bundleHash">,
): string => sha256(stableStringify(bundle));
