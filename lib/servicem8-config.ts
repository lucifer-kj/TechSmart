// ServiceM8 Configuration Service
// This service dynamically fetches company information from ServiceM8 API
// and provides configuration for any ServiceM8 account

import { ServiceM8Client, ServiceM8Company } from './servicem8';

export interface ServiceM8Config {
  apiKey: string;
  baseUrl: string;
  companyUuid: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  isActive: boolean;
}

export interface ServiceM8ConfigCache {
  config: ServiceM8Config;
  lastFetched: number;
  ttl: number; // Time to live in milliseconds
}

class ServiceM8ConfigService {
  private configCache: Map<string, ServiceM8ConfigCache> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly DEFAULT_BASE_URL = 'https://api.servicem8.com/api_1.0';

  /**
   * Get ServiceM8 configuration for a given API key
   * This will fetch company information from ServiceM8 API if not cached
   */
  async getConfig(apiKey: string): Promise<ServiceM8Config> {
    // Check cache first
    const cached = this.configCache.get(apiKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.config;
    }

    try {
      // Fetch company information from ServiceM8 API
      const config = await this.fetchConfigFromAPI(apiKey);
      
      // Cache the configuration
      this.configCache.set(apiKey, {
        config,
        lastFetched: Date.now(),
        ttl: this.CACHE_TTL
      });

      return config;
    } catch (error) {
      console.error('Failed to fetch ServiceM8 configuration:', error);
      
      // Return a fallback configuration if API fails
      return this.getFallbackConfig(apiKey);
    }
  }

  /**
   * Fetch configuration directly from ServiceM8 API
   */
  private async fetchConfigFromAPI(apiKey: string): Promise<ServiceM8Config> {
    const client = new ServiceM8Client(apiKey);
    
    // Get the first company (most ServiceM8 accounts have one primary company)
    const companies = await client.get<ServiceM8Company[]>('/company.json?$top=1');
    
    if (!companies || companies.length === 0) {
      throw new Error('No companies found in ServiceM8 account');
    }

    const company = companies[0];
    
    return {
      apiKey,
      baseUrl: this.DEFAULT_BASE_URL,
      companyUuid: company.uuid,
      companyName: company.name,
      companyEmail: company.email,
      companyPhone: company.mobile,
      companyAddress: company.address,
      isActive: company.active === 1
    };
  }

  /**
   * Get fallback configuration when API is unavailable
   */
  private getFallbackConfig(apiKey: string): ServiceM8Config {
    return {
      apiKey,
      baseUrl: this.DEFAULT_BASE_URL,
      companyUuid: 'fallback-company-uuid',
      companyName: 'ServiceM8 Company',
      companyEmail: 'contact@company.com',
      companyPhone: '',
      companyAddress: '',
      isActive: true
    };
  }

  /**
   * Check if cached configuration is still valid
   */
  private isCacheValid(cached: ServiceM8ConfigCache): boolean {
    return Date.now() - cached.lastFetched < cached.ttl;
  }

  /**
   * Clear configuration cache (useful for testing or when switching accounts)
   */
  clearCache(apiKey?: string): void {
    if (apiKey) {
      this.configCache.delete(apiKey);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * Get configuration from environment variables with fallback
   */
  async getConfigFromEnv(): Promise<ServiceM8Config | null> {
    const apiKey = process.env.SERVICEM8_API_KEY;
    if (!apiKey) {
      return null;
    }

    return this.getConfig(apiKey);
  }

  /**
   * Validate that an API key can access ServiceM8
   */
  async validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const client = new ServiceM8Client(apiKey);
      // Try to fetch companies to validate the API key
      await client.get<ServiceM8Company[]>('/company.json?$top=1');
      return { valid: true };
    } catch (error) {
      if (error instanceof Error) {
        return { valid: false, error: error.message };
      }
      return { valid: false, error: 'Unknown error occurred' };
    }
  }
}

// Singleton instance
export const serviceM8ConfigService = new ServiceM8ConfigService();

/**
 * Utility function to get ServiceM8 configuration
 * This is the main function to use throughout the app
 */
export async function getServiceM8Config(): Promise<ServiceM8Config | null> {
  return serviceM8ConfigService.getConfigFromEnv();
}

/**
 * Utility function to validate ServiceM8 API key
 */
export async function validateServiceM8ApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  return serviceM8ConfigService.validateApiKey(apiKey);
}

/**
 * Utility function to clear ServiceM8 configuration cache
 */
export function clearServiceM8ConfigCache(apiKey?: string): void {
  serviceM8ConfigService.clearCache(apiKey);
}
