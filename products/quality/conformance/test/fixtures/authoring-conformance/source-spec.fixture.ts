const baseSourceSpec = {
	domain: {
		signals: {
			"message.created": {},
		},
		flows: {
			"flow.notify": {},
		},
		projections: {
			"messages.timeline": {},
		},
	},
	queries: [{ id: "home.data.messages" }],
	mutations: [{ id: "guestbook.submit" }],
	routes: [{ id: "home_route" }],
	personas: {
		moderator: {
			description: "Moderation operator persona.",
		},
	},
	scenarios: {
		"happy-path": {
			context: { persona: "moderator" },
			steps: [
				{
					capture: [
						{
							captureId: "latest_message",
							source: "context",
							path: "session.latestMessage",
						},
					],
				},
			],
		},
	},
	wiring: {
		requirements: {
			capabilities: [
				{
					portId: "message.is_allowed",
					portVersion: "1.0.0",
					mode: "local",
				},
			],
		},
	},
};

export const invalidReachabilitySourceSpec = {
	...baseSourceSpec,
	wiring: {
		requirements: {
			capabilities: [
				{
					portId: "missing.capability",
					portVersion: "9.9.9",
					mode: "remote",
				},
				{
					portId: "message.is_allowed",
					portVersion: "1.0.0",
					mode: "delegated",
					delegateRouteId: "missing_route",
				},
				{
					portId: "message.is_allowed",
					portVersion: "9.9.9",
					mode: "local",
				},
			],
		},
	},
};

export const invalidGuardScenarioSourceSpec = {
	...baseSourceSpec,
	domain: {
		...baseSourceSpec.domain,
		actions: {
			"guestbook.submit": {
				signalGuards: [
					{
						signalId: "message.deleted",
						definition: {
							onFail: "panic",
						},
					},
				],
				flowGuards: [
					{
						flowId: "flow.missing",
						definition: {
							onFail: "abort",
						},
					},
				],
				steps: [
					{
						invariants: [
							{
								onFail: "fail_action",
							},
						],
					},
				],
			},
		},
	},
	scenarios: {
		broken: {
			context: { persona: "unknown_persona" },
			steps: [
				{
					trigger: { mutation: "unknown.mutation" },
					expect: { signal: "unknown.signal" },
					capture: [
						{
							captureId: "bad_capture",
							source: "not_valid",
						},
					],
				},
			],
		},
	},
};

export const documentText = `actions:\n  guestbook.submit:\n    do:\n      - message.is_allowed\n      - gooi-marketplace-bun-sqlite.insert_message\nemits:\n  - message.created\nqueries:\n  home.data.messages:\n    refresh_on_signals:\n      - message.created\nrefs:\n  - generated_ids.ids.0\n  - payload.user_id\nstep_names:\n  - generated_ids\n  - existing_ids\nguards:\n  onFail:\nscenarios:\n  happy-path:\n    context:\n      persona:\n    steps:\n      - capture:\n          - source:\n`;

export const findPosition = (
	token: string,
	fallback: { line: number; character: number },
) => {
	const lines = documentText.split(/\r?\n/u);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
		const line = lines[lineIndex] ?? "";
		const character = line.indexOf(token);
		if (character >= 0) {
			return {
				line: lineIndex,
				character: character + token.length,
			};
		}
	}
	return fallback;
};

export { baseSourceSpec };
