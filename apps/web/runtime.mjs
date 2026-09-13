import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadRuntimeConfig } from "../../config/runtime.mjs";
import { createCatalogRuntime } from "../../packages/catalog/src/runtime.mjs";
import { createCommonsAutographProvider } from "../../packages/grading/src/commons-autograph-provider.mjs";
import { createPregradeAnalysisRepository } from "../../packages/grading/src/repository.mjs";
import { createPregradeAnalysisService } from "../../packages/grading/src/service.mjs";
import { createGreatHallService } from "../../packages/great-hall/src/service.mjs";
import { createIdentityService } from "../../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../../packages/identity/src/sqlite-store.mjs";
import { createKingsAiClient } from "../../packages/kings-ai/src/client.mjs";
import { createMarketplaceGreatHallAdapter } from "../../packages/marketplace/src/great-hall-adapter.mjs";
import { createMarketplaceRepository } from "../../packages/marketplace/src/repository.mjs";
import { createMarketplaceService } from "../../packages/marketplace/src/service.mjs";
import { createLogger } from "../../packages/observability/src/logger.mjs";
import { createEbayBrowseValuationProvider } from "../../packages/vault/src/ebay-browse-valuation-provider.mjs";
import { createVaultImportRepository } from "../../packages/vault/src/import-repository.mjs";
import { createVaultImportService } from "../../packages/vault/src/import-service.mjs";
import { createVaultIntakeRepository } from "../../packages/vault/src/intake-repository.mjs";
import { createVaultIntakeService } from "../../packages/vault/src/intake-service.mjs";
import { createVaultMediaRepository } from "../../packages/vault/src/media-repository.mjs";
import { createVaultMediaService } from "../../packages/vault/src/media-service.mjs";
import { LocalVaultMediaStorage } from "../../packages/vault/src/media-storage.mjs";
import { createVaultPortfolioHistoryRepository } from "../../packages/vault/src/portfolio-history-repository.mjs";
import { createVaultPortfolioHistoryService } from "../../packages/vault/src/portfolio-history-service.mjs";
import { createVaultProvenanceRepository } from "../../packages/vault/src/provenance-repository.mjs";
import { createVaultProvenanceService } from "../../packages/vault/src/provenance-service.mjs";
import { createVaultQueryRepository } from "../../packages/vault/src/query-repository.mjs";
import { createVaultQueryService } from "../../packages/vault/src/query-service.mjs";
import { createVaultReorganizationRepository } from "../../packages/vault/src/reorganization-repository.mjs";
import { createVaultReorganizationService } from "../../packages/vault/src/reorganization-service.mjs";
import { createVaultService } from "../../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../../packages/vault/src/sqlite-store.mjs";
import { createVaultValuationRepository } from "../../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../../packages/vault/src/valuation-service.mjs";
import { createMarketplaceAwareKingdomServer } from "./marketplace-server.mjs";

export async function runKingdomRuntime() {
  const config = loadRuntimeConfig();
  const logger = createLogger({ level: config.logLevel });
  const identityStore = new SqliteIdentityStore(resolve(config.dataDir, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(resolve(config.dataDir, "vault.sqlite"));
  const identityService = createIdentityService({
    store: identityStore,
    sessionTtlMs: config.sessionTtlHours * 60 * 60 * 1000
  });
  const vaultService = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  const marketplaceService = createMarketplaceService({ vaultStore, marketplaceRepository });
  const vaultQueryRepository = createVaultQueryRepository({ vaultStore });
  const vaultQueryService = createVaultQueryService({
    vaultStore,
    vaultService,
    queryRepository: vaultQueryRepository
  });
  const vaultImportRepository = createVaultImportRepository({ vaultStore });
  const vaultImportService = createVaultImportService({
    vaultService,
    vaultStore,
    importRepository: vaultImportRepository
  });
  const vaultIntakeRepository = createVaultIntakeRepository({ vaultStore });
  const vaultIntakeService = createVaultIntakeService({
    vaultStore,
    intakeRepository: vaultIntakeRepository
  });
  const vaultMediaRepository = createVaultMediaRepository({ vaultStore });
  const vaultMediaStorage = new LocalVaultMediaStorage(resolve(config.dataDir, "vault-media"));
  const vaultMediaService = createVaultMediaService({
    vaultStore,
    mediaRepository: vaultMediaRepository,
    storage: vaultMediaStorage
  });
  const gradingAnalysisRepository = createPregradeAnalysisRepository({ vaultStore });
  const gradingAnalysisService = createPregradeAnalysisService({
    vaultStore,
    mediaRepository: vaultMediaRepository,
    analysisRepository: gradingAnalysisRepository
  });
  const vaultProvenanceRepository = createVaultProvenanceRepository({ vaultStore });
  const vaultProvenanceService = createVaultProvenanceService({
    vaultStore,
    provenanceRepository: vaultProvenanceRepository
  });
  const vaultValuationRepository = createVaultValuationRepository({ vaultStore });
  const observationProviders = config.ebayValuationEnabled
    ? [createEbayBrowseValuationProvider({
        apiBaseUrl: config.ebayApiBaseUrl,
        clientId: config.ebayClientId,
        clientSecret: config.ebayClientSecret,
        policyId: config.ebayProviderPolicyId,
        marketplaceId: config.ebayMarketplaceId,
        timeoutMs: config.ebayTimeoutMs
      })]
    : [];
  const vaultValuationCoreService = createVaultValuationService({
    vaultStore,
    valuationRepository: vaultValuationRepository,
    observationProviders
  });
  const vaultPortfolioHistoryRepository = createVaultPortfolioHistoryRepository({ vaultStore });
  const vaultPortfolioHistoryService = createVaultPortfolioHistoryService({
    vaultStore,
    valuationRepository: vaultValuationRepository,
    historyRepository: vaultPortfolioHistoryRepository,
    valuationService: vaultValuationCoreService
  });
  const vaultValuationService = Object.freeze({
    ...vaultValuationCoreService,
    portfolioHistoryService: vaultPortfolioHistoryService
  });
  const vaultReorganizationRepository = createVaultReorganizationRepository({ vaultStore });
  const vaultReorganizationService = createVaultReorganizationService({
    vaultStore,
    reorganizationRepository: vaultReorganizationRepository
  });
  const catalogRuntime = createCatalogRuntime({ config });
  const catalogService = catalogRuntime.service;
  const autographReferenceProvider = createCommonsAutographProvider({ version: config.version });
  const greatHallCoreService = createGreatHallService({ identityService, vaultService });
  const greatHallService = createMarketplaceGreatHallAdapter({
    greatHallService: greatHallCoreService,
    marketplaceService
  });
  const kingsAiClient = createKingsAiClient({
    baseUrl: config.kingsAiBaseUrl,
    accessToken: config.kingsAiToken,
    timeoutMs: config.kingsAiTimeoutMs
  });
  const server = createMarketplaceAwareKingdomServer({
    config,
    logger,
    identityService,
    greatHallService,
    kingsAiClient,
    catalogService,
    autographReferenceProvider,
    gradingAnalysisService,
    vaultService,
    vaultMediaService,
    vaultImportService,
    vaultIntakeService,
    vaultProvenanceService,
    vaultValuationService,
    vaultReorganizationService,
    vaultQueryService,
    marketplaceService
  });

  server.on("error", (error) => {
    logger.error("server.error", { error });
    process.exitCode = 1;
  });

  server.listen(config.port, config.host, () => {
    logger.info("server.started", {
      host: config.host,
      port: config.port,
      version: config.version,
      valuationObservationProviders: observationProviders.map((provider) => provider.id),
      marketplaceListingPublicationAvailable: true,
      marketplaceCheckoutAvailable: false
    });
  });

  const shutdown = (signal) => {
    logger.info("server.shutdown_requested", { signal });
    server.close((error) => {
      if (error) {
        logger.error("server.shutdown_failed", { error });
        process.exitCode = 1;
      }
      identityStore.close();
      vaultStore.close();
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await runKingdomRuntime();
}
