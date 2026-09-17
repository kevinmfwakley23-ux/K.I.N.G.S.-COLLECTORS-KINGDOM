import { loadMarketplaceTransactionConfig } from "../../../config/marketplace-transactions.mjs";
import { createMarketplaceFulfillmentRepository } from "./fulfillment-repository.mjs";
import { createMarketplaceFulfillmentService } from "./fulfillment-service.mjs";
import { createStripeConnectProvider } from "./stripe-connect-provider.mjs";
import { createMarketplaceTransactionRepository } from "./transaction-repository.mjs";
import { createMarketplaceTransactionService } from "./transaction-service.mjs";

export function createMarketplaceTransactionRuntime({
  env = process.env,
  vaultStore,
  marketplaceRepository,
  marketplaceService
} = {}) {
  const config = loadMarketplaceTransactionConfig(env);
  const transactionRepository = createMarketplaceTransactionRepository({ vaultStore });
  const fulfillmentRepository = createMarketplaceFulfillmentRepository({ vaultStore });
  const paymentProvider = config.stripeConfigured
    ? createStripeConnectProvider({
        secretKey: config.stripeSecretKey,
        webhookSecret: config.stripeWebhookSecret,
        policyId: config.stripeConnectPolicyId,
        apiBaseUrl: config.stripeApiBaseUrl,
        timeoutMs: config.stripeTimeoutMs
      })
    : null;
  const service = createMarketplaceTransactionService({
    marketplaceRepository,
    marketplaceService,
    transactionRepository,
    paymentProvider,
    publicBaseUrl: config.publicBaseUrl,
    checkoutEnabled: config.checkoutEnabled,
    automaticTaxEnabled: config.automaticTaxEnabled,
    taxPolicyId: config.taxPolicyId,
    platformFeeBps: config.platformFeeBps,
    shippingCountries: config.shippingCountries
  });
  const fulfillmentService = createMarketplaceFulfillmentService({ fulfillmentRepository });
  return Object.freeze({
    config,
    repository: transactionRepository,
    provider: paymentProvider,
    service,
    fulfillmentRepository,
    fulfillmentService
  });
}
