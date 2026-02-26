# Commit and TSDoc Standards

## Purpose

This document defines execution standards for:

1. Commit quality and message conventions.
2. Package self-documentation for Typedoc and IDE API hovers.

These are mandatory for all platform reset work.

## Commit Standards

### Message format

Use conventional commit format:

`type(scope): summary`

Examples:

1. `feat(resolver): bind provider contributions by canonical identity`
2. `refactor(runtime-host): unify activation path with run command`
3. `docs(rfc-0033): add phase acceptance gate evidence requirements`

### Allowed types

1. `feat`
2. `fix`
3. `refactor`
4. `docs`
5. `test`
6. `chore`
7. `perf`
8. `build`
9. `ci`
10. `revert`

### Quality rules

1. Keep commits meaningful and scoped to one concern.
2. Do not combine unrelated refactors and behavior changes in one commit.
3. Preserve a readable engineering narrative in commit history.
4. Prefer multiple small coherent commits over one broad commit.

## TSDoc Standards

### Scope

Document all exported API surfaces:

1. Every exported function.
2. Every exported schema.
3. Every exported type alias.
4. Every exported interface.
5. Every property of exported object-shaped types/interfaces.

### Required tags and content

1. `@param` for every exported function parameter.
2. `@example` for every exported function.
3. `@returns` when return semantics are not obvious from the type alone.
4. `{@link ...}` for cross-references to related APIs.
5. `@internal` on symbols exported for internal cross-module use but not public API.

### Style rules

1. Write full-sentence descriptions with capitalization and period punctuation.
2. Document the type contract and semantics, not internal implementation details.
3. Capture edge cases and non-obvious behavior in description prose.
4. Keep internal/unexported function comments minimal and use regular comments.

### Tag usage guidance

1. Use `@returns` minimally when the return type is self-evident.
2. Use `@since` only when version metadata is actively maintained.
3. Do not use `@author` or `@version` tags.

## Reference Example

```ts
/**
 * Returns the plural form of a word.
 *
 * Preserves the original word's casing pattern.
 *
 * @param word - The word to pluralize.
 * @param count - When provided, returns the singular form if count is 1.
 * @param inclusive - When true, prepends the count to the result.
 * @param rules - Custom ruleset created with {@link withRules}. Defaults to the built-in ruleset.
 * @returns The pluralized word, optionally prefixed with the count.
 *
 * @example
 * plural("test") // "tests"
 * plural("test", 1) // "test"
 * plural("test", 5, true) // "5 tests"
 *
 * @throws {TypeError} If `word` is not a string.
 */
export function plural(
	word: string,
	count?: number,
	inclusive?: boolean,
	rules?: RuleSet,
): string;
```

```ts
/**
 * A set of rules used to pluralize and singularize words.
 * Create one with {@link withRules} rather than constructing manually.
 */
export interface RuleSet {
	/** Regex rules for building plural forms, evaluated last-to-first. */
	plural: ReadonlyArray<[RegExp, string]>;
	/** Regex rules for building singular forms, evaluated last-to-first. */
	singular: ReadonlyArray<[RegExp, string]>;
	/** Known irregular word pairs as [singular, plural] tuples. */
	irregular: ReadonlyArray<[string, string]>;
	/** Words with identical singular and plural forms. */
	uncountable: ReadonlyArray<string>;
}
```
