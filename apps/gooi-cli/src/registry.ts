import { appCompileCommand } from "./features/app/compile-command";
import { appDefineCommand } from "./features/app/define-command";
import { authoringCompleteCommand } from "./features/authoring/complete-command";
import { authoringDiagnoseCommand } from "./features/authoring/diagnose-command";
import { authoringIndexBuildCommand } from "./features/authoring/index-build-command";
import { authoringRenameCommand } from "./features/authoring/rename-command";
import { marketplaceCatalogDetailCommand } from "./features/marketplace/catalog-detail-command";
import { marketplaceCatalogSearchCommand } from "./features/marketplace/catalog-search-command";
import { marketplaceCatalogSnapshotCommand } from "./features/marketplace/catalog-snapshot-command";
import { marketplaceCertificationCompleteCommand } from "./features/marketplace/certification-complete-command";
import { marketplaceCertificationRevokeCommand } from "./features/marketplace/certification-revoke-command";
import { marketplaceCertificationStartCommand } from "./features/marketplace/certification-start-command";
import { marketplaceDiscoverCommand } from "./features/marketplace/discover-command";
import { marketplaceEligibilityExplainCommand } from "./features/marketplace/eligibility-explain-command";
import { marketplaceListingDeprecateCommand } from "./features/marketplace/listing-deprecate-command";
import { marketplaceListingPublishCommand } from "./features/marketplace/listing-publish-command";
import { marketplaceListingUpdateCommand } from "./features/marketplace/listing-update-command";
import { marketplaceResolveCommand } from "./features/marketplace/resolve-command";
import { runtimeReachabilityCommand } from "./features/runtime/reachability-command";
import { runtimeRunCommand } from "./features/runtime/run-command";
import type { CliCommand } from "./shared/command";

export const cliCommands: readonly CliCommand[] = [
	appDefineCommand,
	appCompileCommand,
	runtimeRunCommand,
	runtimeReachabilityCommand,
	authoringDiagnoseCommand,
	authoringCompleteCommand,
	authoringRenameCommand,
	authoringIndexBuildCommand,
	marketplaceCatalogSearchCommand,
	marketplaceCatalogDetailCommand,
	marketplaceCatalogSnapshotCommand,
	marketplaceDiscoverCommand,
	marketplaceResolveCommand,
	marketplaceEligibilityExplainCommand,
	marketplaceListingPublishCommand,
	marketplaceListingUpdateCommand,
	marketplaceListingDeprecateCommand,
	marketplaceCertificationStartCommand,
	marketplaceCertificationCompleteCommand,
	marketplaceCertificationRevokeCommand,
];
