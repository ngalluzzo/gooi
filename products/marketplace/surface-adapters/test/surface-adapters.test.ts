import { describe, expect, test } from "bun:test";
import { createCliSurfaceAdapter, runCliSurface } from "../src/cli/cli";
import { runHttpSurface } from "../src/http/http";
import { runWebSurface } from "../src/web/web";
import { runWebhookSurface } from "../src/webhook/webhook";
import {
	createBundleFixture,
	createRouteOnlyBundleFixture,
} from "./fixtures/bundle.fixture";
import { createRuntimeStubFixture } from "./fixtures/runtime.fixture";

describe("marketplace surface adapters", () => {
	test("invokes runtime through http/web/cli/webhook adapters", async () => {
		const bundle = createBundleFixture();
		const { runtime, invocations } = createRuntimeStubFixture();

		const [httpResult, webResult, cliResult, webhookResult] = await Promise.all(
			[
				runHttpSurface({
					runtime,
					bundle,
					ingress: {
						method: "GET",
						path: "/messages",
						query: { page: "2", q: "hello" },
						principal: {
							subject: "user_1",
							claims: {},
							tags: ["authenticated"],
						},
					},
				}),
				runWebSurface({
					runtime,
					bundle,
					ingress: {
						routeId: "messages_list",
						query: { page: "3", q: "from_web" },
					},
				}),
				runCliSurface({
					runtime,
					bundle,
					ingress: {
						command: "messages list",
						flags: { scope: "all" },
						args: { page: "4", q: "from_cli" },
					},
				}),
				runWebhookSurface({
					runtime,
					bundle,
					ingress: {
						verified: true,
						sourceId: "messages.source",
						method: "POST",
						path: "/messages/hooks",
						body: { page: "5", q: "from_hook" },
					},
				}),
			],
		);

		expect(httpResult.ok).toBe(true);
		expect(webResult.ok).toBe(true);
		expect(cliResult.ok).toBe(true);
		expect(webhookResult.ok).toBe(true);
		expect(invocations.length).toBe(4);

		const typedInvocations = invocations as Array<{
			readonly surfaceId: string;
			readonly payload: Readonly<Record<string, unknown>>;
		}>;
		expect(typedInvocations.map((call) => call.surfaceId).sort()).toEqual([
			"cli",
			"http",
			"web",
			"webhook",
		]);
		expect(
			typedInvocations.find((call) => call.surfaceId === "http")?.payload,
		).toEqual({
			page: 2,
			q: "hello",
			page_size: 10,
		});
	});

	test("create adapter executor uses provided runtime and bundle", async () => {
		const bundle = createBundleFixture();
		const { runtime, invocations } = createRuntimeStubFixture();
		const runCli = createCliSurfaceAdapter({ runtime, bundle });

		const result = await runCli({
			commandPath: ["messages", "list"],
			flags: { scope: "all" },
			args: { page: "6", q: "from_factory" },
		});

		expect(result.ok).toBe(true);
		expect(invocations).toHaveLength(1);
	});

	test("returns dispatch-stage error when ingress does not match dispatch plans", async () => {
		const result = await runWebSurface({
			runtime: createRuntimeStubFixture().runtime,
			bundle: createBundleFixture(),
			ingress: {
				routeId: "unknown_route",
				query: { page: "1" },
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.stage).toBe("dispatch");
			expect(result.error.code).toBe("dispatch_not_found_error");
		}
	});

	test("returns invoke-stage error for route entrypoint targets", async () => {
		const result = await runHttpSurface({
			runtime: createRuntimeStubFixture().runtime,
			bundle: createRouteOnlyBundleFixture(),
			ingress: {
				method: "GET",
				path: "/routes/messages",
				query: { mode: "full" },
			},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.stage).toBe("invoke");
			expect(result.error.code).toBe("surface_entrypoint_kind_unsupported");
		}
	});
});
