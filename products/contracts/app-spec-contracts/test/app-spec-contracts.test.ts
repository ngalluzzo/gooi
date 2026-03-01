import { describe, expect, test } from "bun:test";
import { parseCompiledSectionSnapshot } from "../src/compiled/compiled";
import { parseSpecDiagnostic } from "../src/diagnostics/diagnostics";
import { parseGooiAppSpec } from "../src/spec/spec";

describe("app-spec-contracts scaffold", () => {
	test("parses app spec", () => {
		const parsed = parseGooiAppSpec({
			app: { id: "demo", name: "Demo", tz: "UTC" },
			domain: {
				capabilities: {
					"message.is_allowed": {
						in: { message: "text!" },
						out: { allowed: "bool!" },
						do: [],
						return: { allowed: { $expr: { var: "allowed" } } },
					},
				},
			},
			session: { fields: {} },
			views: {
				nodes: [
					{
						id: "message_input",
						type: "field.input.text",
						props: { label: "Message" },
						children: [],
					},
				],
				screens: [
					{
						id: "home",
						data: {
							messages: {
								query: "list_messages",
								args: { page: 1 },
								refresh_on_signals: ["message.created"],
							},
						},
						root_nodes: ["message_input"],
					},
				],
			},
			queries: [],
			mutations: [],
			routes: [],
			personas: {},
			scenarios: {},
			wiring: { surfaces: {} },
			access: { default_policy: "deny", roles: {} },
		});
		expect(parsed.app.id).toBe("demo");
		expect(parsed.domain.capabilities?.["message.is_allowed"]?.in).toEqual({
			message: "text!",
		});
		expect(parsed.views.screens[0]?.root_nodes).toEqual(["message_input"]);
	});

	test("parses compiled section snapshot", () => {
		const parsed = parseCompiledSectionSnapshot({
			artifactVersion: "1.0.0",
			sections: { app: { id: "demo" } },
		});
		expect(parsed.artifactVersion).toBe("1.0.0");
	});

	test("parses diagnostic", () => {
		const parsed = parseSpecDiagnostic({
			severity: "error",
			code: "spec_error",
			path: "app.id",
			message: "invalid",
		});
		expect(parsed.severity).toBe("error");
	});
});
