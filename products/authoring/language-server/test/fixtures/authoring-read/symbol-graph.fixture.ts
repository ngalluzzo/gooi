import { buildSymbolGraphSnapshot } from "@gooi/symbol-graph";
import type { BuildSymbolGraphSnapshotInput } from "@gooi/symbol-graph/contracts";

const symbolGraphInput: BuildSymbolGraphSnapshotInput = {
	sourceHash: "3".repeat(64),
	symbols: [
		{
			id: "action:guestbook.submit",
			kind: "action",
			name: "guestbook.submit",
			location: { path: "docs/demo.yml", line: 1, character: 2 },
		},
		{
			id: "signal:message.created",
			kind: "signal",
			name: "message.created",
			location: { path: "docs/demo.yml", line: 6, character: 2 },
		},
		{
			id: "entrypoint:home.data.messages",
			kind: "entrypoint",
			name: "home.data.messages",
			location: { path: "docs/demo.yml", line: 8, character: 2 },
		},
		{
			id: "step:generated_ids",
			kind: "step_binding",
			name: "generated_ids",
			location: { path: "docs/demo.yml", line: 3, character: 8 },
			ownerSymbolId: "action:guestbook.submit",
		},
		{
			id: "expr:generated_ids.ids.0",
			kind: "expression_variable",
			name: "generated_ids.ids.0",
			location: { path: "docs/demo.yml", line: 12, character: 6 },
			ownerSymbolId: "action:guestbook.submit",
		},
		{
			id: "ambient:payload.user_id",
			kind: "ambient_symbol",
			name: "payload.user_id",
			location: { path: "docs/demo.yml", line: 3, character: 24 },
		},
	],
	references: [
		{
			fromSymbolId: "expr:generated_ids.ids.0",
			toSymbolId: "step:generated_ids",
			relationship: "references",
		},
	],
	signalImpact: {
		actions: [
			{
				actionSymbolId: "action:guestbook.submit",
				emittedSignalSymbolIds: ["signal:message.created"],
			},
		],
		queries: [
			{
				querySymbolId: "entrypoint:home.data.messages",
				refreshOnSignalSymbolIds: ["signal:message.created"],
			},
		],
	},
	renameConstraints: [
		{
			symbolKind: "ambient_symbol",
			renameable: false,
			blockedReason: "Ambient runtime symbols are reserved.",
		},
		{ symbolKind: "step_binding", renameable: true },
	],
};

export const symbolGraphSnapshot = buildSymbolGraphSnapshot(symbolGraphInput);
