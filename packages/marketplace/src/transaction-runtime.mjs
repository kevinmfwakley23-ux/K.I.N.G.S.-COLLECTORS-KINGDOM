import { loadMarketplaceTransactionConfig } from "../../../config/marketplace-transactions.mjs";
import { createMarketplaceFulfillmentRepository } from "./fulfillment-repository.mjs";
import { createMarketplaceFulfillmentService } from "./fulfillment-service.mjs";
import { createPolicyBoundStripeConnectProvider } from "./stripe-connect-checkout-policy.mjs";
import { createMarketplaceTransactionRepository } from "./transaction-repository.mjs";
import { createMarketplaceReservationGuard } from "./transaction-reservation-guard.mjs";
import { createMarketplaceTransactionService } from "./transaction-service.mjs";

export function createMarketplaceTransactionRuntime({
  env = process.env,
  vaultStore,
  marketplaceRepository,
  marketplaceService,
  now = () => new Date(),
  fetchImpl = globalThis.fetch
} = {}) {
  const config = loadMarketplaceTransactionConfig(env);
  const transactionRepository = createMarketplaceTransactionRepository({ vaultStore });
  const fulfillmentRepository = createMarketplaceFulfillmentRepository({ vaultStore });
  const paymentProvider = config.stripeConfigured
    ? createPolicyBoundStripeConnectProvider({
        secretKey: config.stripeSecretKey,
        webhookSecret: config.stripeWebhookSecret,
        policyId: config.stripeConnectPolicyId,
        apiBaseUrl: config.stripeApiBaseUrl,
        timeoutMs: config.stripeTimeoutMs,
        checkoutTtlSeconds: 30 * 60,
        now,
        fetchImpl
      })
    : null;
  const coreService = createMarketplaceTransactionService({
    marketplaceRepository,
    marketplaceService,
    transactionRepository,
    paymentProvider,
    publicBaseUrl: config.publicBaseUrl,
    checkoutEnabled: config.checkoutEnabled,
    automaticTaxEnabled: config.automaticTaxEnabled,
    taxPolicyId: config.taxPolicyId,
    platformFeeBps: config.platformFeeBps,
    shippingCountries: config.shippingCountries,
    now
  });
  const service = createMarketplaceReservationGuard({
    vaultStore,
    marketplaceService,
    transactionService: coreService,
    now
  });
  const fulfillmentService = createMarketplaceFulfillmentService({
    fulfillmentRepository,
    now
  });
  return Object.freeze({
    config,
    repository: transactionRepository,
    provider: paymentProvider,
    coreService,
    service,
    fulfillmentRepository,
    fulfillmentService
  });
}
