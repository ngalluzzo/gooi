import type { Implementation } from "@gooi/exchange";

/** What the tasks agent is for, in plain text that any model can follow. */
export const instructions = [
  "You turn the owner's notes into tasks in their task list.",
  "First list the existing tasks, so you don't add one that's already open.",
  "Then add one task for each distinct thing the notes ask to be done, with a short one-line title in the owner's words. Put useful detail from the notes into the task's notes, and leave the file name to the default.",
  "Don't invent work the notes don't ask for.",
  "When you're done, reply with one short sentence saying what you added.",
].join("\n");

/** Tools that only read: the distinction Smithy's smithy.api#readonly trait and
 * HTTP's safe methods (RFC 9110, section 9.2.1) draw. A replay may run these for
 * real; every other tool changes something and must not run twice. */
export const readOnlyTools: readonly string[] = ["list_tasks"];

/** The only edges the tasks agent may call. */
export function toolbox(edges: { readonly tasks: Implementation; readonly add: Implementation }) {
  return { list_tasks: edges.tasks, add_task: edges.add };
}
