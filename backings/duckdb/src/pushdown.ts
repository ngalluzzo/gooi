// Which filters a remote relation can be asked to apply itself. Read from
// DuckDB's own parse of the query (json_serialize_sql), never from the SQL
// text. A filter is pushed only when doing so can't change the result:
//
// - the relation is referenced exactly once in the whole query;
// - the filter is a top-level AND-conjunct of the WHERE of the SELECT whose
//   FROM holds that reference (directly or through joins);
// - it compares one of the relation's columns with a non-null constant, or is
//   list_contains(column, constant). Each of these rejects NULL, so rows the
//   relation leaves out could never reach that SELECT's output, even through
//   outer joins.
//
// DuckDB still runs the whole query, filters included, over what is fetched.
// A relation only has to return every row that matches what was pushed.

export type Operator = "=" | ">=" | ">" | "<=" | "<" | "contains";
export type Constant = string | number | boolean;

export interface Filter {
  readonly column: string;
  readonly op: Operator;
  readonly value: Constant;
}

type Node = { [key: string]: unknown };
const isNode = (value: unknown): value is Node => typeof value === "object" && value !== null && !Array.isArray(value);

const COMPARISONS: Record<string, Operator> = {
  COMPARE_EQUAL: "=",
  COMPARE_GREATERTHANOREQUALTO: ">=",
  COMPARE_GREATERTHAN: ">",
  COMPARE_LESSTHANOREQUALTO: "<=",
  COMPARE_LESSTHAN: "<",
};
const FLIPPED: Record<string, Operator> = { "=": "=", ">=": "<=", ">": "<", "<=": ">=", "<": ">" };

/** Every node in the tree, depth first. */
function* nodes(value: unknown): Generator<Node> {
  if (Array.isArray(value)) for (const item of value) yield* nodes(item);
  else if (isNode(value)) {
    yield value;
    for (const child of Object.values(value)) yield* nodes(child);
  }
}

/** A constant DuckDB parsed, or a string constant cast to a date or time
 * (DATE '2026-10-01'). NULL and anything else isn't a constant here. */
function constant(node: unknown): Constant | undefined {
  if (!isNode(node)) return undefined;
  if (node.class === "CAST" && isNode(node.type_expr) && /^(DATE|TIMESTAMP|TIMESTAMPTZ|TIMESTAMP WITH TIME ZONE)$/iu.test(String(node.type_expr.type_name))) {
    const inner = constant(node.child);
    return typeof inner === "string" ? inner : undefined;
  }
  if (node.class !== "CONSTANT" || !isNode(node.literal)) return undefined;
  const { kind, text } = node.literal as { kind?: string; text?: string };
  if (typeof text !== "string") return undefined;
  switch (kind) {
    case "STRING": return text;
    case "BOOLEAN": return text === "true";
    case "INTEGER":
    case "NUMERIC": {
      const value = Number(text);
      return Number.isFinite(value) && (kind === "NUMERIC" || Number.isSafeInteger(value)) ? value : undefined;
    }
    default: return undefined;
  }
}

/** The base tables a SELECT's FROM holds directly or through joins, by alias. */
function fromTables(from: unknown, into: Map<string, string>) {
  if (!isNode(from)) return;
  if (from.type === "BASE_TABLE" && typeof from.table_name === "string")
    into.set(String(from.alias || from.table_name), from.table_name);
  else if (from.type === "JOIN") {
    fromTables(from.left, into);
    fromTables(from.right, into);
  }
}

function conjuncts(where: unknown): Node[] {
  if (!isNode(where)) return [];
  if (where.class === "CONJUNCTION" && where.type === "CONJUNCTION_AND") return (where.children as unknown[]).flatMap(conjuncts);
  return [where];
}

/** The tables and relations a query names, from DuckDB's parse of it. */
export function named(ast: unknown): Set<string> {
  const names = new Set<string>();
  for (const node of nodes(ast))
    if (node.type === "BASE_TABLE" && typeof node.table_name === "string") names.add(node.table_name);
  return names;
}

/**
 * The filters to push to each relation, by relation name. `columns` lists the
 * columns of every table and relation the query can see, so an unqualified
 * column is pushed only when exactly one of them has it.
 */
export function pushdown(ast: unknown, columns: ReadonlyMap<string, readonly string[]>, relations: ReadonlySet<string>) {
  const pushed = new Map<string, Filter[]>();
  const references = new Map<string, number>();
  for (const node of nodes(ast))
    if (node.type === "BASE_TABLE" && typeof node.table_name === "string")
      references.set(node.table_name, (references.get(node.table_name) ?? 0) + 1);
  for (const name of relations) pushed.set(name, []);

  for (const select of nodes(ast)) {
    if (select.type !== "SELECT_NODE") continue;
    const scope = new Map<string, string>();
    fromTables(select.from_table, scope);
    const target = (ref: unknown): { relation: string; column: string } | undefined => {
      if (!isNode(ref) || ref.class !== "COLUMN_REF" || !Array.isArray(ref.column_names)) return undefined;
      const names = ref.column_names as string[];
      let table: string | undefined;
      if (names.length === 2) table = scope.get(names[0]!);
      else if (names.length === 1) {
        const owners = [...scope.values()].filter((t) => columns.get(t)?.includes(names[0]!));
        table = owners.length === 1 ? owners[0] : undefined;
      }
      const column = names.at(-1)!;
      if (!table || !relations.has(table) || references.get(table) !== 1 || !columns.get(table)?.includes(column)) return undefined;
      return { relation: table, column };
    };

    for (const condition of conjuncts(select.where_clause)) {
      if (condition.class === "COMPARISON" && COMPARISONS[String(condition.type)]) {
        const op = COMPARISONS[String(condition.type)]!;
        const left = target(condition.left), right = target(condition.right);
        if (left && constant(condition.right) !== undefined)
          pushed.get(left.relation)!.push({ column: left.column, op, value: constant(condition.right)! });
        else if (right && constant(condition.left) !== undefined)
          pushed.get(right.relation)!.push({ column: right.column, op: FLIPPED[op]!, value: constant(condition.left)! });
      } else if (condition.class === "FUNCTION" && condition.function_name === "list_contains" && Array.isArray(condition.arguments)) {
        const [list, item] = (condition.arguments as { expression?: unknown }[]).map((argument) => argument.expression);
        const where = target(list);
        const value = constant(item);
        if (where && value !== undefined) pushed.get(where.relation)!.push({ column: where.column, op: "contains", value });
      }
    }
  }
  return pushed;
}
