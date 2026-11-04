import { readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import {
  acceptChecked, computeDigests, evaluateSuggestion, fromBase64, liveTree, makeBlock, makeSuggestionBlock, newBlockId,
  rejectTransaction, replaceChanges, rootDigest, SUGGESTION_TYPE, toBase64,
  type ActorDescriptor, type Block, type DocState, type Op, type Proposal, type Transaction,
} from "@nooq/core";
import { exportMarkdown, importMarkdown } from "@nooq/plugins";
import { tablesFormatters } from "@nooq/plugin-tables/export";
import { applyTransaction, loadDocument, newDocument, readState, storeDocument } from "@nooq/yjs";
import { edge, invoke, path, type Implementation } from "@gooi/exchange";
import { HAST, printHtml } from "@gooi/hast";
import { artifact } from "@gooi/kernel/evidence";
import type { Value } from "@gooi/kernel/types";
import { LOG_APPEND, LOG_LIST, LOG_READ, type Log, type StreamInfo } from "@gooi/log";
import { toHtmlTree } from "./html.js";

// nooq owns the meaning: blocks, transactions, suggestions and their
// revalidation are nooq's own functions. This app keeps documents on a gooi
// log the way DOCUMENT-MODEL.md DM-14.6 describes a host: the state at rest
// beside its header, and the history store beside it. Documents here are
// unsecured: changes are attributed to their actors but not signed (DM-12),
// so who may accept is enforced by which surface offers accept, not by keys.

type ImportedBlock = ReturnType<typeof importMarkdown>[number];

const contract = (name: string) => Object.freeze({ id: `urn:gooi:nooq-docs:${name}`, version: 1 });
export const MARKDOWN = Object.freeze({ id: "https://www.iana.org/assignments/media-types/text/markdown", version: 1 });

const name = {
  type: "string",
  pattern: "^[a-z0-9][a-z0-9_.-]{0,63}$",
  description: "Document name: lowercase letters, digits, dots, dashes and underscores",
};
const id = (description: string) => ({ type: "string", pattern: "^[A-Za-z0-9-]{1,64}$", description });
const object = (description: string, properties: Record<string, Value>, required: string[] = []): Value => ({
  type: "object", description, properties, required, additionalProperties: false,
});

/** One change at rest: the transaction (the history store) beside the state it
 * produced, in nooq's canonical encoding with its header (DM-14.6). */
interface Entry {
  readonly tx: Transaction;
  readonly state: { readonly docId: string; readonly schemaVersion: number; readonly update: string };
}

export interface DocsOptions {
  /** One stream per document. */
  readonly log: Log;
  /** Who imports, accepts and rejects: the owner, as a nooq human actor. */
  readonly owner: ActorDescriptor;
  /** The folder Markdown imports read from; a path may not leave it. */
  readonly root: string;
}

/** The documents app's edges, for hosts to lay out on their surfaces. */
export function documents({ log, owner, root }: DocsOptions) {
  async function entries(doc: string): Promise<Entry[]> {
    const result = await invoke(log.read, artifact(LOG_READ, { stream: doc }));
    return result.artifact.value as unknown as Entry[];
  }

  /** Load a document and check its stored state against its history, using
   * nooq's own replay and digests (DM-14.6: a stored state must equal the
   * replay of its log). */
  async function open(doc: string) {
    const history = await entries(doc);
    const last = history.at(-1);
    if (!last) throw new Error(`No document named ${doc}`);
    const loaded = loadDocument({ ...last.state, state: fromBase64(last.state.update) });
    const replayed = newDocument(last.state.docId, last.state.schemaVersion);
    for (const { tx } of history) applyTransaction(replayed, tx);
    const state = readState(loaded);
    if (await rootDigest(state) !== await rootDigest(readState(replayed)))
      throw new Error(`Document ${doc}'s stored state doesn't match its history`);
    const lamport = Math.max(0, ...history.map(({ tx }) => tx.lamport));
    return { ydoc: loaded, state, length: history.length, lamport };
  }

  /** Apply one nooq transaction and store the result beside it. A concurrent
   * change makes the append conflict instead of overwriting it. */
  async function commit(doc: string, opened: { ydoc: ReturnType<typeof newDocument>; length: number }, tx: Transaction) {
    applyTransaction(opened.ydoc, tx);
    const stored = storeDocument(opened.ydoc);
    const entry: Entry = {
      tx,
      state: { docId: stored.docId, schemaVersion: stored.schemaVersion, update: toBase64(stored.state) },
    };
    await invoke(log.append, artifact(LOG_APPEND, {
      stream: doc, expectedLength: opened.length, entries: [entry as unknown as Value],
    }));
  }

  const transaction = (actor: ActorDescriptor, lamport: number, intent: string, ops: Op[]): Transaction =>
    ({ id: newBlockId(), actor, lamport: lamport + 1, causality: {}, intent, ops });

  const list = edge({
    operation: { input: contract("list"), output: contract("documents") },
    inputSchema: object("List the nooq documents", {}),
    claim: contract("listed"),
    scope: "Listed the documents on the log with how many changes each has and when it last changed",
  }, async () => {
    const result = await invoke(log.list, artifact(LOG_LIST, {}));
    return (result.artifact.value as unknown as StreamInfo[])
      .map(({ stream, length, updated }) => ({ name: stream, changes: length, updated }));
  });

  const importFile = edge({
    operation: { input: contract("import"), output: contract("imported") },
    inputSchema: object("Bring a Markdown file in as a new nooq document, with nooq's own Markdown import", {
      name,
      path: { type: "string", minLength: 1, description: "The Markdown file, relative to the document folder" },
    }, ["name", "path"]),
    claim: contract("imported-markdown"),
    scope: "Read the Markdown file inside the document folder, imported it with nooq's importMarkdown, and stored it as one transaction by the owner",
  }, async (input) => {
    const request = input.value as { name: string; path: string };
    if ((await entries(request.name)).length) throw new Error(`Document ${request.name} already exists`);
    const file = resolve(root, request.path);
    if (relative(root, file).startsWith("..") || !file.startsWith(root + sep))
      throw new Error(`${request.path} is outside the document folder`);
    const ops: Op[] = [];
    const walk = (nodes: readonly ImportedBlock[], parent: string | null) => nodes.forEach(({ data, children }, index) => {
      const block = makeBlock({
        id: data.id, type: data.type, fields: data.fields, ...(data.text ? { text: data.text } : {}),
      }, owner.actorId);
      ops.push({ op: "insert", block, parent, index });
      walk(children, data.id);
    });
    walk(importMarkdown(readFileSync(file, "utf8")), null);
    if (!ops.length) throw new Error(`${request.path} has nothing to import`);
    await commit(request.name, { ydoc: newDocument(request.name), length: 0 },
      transaction(owner, 0, `import-markdown:${request.path}`, ops));
    return { name: request.name, blocks: ops.length };
  });

  const exported = (what: string, description: string) => edge({
    operation: { input: contract(what), output: MARKDOWN },
    inputSchema: object(description, { name }, ["name"]),
    claim: contract("exported"),
    scope: "Exported the document's live tree with nooq's exportMarkdown and its table formatters; pending suggestions are not content and are left out",
  }, async (input) => {
    const { state } = await open((input.value as { name: string }).name);
    return exportMarkdown(state, { formatters: tablesFormatters }).markdown;
  });
  const markdown = exported("read", "Read a nooq document as Markdown, with nooq's own exporter");

  const markdownToHast = edge({
    operation: { input: MARKDOWN, output: HAST },
    claim: contract("html-tree"),
    scope: "Parsed the Markdown with GitHub's table syntax to mdast, and turned it into a hast document",
  }, (input) => toHtmlTree(input.value as string) as unknown as Value);

  const blocks = edge({
    operation: { input: contract("blocks"), output: contract("block-list") },
    inputSchema: object("List a nooq document's blocks with their IDs and text, to propose changes against", { name }, ["name"]),
    claim: contract("listed-blocks"),
    scope: "Listed the live blocks in document order with their type, depth and text; suggestions are listed separately",
  }, async (input) => {
    const { state } = await open((input.value as { name: string }).name);
    const out: { id: string; type: string; depth: number; text?: string }[] = [];
    const walk = (ids: readonly string[], depth: number) => ids.forEach((blockId) => {
      const block = state.blocks[blockId]!;
      if (block.type === SUGGESTION_TYPE) return;
      out.push({ id: block.id, type: block.type, depth, ...(block.text ? { text: block.text.s } : {}) });
      walk(block.children, depth + 1);
    });
    walk(state.roots, 0);
    return out;
  });

  const suggestions = edge({
    operation: { input: contract("suggestions"), output: contract("suggestion-list") },
    inputSchema: object("List a nooq document's pending suggestions, each checked against the document as it is now", { name }, ["name"]),
    claim: contract("listed-suggestions"),
    scope: "Listed the live suggestion blocks with who proposed them, their intent, the text before and after, and nooq's evaluation of whether they are still fresh",
  }, async (input) => {
    const { state } = await open((input.value as { name: string }).name);
    const { alive } = liveTree(state);
    const pending = Object.values(state.blocks).filter((block): block is Block =>
      block.type === SUGGESTION_TYPE && alive.has(block.id));
    return Promise.all(pending.map(async (block) => {
      const proposal = block.fields.proposal as unknown as Proposal;
      const context = (proposal.context ?? {}) as { before?: Record<string, string>; after?: Record<string, string> };
      return {
        id: block.id,
        proposer: proposal.actor,
        ...(proposal.intent ? { intent: proposal.intent } : {}),
        status: (await evaluateSuggestion(state, block.id)).status,
        changes: Object.keys(context.after ?? {}).map((target) => ({
          block: target, before: context.before?.[target] ?? "", after: context.after?.[target] ?? "",
        })),
      };
    }));
  });

  const propose = edge({
    operation: { input: contract("propose"), output: contract("proposed") },
    inputSchema: object("Propose new text for one block of a nooq document, as a suggestion the owner reviews", {
      name,
      block: id("The block's ID, from the document's blocks"),
      text: { type: "string", maxLength: 20000, description: "The block's whole new text" },
      agent: {
        type: "string",
        pattern: "^[a-z0-9][a-z0-9_.-]{0,63}$",
        description: "Who is proposing, such as claude-code; recorded as the ai actor ai:<agent>",
      },
      model: { type: "string", maxLength: 100, description: "The proposing model, if known" },
      intent: { type: "string", maxLength: 200, description: "What the change is for, shown when it's reviewed" },
    }, ["name", "block", "text", "agent"]),
    claim: contract("suggested"),
    scope: "Built a nooq proposal pinned to the block's current digests and inserted it as a suggestion block authored by the agent; the document's content is unchanged until the owner accepts",
  }, async (input) => {
    const request = input.value as { name: string; block: string; text: string; agent: string; model?: string; intent?: string };
    const opened = await open(request.name);
    const target = opened.state.blocks[request.block];
    if (!target || target.type === SUGGESTION_TYPE || !liveTree(opened.state).alive.has(request.block))
      throw new Error(`Document ${request.name} has no block ${request.block}`);
    if (!target.text) throw new Error(`Block ${request.block} has no text to change`);
    const changes = replaceChanges(target.text.s, request.text);
    if (!changes.length) throw new Error("The new text is the same as the block's current text");
    const digests = (await computeDigests(opened.state)).get(request.block)!;
    const actor: ActorDescriptor = {
      actorId: `ai:${request.agent}`, kind: "ai", ...(request.model ? { model: request.model } : {}),
    };
    const proposal: Proposal = {
      base: { rootDigest: await rootDigest(opened.state) },
      ops: [{ op: "textEdit", block: request.block, changes }],
      evidence: [{ block: request.block, contentDigest: digests.contentDigest, structureDigest: digests.structureDigest }],
      context: {
        name: request.agent, ...(request.model ? { model: request.model } : {}),
        before: { [request.block]: target.text.s }, after: { [request.block]: request.text },
      },
      ...(request.intent ? { intent: request.intent } : {}),
      actor: actor.actorId,
      actorDescriptor: actor,
    };
    const suggestion = makeSuggestionBlock(proposal, actor.actorId);
    await commit(request.name, opened, transaction(actor, opened.lamport, request.intent ?? "suggest-text", [
      { op: "insert", block: suggestion, parent: null },
    ]));
    return { name: request.name, suggestion: suggestion.id };
  });

  const decide = (verdict: "accept" | "reject") => edge({
    operation: { input: contract(verdict), output: contract(`${verdict}ed`) },
    inputSchema: object(
      verdict === "accept"
        ? "Accept a suggestion as the owner: nooq applies its changes, authored by the proposer and adopted by you"
        : "Reject a suggestion as the owner: nooq records the verdict and removes it",
      {
        name,
        suggestion: id("The suggestion's ID, from the document's suggestions"),
        ...(verdict === "accept" ? {
          force: { type: "string", enum: ["yes"], description: "Accept even though the document changed since it was proposed" },
        } : {}),
      },
      ["name", "suggestion"],
    ),
    claim: contract(`${verdict}ed-suggestion`),
    scope: verdict === "accept"
      ? "Accepted the suggestion with nooq's acceptChecked, which refuses a stale one unless forced, and stored the adoption transaction"
      : "Rejected the suggestion with nooq's rejectTransaction and stored it",
  }, async (input) => {
    const request = input.value as { name: string; suggestion: string; force?: "yes" };
    const opened = await open(request.name);
    const block = opened.state.blocks[request.suggestion];
    if (!block || block.type !== SUGGESTION_TYPE || !liveTree(opened.state).alive.has(request.suggestion))
      throw new Error(`Document ${request.name} has no pending suggestion ${request.suggestion}`);
    const tx = verdict === "accept"
      ? await acceptChecked({
          state: opened.state, suggestion: request.suggestion, actor: owner,
          lamport: opened.lamport + 1, force: request.force === "yes",
        })
      : rejectTransaction({ suggestion: request.suggestion, actor: owner, lamport: opened.lamport + 1 });
    await commit(request.name, opened, tx);
    return { name: request.name, suggestion: request.suggestion, verdict: `${verdict}ed` };
  });

  return {
    list,
    import: importFile,
    markdown,
    html: path(
      exported("read-html", "Read a nooq document as an HTML page: nooq's Markdown, through mdast and hast"),
      markdownToHast, printHtml,
    ) as Implementation,
    blocks,
    suggestions,
    propose,
    accept: decide("accept"),
    reject: decide("reject"),
  };
}

export type { DocState };
