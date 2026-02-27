import { describe, expect, test } from "bun:test";
import { compileEntrypointBundle } from "@gooi/spec-compiler";
import type { DomainRuntimePort } from "../../src/domain";
import { runEntrypoint } from "../../src/engine";

const createCompiledMutationFixture = () => {
	const compiled = compileEntrypointBundle({
		compilerVersion: "1.0.0",
		spec: {
			app: {
				id: "surface_consistency_fixture_app",
				name: "Surface Consistency Fixture App",
				tz: "UTC",
			},
			domain: {
				actions: {
					"guestbook.submit": {},
				},
			},
			session: {
				fields: {},
			},
			access: {
				default_policy: "deny",
				roles: { authenticated: {} },
			},
			queries: [],
			mutations: [
				{
					id: "submit_message",
					access: { roles: ["authenticated"] },
					in: { message: "text!" },
					run: {
						actionId: "guestbook.submit",
						input: {
							message: {
								$expr: {
									var: "input.message",
								},
							},
						},
					},
				},
			],
			routes: [],
			personas: {},
			scenarios: {},
			wiring: {
				surfaces: {
					web: {
						mutations: {
							submit_message: {
								bind: { message: "body.message" },
							},
						},
					},
					http: {
						mutations: {
							submit_message: {
								bind: { message: "body.message" },
							},
						},
					},
					cli: {
						mutations: {
							submit_message: {
								bind: { message: "args.message" },
							},
						},
					},
				},
			},
			views: {
				nodes: [],
				screens: [],
			},
		},
	});
	if (!compiled.ok) {
		throw new Error(
			`Fixture compile failed: ${compiled.diagnostics.map((item) => item.code).join(",")}`,
		);
	}
	return {
		bundle: compiled.bundle,
		webBinding: compiled.bundle.bindings["web:mutation:submit_message"],
		httpBinding: compiled.bundle.bindings["http:mutation:submit_message"],
		cliBinding: compiled.bundle.bindings["cli:mutation:submit_message"],
	};
};

describe("entrypoint-runtime cross-surface consistency", () => {
	test("normalizes equivalent mutation inputs consistently across supported surfaces", async () => {
		const fixture = createCompiledMutationFixture();
		expect(fixture.webBinding).toBeDefined();
		expect(fixture.httpBinding).toBeDefined();
		expect(fixture.cliBinding).toBeDefined();
		if (
			fixture.webBinding === undefined ||
			fixture.httpBinding === undefined ||
			fixture.cliBinding === undefined
		) {
			return;
		}

		const observedInputs: Array<Readonly<Record<string, unknown>>> = [];
		const domainRuntime: DomainRuntimePort = {
			executeQuery: async () => ({
				ok: false,
				error: { message: "not used" },
				observedEffects: [] as const,
			}),
			executeMutation: async (input) => {
				observedInputs.push(input.input);
				return {
					ok: true,
					output: { accepted: true },
					observedEffects: ["write", "emit"] as const,
					emittedSignals: [] as const,
				};
			},
		};

		const principal = {
			subject: "user_1",
			claims: {},
			tags: ["authenticated"],
		};
		const expectedInput = { message: "same message" };

		const webResult = await runEntrypoint({
			bundle: fixture.bundle,
			binding: fixture.webBinding,
			request: { body: { message: "same message" } },
			principal,
			domainRuntime,
		});
		const httpResult = await runEntrypoint({
			bundle: fixture.bundle,
			binding: fixture.httpBinding,
			request: { body: { message: "same message" } },
			principal,
			domainRuntime,
		});
		const cliResult = await runEntrypoint({
			bundle: fixture.bundle,
			binding: fixture.cliBinding,
			request: { args: { message: "same message" } },
			principal,
			domainRuntime,
		});

		expect(webResult.ok).toBe(true);
		expect(httpResult.ok).toBe(true);
		expect(cliResult.ok).toBe(true);
		expect(observedInputs).toEqual([
			expectedInput,
			expectedInput,
			expectedInput,
		]);
	});
});
