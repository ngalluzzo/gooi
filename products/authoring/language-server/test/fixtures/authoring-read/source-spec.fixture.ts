export const sourceSpec = {
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

export const authoringReadDocumentText = `actions:\n  guestbook.submit:\n    do:\n      - message.is_allowed\n      - gooi-marketplace-bun-sqlite.insert_message\nemits:\n  - message.created\nqueries:\n  home.data.messages:\n    refresh_on_signals:\n      - message.created\nrefs:\n  - generated_ids.ids.0\nguards:\n  onFail:\nscenarios:\n  happy-path:\n    context:\n      persona:\n    steps:\n      - capture:\n          - source:\n`;
