import { describe, expect, test } from "bun:test";
import { createContracts } from "../src/create/contracts";

describe("app-runtime-facade-contracts", () => {
	test("parses runtime invoke input", () => {
		const parsed = createContracts.parseAppRuntimeInvokeInput({
			surfaceId: "http",
			entrypointKind: "query",
			entrypointId: "list_messages",
			payload: { page: 1, page_size: 10 },
			principal: {
				subject: "user-1",
				claims: {},
				tags: [],
			},
		});
		expect(parsed.surfaceId).toBe("http");
		expect(parsed.entrypointKind).toBe("query");
	});
});
