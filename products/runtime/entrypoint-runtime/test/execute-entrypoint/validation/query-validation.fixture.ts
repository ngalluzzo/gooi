import { compileEntrypointBundle } from "@gooi/spec-compiler";
import type {
	CompiledEntrypointBundle,
	CompiledJsonSchemaArtifact,
	CompiledSurfaceBinding,
} from "@gooi/spec-compiler/contracts";

interface EntrypointValidationFixture {
	readonly bundle: CompiledEntrypointBundle;
	readonly binding: CompiledSurfaceBinding;
}

const resolveBinding = (
	bindings: CompiledEntrypointBundle["bindings"],
	bindingId: string,
): CompiledSurfaceBinding => {
	const binding = bindings[bindingId];
	if (binding === undefined) {
		throw new Error(`Missing compiled surface binding for ${bindingId}`);
	}
	return binding;
};

export const createQueryValidationBundle = (): EntrypointValidationFixture => {
	const compiled = compileEntrypointBundle({
		compilerVersion: "1.0.0",
		spec: {
			app: {
				id: "validation_fixture_app",
				name: "Validation Fixture App",
				tz: "UTC",
			},
			domain: {
				projections: {
					latest_messages: {},
				},
			},
			session: {
				fields: {},
			},
			access: {
				default_policy: "deny",
				roles: { authenticated: {} },
			},
			queries: [
				{
					id: "typed_query",
					access: { roles: ["authenticated"] },
					in: { page: "int!" },
					returns: { projection: "latest_messages" },
				},
			],
			mutations: [],
			routes: [],
			personas: {},
			scenarios: {},
			wiring: {
				surfaces: {
					http: {
						queries: {
							typed_query: {
								bind: { page: "query.page" },
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
			`Failed to compile query validation fixture: ${compiled.diagnostics.map((item) => item.code).join(",")}`,
		);
	}

	return {
		bundle: compiled.bundle,
		binding: resolveBinding(compiled.bundle.bindings, "http:query:typed_query"),
	};
};

export const createMutationValidationBundle =
	(): EntrypointValidationFixture => {
		const compiled = compileEntrypointBundle({
			compilerVersion: "1.0.0",
			spec: {
				app: {
					id: "invalid_replay_ttl_fixture_app",
					name: "Invalid Replay TTL Fixture App",
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
									$expr: { var: "input.message" },
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
						http: {
							mutations: {
								submit_message: {
									bind: { message: "body.message" },
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
				`Failed to compile mutation validation fixture: ${compiled.diagnostics.map((item) => item.code).join(",")}`,
			);
		}

		return {
			bundle: compiled.bundle,
			binding: resolveBinding(
				compiled.bundle.bindings,
				"http:mutation:submit_message",
			),
		};
	};

export const withInvalidSchemaProfile = (
	original: EntrypointValidationFixture,
): EntrypointValidationFixture => {
	const schemaKey = "entrypoint.query.typed_query.input";
	const originalSchemaArtifact = original.bundle.schemaArtifacts[schemaKey];
	if (originalSchemaArtifact === undefined) {
		throw new Error(
			`Missing schema artifact for ${schemaKey} in validation fixture`,
		);
	}
	return {
		...original,
		bundle: {
			...original.bundle,
			schemaArtifacts: {
				...original.bundle.schemaArtifacts,
				[schemaKey]: {
					...originalSchemaArtifact,
					target: "draft-7" as unknown as CompiledJsonSchemaArtifact["target"],
				},
			},
		},
	};
};

export const withInvalidArtifactManifest = (
	original: EntrypointValidationFixture,
): EntrypointValidationFixture => ({
	...original,
	...{
		bundle: {
			...original.bundle,
			artifactManifest: {
				...original.bundle.artifactManifest,
				aggregateHash: "invalid_hash",
			},
		},
	},
});
