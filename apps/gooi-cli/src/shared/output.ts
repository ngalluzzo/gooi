import { stableStringify } from "@gooi/stable-json";
import type { CliOptions } from "./command";
import type { CliEnvelope } from "./envelope";
import type { CliIo } from "./input";

const renderEnvelope = (envelope: CliEnvelope, options: CliOptions): string => {
	const format = options.format;
	if (format === "pretty") {
		return `${JSON.stringify(envelope, null, 2)}\n`;
	}
	return `${stableStringify(envelope)}\n`;
};

export const writeEnvelope = async (input: {
	readonly io: CliIo;
	readonly options: CliOptions;
	readonly envelope: CliEnvelope;
}): Promise<void> => {
	const rendered = renderEnvelope(input.envelope, input.options);
	const output = input.options.output;
	if (typeof output === "string" && output.length > 0 && output !== "-") {
		await input.io.writeFile(output, rendered);
		return;
	}
	input.io.writeStdout(rendered);
};
