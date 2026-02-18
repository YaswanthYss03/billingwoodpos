import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client: Redis; // Make public for advanced operations
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connection established');
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis connection error:', err);
      });
    } else {
      this.logger.warn('Redis URL not configured, caching disabled');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  /**
   * Check if Redis is available and responsive
   */
  async isAvailable(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.warn('Redis connection check failed:', error.message);
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting pattern ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking key ${key}:`, error);
      return false;
    }
  }

  // Tenant-specific cache key helpers
  getTenantKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}`;
  }

  async getTenantCache<T>(tenantId: string, key: string): Promise<T | null> {
    return this.get<T>(this.getTenantKey(tenantId, key));
  }

  async setTenantCache(tenantId: string, key: string, value: any, ttlSeconds?: number): Promise<void> {
    return this.set(this.getTenantKey(tenantId, key), value, ttlSeconds);
  }

  async delTenantCache(tenantId: string, key: string): Promise<void> {
    return this.del(this.getTenantKey(tenantId, key));
  }

  async clearTenantCache(tenantId: string): Promise<void> {
    return this.delPattern(`tenant:${tenantId}:*`);
  }

  /**
   * Increment a counter atomically (useful for bill numbers, etc.)
   * Returns the new value after increment
   */
  async increment(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis client not available');
    }
    
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get current value of a counter (returns 0 if not exists)
   */
  async getCounter(key: string): Promise<number> {
    if (!this.client) return 0;
    
    try {
      const value = await this.client.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      this.logger.error(`Error getting counter ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set a counter value with optional TTL (expires at end of day/month)
   */
  async setCounter(key: string, value: number, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value.toString());
      } else {
        await this.client.set(key, value.toString());
      }
    } catch (error) {
      this.logger.error(`Error setting counter ${key}:`, error);
    }
  }

  /**
   * Set if not exists (atomic operation)
   * Returns true if set, false if key already existed
   */
  async setnx(key: string, value: string): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const result = await this.client.setnx(key, value);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error setnx key ${key}:`, error);
      return false;
    }
  }
}
