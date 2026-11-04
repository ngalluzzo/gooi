// Extract the one operation the issues relation uses from GitHub's published
// OpenAPI description, so tests can check the relation against GitHub's own
// parameters and fields. Run: bun run openapi (in backings/github).
const SOURCE = "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json";
const api = await (await fetch(SOURCE)).json() as any;
const resolve = (node: any): any => node?.$ref ? node.$ref.split("/").slice(1).reduce((o: any, k: string) => o[k], api) : node;
const operation = api.paths["/repos/{owner}/{repo}/issues"].get;
const issue = resolve(operation.responses["200"].content["application/json"].schema.items);
const extract = {
  $comment: `Extracted from ${SOURCE} by backings/github/scripts/openapi.ts. Do not edit.`,
  apiVersion: api.info.version,
  operationId: operation.operationId,
  path: "/repos/{owner}/{repo}/issues",
  parameters: operation.parameters.map(resolve).map((p: any) => ({ name: p.name, in: p.in, schema: p.schema })),
  issueFields: Object.keys(issue.properties).sort(),
};
await Bun.write(new URL("../src/openapi-issues.json", import.meta.url), JSON.stringify(extract, null, 2) + "\n");
console.log(`Wrote ${extract.operationId} from GitHub API ${extract.apiVersion}`);
