import { envelopesContracts } from "@gooi/authoring-contracts/envelopes";
import { executeAuthoringCliEnvelope } from "./execute-authoring-cli-envelope";

const usage =
	"Usage: bun ./src/features/cli/run-authoring-cli-command.ts <diagnose|complete|rename|index.build> < payload.json";

const main = async () => {
	try {
		const operation = envelopesContracts.authoringOperationSchema.parse(
			process.argv[2],
		);
		const stdin = (await Bun.stdin.text()).trim();
		const payload = stdin.length === 0 ? {} : JSON.parse(stdin);
		const requestEnvelope = {
			envelopeVersion: "1.0.0" as const,
			requestId: `cli:${operation}:${Date.now()}`,
			requestedAt: new Date().toISOString(),
			operation,
			payload,
		};
		const response = executeAuthoringCliEnvelope(requestEnvelope);
		process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
		if (!response.ok) {
			process.exitCode = 1;
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown CLI error.";
		process.stderr.write(`${usage}\n${message}\n`);
		process.exitCode = 1;
	}
};

void main();
