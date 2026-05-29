/**
 * Payment Provider Registry
 * 
 * Central registry for managing payment providers.
 * Handles provider selection, fallback logic, and credential management.
 */

import prisma from '../config/database';
import logger from '../config/logger';
import { IPaymentProvider } from './payment-provider.interface';
import { HubtelPaymentProvider } from './hubtel.provider';
import { PaystackProvider } from './paystack.provider';
import { TheTellerProvider } from './theteller.provider';

export type ProviderName = 'hubtel' | 'paystack' | 'theteller';

interface ProviderConfig {
  provider: IPaymentProvider;
  isActive: boolean;
  priority: number;
  credentials: Record<string, string>;
}

class PaymentProviderRegistry {
  private providers: Map<ProviderName, ProviderConfig> = new Map();
  private initialized = false;

  /**
   * Reset the registry so it re-initializes on next use
   * Call this after payment settings are updated in the admin dashboard
   */
  reset(): void {
    this.providers.clear();
    this.initialized = false;
    logger.info('Payment provider registry reset - will reinitialize on next use');
  }

  /**
   * Initialize the registry by loading provider configurations from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load SiteSettings
      const settings = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
      });

      if (!settings) {
        logger.warn('SiteSettings not found, using default provider configuration');
        this.initializeDefaults();
        return;
      }

      // Determine active payment gateway from settings
      // Default to paystack since that's our primary gateway
      const activeGateway = settings.paymentGateway || 'paystack';

      // Register Hubtel provider
      const hubtelApiId = (settings as any).hubtelApiId || process.env.HUBTEL_API_ID;
      const hubtelApiSecret = (settings as any).hubtelApiSecret || process.env.HUBTEL_API_SECRET;
      const hubtelMerchantAccountId = (settings as any).hubtelMerchantAccountId || process.env.HUBTEL_MERCHANT_ACCOUNT_ID;

      if (hubtelApiId && hubtelApiSecret && hubtelMerchantAccountId) {
        this.providers.set('hubtel', {
          provider: new HubtelPaymentProvider(),
          isActive: activeGateway === 'hubtel',
          priority: 1,
          credentials: {
            apiId: hubtelApiId,
            apiSecret: hubtelApiSecret,
            merchantAccountId: hubtelMerchantAccountId,
          },
        });
        logger.info('Hubtel provider registered', { isActive: activeGateway === 'hubtel' });
      } else {
        logger.warn('Hubtel credentials not configured');
      }

      // Register Paystack provider
      const paystackSecretKey = (settings as any).paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
      const paystackPublicKey = (settings as any).paystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY;

      if (paystackSecretKey && paystackPublicKey) {
        this.providers.set('paystack', {
          provider: new PaystackProvider(),
          isActive: activeGateway === 'paystack',
          priority: 2,
          credentials: {
            secretKey: paystackSecretKey,
            publicKey: paystackPublicKey,
          },
        });
        logger.info('Paystack provider registered', { isActive: activeGateway === 'paystack' });
      } else {
        logger.warn('Paystack credentials not configured');
      }

      // Register TheTeller provider
      const thetellerApiKey = (settings as any).thetellerApiKey || process.env.THETELLER_API_KEY;
      const thetellerApiUser = (settings as any).thetellerApiUser || process.env.THETELLER_API_USER;
      const thetellerMerchantId = (settings as any).thetellerMerchantId || process.env.THETELLER_MERCHANT_ID;

      if (thetellerApiKey && thetellerApiUser && thetellerMerchantId) {
        this.providers.set('theteller', {
          provider: new TheTellerProvider(),
          isActive: activeGateway === 'theteller',
          priority: 3,
          credentials: {
            apiKey: thetellerApiKey,
            apiUser: thetellerApiUser,
            merchantId: thetellerMerchantId,
          },
        });
        logger.info('TheTeller provider registered', { isActive: activeGateway === 'theteller' });
      } else {
        logger.warn('TheTeller credentials not configured');
      }

      this.initialized = true;
      logger.info('Payment provider registry initialized', {
        providersCount: this.providers.size,
        activeGateway,
      });
    } catch (error) {
      logger.error('Failed to initialize payment provider registry', { error });
      this.initializeDefaults();
    }
  }

  /**
   * Initialize with default configuration (fallback)
   */
  private initializeDefaults(): void {
    // Use environment variables as fallback
    const hubtelApiId = process.env.HUBTEL_API_ID;
    const hubtelApiSecret = process.env.HUBTEL_API_SECRET;
    const hubtelMerchantAccountId = process.env.HUBTEL_MERCHANT_ACCOUNT_ID;

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY;

    const thetellerApiKey = process.env.THETELLER_API_KEY;
    const thetellerApiUser = process.env.THETELLER_API_USER;
    const thetellerMerchantId = process.env.THETELLER_MERCHANT_ID;

    if (paystackSecretKey && paystackPublicKey) {
      this.providers.set('paystack', {
        provider: new PaystackProvider(),
        isActive: true, // Paystack is active by default
        priority: 1,
        credentials: {
          secretKey: paystackSecretKey,
          publicKey: paystackPublicKey,
        },
      });
    }

    if (hubtelApiId && hubtelApiSecret && hubtelMerchantAccountId) {
      this.providers.set('hubtel', {
        provider: new HubtelPaymentProvider(),
        isActive: false, // Hubtel inactive by default unless explicitly selected
        priority: 2,
        credentials: {
          apiId: hubtelApiId,
          apiSecret: hubtelApiSecret,
          merchantAccountId: hubtelMerchantAccountId,
        },
      });
    }

    if (thetellerApiKey && thetellerApiUser && thetellerMerchantId) {
      this.providers.set('theteller', {
        provider: new TheTellerProvider(),
        isActive: false, // TheTeller inactive by default unless explicitly selected
        priority: 3,
        credentials: {
          apiKey: thetellerApiKey,
          apiUser: thetellerApiUser,
          merchantId: thetellerMerchantId,
        },
      });
    }

    this.initialized = true;
  }

  /**
   * Get the active payment provider
   * Returns the provider with highest priority (lowest number) that is active
   */
  async getActiveProvider(): Promise<{ provider: IPaymentProvider; credentials: Record<string, string>; name: ProviderName } | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Find active providers sorted by priority
    const activeProviders = Array.from(this.providers.entries())
      .filter(([_, config]) => config.isActive)
      .sort(([_, a], [__, b]) => a.priority - b.priority);

    if (activeProviders.length === 0) {
      logger.warn('No active payment providers configured');
      return null;
    }

    const [name, config] = activeProviders[0];
    return {
      provider: config.provider,
      credentials: config.credentials,
      name,
    };
  }

  /**
   * Get provider based on payment method (smart routing)
   * Paystack is better for cards, Hubtel/TheTeller for mobile money
   */
  async getProviderForPaymentMethod(paymentMethod: 'card' | 'mobile_money' | 'bank_transfer'): Promise<{
    provider: IPaymentProvider;
    credentials: Record<string, string>;
    name: ProviderName;
  } | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Smart routing logic
    // Cards: ALWAYS route to Paystack when configured — Hubtel does not process cards.
    // TheTeller also supports cards, so it's a fallback
    if (paymentMethod === 'card') {
      if (this.providers.has('paystack')) {
        const config = this.providers.get('paystack')!;
        logger.info('Smart routing: Using Paystack for card payment (primary card provider)');
        return {
          provider: config.provider,
          credentials: config.credentials,
          name: 'paystack',
        };
      }
      // Fallback to TheTeller for cards
      if (this.providers.has('theteller')) {
        const config = this.providers.get('theteller')!;
        logger.info('Smart routing: Using TheTeller for card payment (fallback card provider)');
        return {
          provider: config.provider,
          credentials: config.credentials,
          name: 'theteller',
        };
      }
    }

    if (paymentMethod === 'mobile_money') {
      // Prefer the admin-selected active provider for mobile money (all providers support it)
      const active = await this.getActiveProvider();
      if (active) {
        logger.info(`Smart routing: Using ${active.name} for mobile money payment (active gateway)`);
        return active;
      }
      // Fallback to any configured mobile-money-capable provider
      for (const name of ['hubtel', 'theteller', 'paystack'] as ProviderName[]) {
        if (this.providers.has(name)) {
          const config = this.providers.get(name)!;
          logger.info(`Smart routing: Using ${name} for mobile money payment (fallback)`);
          return {
            provider: config.provider,
            credentials: config.credentials,
            name,
          };
        }
      }
    }

    // Bank transfer: ALWAYS Paystack — Hubtel/TheTeller do not process bank transfers.
    if (paymentMethod === 'bank_transfer' && this.providers.has('paystack')) {
      const config = this.providers.get('paystack')!;
      logger.info('Smart routing: Using Paystack for bank transfer (only bank-capable provider)');
      return {
        provider: config.provider,
        credentials: config.credentials,
        name: 'paystack',
      };
    }

    // Fallback to default active provider
    logger.info('Smart routing: Using default active provider');
    return this.getActiveProvider();
  }

  /**
   * Get provider for payouts (smart routing)
   * Hubtel supports 24/7 instant mobile money payouts
   * Paystack supports bank transfers but has weekday limitations
   * TheTeller does not support payouts
   */
  async getProviderForPayout(payoutType: 'bank' | 'mobile_money'): Promise<{
    provider: IPaymentProvider;
    credentials: Record<string, string>;
    name: ProviderName;
  } | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (payoutType === 'mobile_money') {
      // Prefer the admin-selected active provider for mobile money payouts.
      // TheTeller doesn't support payouts, so only check hubtel/paystack
      const active = await this.getActiveProvider();
      if (active && (active.name === 'hubtel' || active.name === 'paystack')) {
        logger.info(`Smart routing: Using ${active.name} for mobile money payout (active gateway)`);
        return active;
      }
      // Fallback to whichever is configured — prefer Hubtel for instant 24/7
      for (const name of ['hubtel', 'paystack'] as ProviderName[]) {
        if (this.providers.has(name)) {
          const config = this.providers.get(name)!;
          logger.info(`Smart routing: Using ${name} for mobile money payout (fallback)`);
          return {
            provider: config.provider,
            credentials: config.credentials,
            name,
          };
        }
      }
    }

    if (payoutType === 'bank') {
      // Bank payouts: ALWAYS Paystack when configured — Hubtel/TheTeller do not support bank payouts.
      if (this.providers.has('paystack')) {
        const config = this.providers.get('paystack')!;
        logger.info('Smart routing: Using Paystack for bank payout (only bank-capable provider)');
        return {
          provider: config.provider,
          credentials: config.credentials,
          name: 'paystack',
        };
      }
      logger.warn('No provider available for bank payouts');
      return null;
    }

    // Fallback to default active provider
    return this.getActiveProvider();
  }

  /**
   * Get a specific provider by name
   */
  async getProvider(name: ProviderName): Promise<{ provider: IPaymentProvider; credentials: Record<string, string> } | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const config = this.providers.get(name);
    if (!config) {
      logger.warn(`Provider ${name} not found`);
      return null;
    }

    return {
      provider: config.provider,
      credentials: config.credentials,
    };
  }

  /**
   * Get all available providers
   */
  async getAllProviders(): Promise<Array<{ name: ProviderName; isActive: boolean; priority: number }>> {
    if (!this.initialized) {
      await this.initialize();
    }

    return Array.from(this.providers.entries()).map(([name, config]) => ({
      name,
      isActive: config.isActive,
      priority: config.priority,
    }));
  }

  /**
   * Switch the active payment provider
   */
  async setActiveProvider(name: ProviderName): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const config = this.providers.get(name);
    if (!config) {
      logger.error(`Cannot activate provider ${name}: not configured`);
      return false;
    }

    // Deactivate all providers
    for (const [_, providerConfig] of this.providers.entries()) {
      providerConfig.isActive = false;
    }

    // Activate the selected provider
    config.isActive = true;

    logger.info(`Payment provider switched to ${name}`);
    return true;
  }

  /**
   * Check if a provider is configured and available
   */
  async isProviderAvailable(name: ProviderName): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.providers.has(name);
  }

  /**
   * Reload provider configuration from database
   */
  async reload(): Promise<void> {
    this.initialized = false;
    this.providers.clear();
    await this.initialize();
  }
}

// Export singleton instance
export const paymentProviderRegistry = new PaymentProviderRegistry();
