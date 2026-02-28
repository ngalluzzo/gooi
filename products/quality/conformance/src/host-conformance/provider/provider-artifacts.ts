import type {
	BindingPlan,
	DeploymentLockfile,
} from "@gooi/marketplace-contracts/binding-plan";

export const buildBindingPlan = (
	hostApiVersion: string,
	providerId: string,
	contract: {
		readonly id: string;
		readonly version: string;
	},
): BindingPlan => ({
	appId: "host-conformance-app",
	environment: "test",
	hostApiVersion,
	capabilityBindings: [
		{
			portId: contract.id,
			portVersion: contract.version,
			resolution: {
				mode: "local",
				targetHost: "node",
				providerId,
			},
		},
	],
});

export const buildLockfile = (
	hostApiVersion: string,
	providerId: string,
	providerVersion: string,
	contract: {
		readonly id: string;
		readonly version: string;
		readonly hash: string;
	},
): DeploymentLockfile => ({
	appId: "host-conformance-app",
	environment: "test",
	hostApiVersion,
	providers: [
		{
			providerId,
			providerVersion,
			integrity:
				"sha256:d1faebed8f7fd8f3f1c8f4a3bfe44ad6f656f4e4ec4df13db0adfbb6e2d70289",
			capabilities: [
				{
					portId: contract.id,
					portVersion: contract.version,
					contractHash: contract.hash,
				},
			],
		},
	],
});
