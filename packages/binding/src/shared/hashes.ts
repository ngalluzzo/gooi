import { z } from "zod";

export const hexHashPattern = /^[a-f0-9]{64}$/;

export const hexHashSchema = z.string().regex(hexHashPattern);

export const providerIntegrityPattern = /^sha256:[a-f0-9]{64}$/;

export const providerIntegritySchema = z
	.string()
	.regex(providerIntegrityPattern, {
		message: "Expected integrity in sha256:<64-hex> format.",
	});
