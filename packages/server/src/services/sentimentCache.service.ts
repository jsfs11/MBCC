/**
 * Sentiment Analysis Caching Service
 * Provides Redis-based caching for ML sentiment analysis results
 * to dramatically improve performance and reduce compute costs.
 */

import Redis from 'ioredis';
import crypto from 'crypto';

interface SentimentResult {
  sentiment: string;
  confidence: number;
  processingTime?: number;
  cachedAt?: string;
  [key: string]: any; // Allow additional fields
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

interface CacheOptions {
  ttl?: number;
  prefix?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  enableStats?: boolean;
}

export class SentimentCacheService {
  private redis: Redis;
  private readonly TTL: number;
  private readonly PREFIX: string;
  private readonly enableStats: boolean;

  constructor(options: CacheOptions = {}) {
    this.TTL = options.ttl || 60 * 60 * 24 * 7; // 7 days default
    this.PREFIX = options.prefix || 'sentiment:';
    this.enableStats = options.enableStats !== false; // Default true

    // Initialize Redis connection with error handling
    this.redis = new Redis({
      host: options.redisHost || process.env.REDIS_HOST || 'localhost',
      port: options.redisPort || parseInt(process.env.REDIS_PORT || '6379'),
      password: options.redisPassword || process.env.REDIS_PASSWORD,
      retryStrategy: (times: number): number | null => {
        if (times > 10) {
          console.error('❌ Redis connection failed after 10 retries');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        console.log(`⏳ Retrying Redis connection in ${delay}ms...`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // Set up event handlers
    this.redis.on('error', (err: Error): void => {
      console.error('❌ Redis Client Error:', err.message);
    });

    this.redis.on('connect', (): void => {
      console.log('✅ Redis connected for sentiment caching');
    });

    this.redis.on('ready', (): void => {
      console.log('✅ Redis ready to accept commands');
    });

    this.redis.on('close', (): void => {
      console.log('🔌 Redis connection closed');
    });

    this.redis.on('reconnecting', (delay: number): void => {
      console.log(`🔄 Redis reconnecting in ${delay}ms`);
    });
  }

  /**
   * Generate consistent hash for text content
   * Uses SHA-256 for collision resistance
   */
  private generateHash(text: string, modelName: string = 'default'): string {
    // Normalize text to ensure consistent hashing
    const normalized = text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Normalize whitespace

    return crypto
      .createHash('sha256')
      .update(`${modelName}:${normalized}`)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter keys
  }

  /**
   * Get cached sentiment if available
   * Returns null if not cached or on error
   */
  async getCachedSentiment(
    text: string,
    modelName?: string
  ): Promise<SentimentResult | null> {
    if (!text || text.trim().length === 0) {
      return null;
    }

    try {
      const hash = this.generateHash(text, modelName);
      const key = `${this.PREFIX}${hash}`;

      const cached = await this.redis.get(key);

      if (cached) {
        // Track cache hit
        if (this.enableStats) {
          await this.incrementStat('hits');
        }

        const result = JSON.parse(cached) as SentimentResult;

        // Add cache metadata
        result.fromCache = true;

        return result;
      }

      // Track cache miss
      if (this.enableStats) {
        await this.incrementStat('misses');
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      // On error, return null to allow fallback to computation
      return null;
    }
  }

  /**
   * Store sentiment analysis result with TTL
   */
  async cacheSentiment(
    text: string,
    result: SentimentResult,
    modelName?: string,
    customTTL?: number
  ): Promise<boolean> {
    if (!text || text.trim().length === 0) {
      return false;
    }

    try {
      const hash = this.generateHash(text, modelName);
      const key = `${this.PREFIX}${hash}`;

      const dataToCache = {
        ...result,
        cachedAt: new Date().toISOString(),
        textLength: text.length,
        modelName: modelName || 'default',
      };

      const ttl = customTTL || this.TTL;

      await this.redis.setex(
        key,
        ttl,
        JSON.stringify(dataToCache)
      );

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      // Fail silently - caching should not break the app
      return false;
    }
  }

  /**
   * Batch get cached sentiments
   * Useful for processing multiple texts efficiently
   */
  async getBatchCached(
    texts: string[],
    modelName?: string
  ): Promise<(SentimentResult | null)[]> {
    if (texts.length === 0) {
      return [];
    }

    try {
      const keys = texts.map(text =>
        `${this.PREFIX}${this.generateHash(text, modelName)}`
      );

      const results = await this.redis.mget(...keys);

      return results.map((cached, index) => {
        if (cached) {
          if (this.enableStats) {
            this.incrementStat('hits');
          }
          const result = JSON.parse(cached) as SentimentResult;
          result.fromCache = true;
          return result;
        } else {
          if (this.enableStats) {
            this.incrementStat('misses');
          }
          return null;
        }
      });
    } catch (error) {
      console.error('Batch cache get error:', error);
      return texts.map(() => null);
    }
  }

  /**
   * Increment a statistics counter
   */
  private async incrementStat(stat: 'hits' | 'misses'): Promise<void> {
    try {
      await this.redis.incr(`stats:cache_${stat}`);
    } catch (error) {
      // Silently fail - stats are not critical
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const [hits, misses] = await Promise.all([
        this.redis.get('stats:cache_hits'),
        this.redis.get('stats:cache_misses'),
      ]);

      const hitsNum = parseInt(hits || '0', 10);
      const missesNum = parseInt(misses || '0', 10);
      const total = hitsNum + missesNum;

      return {
        hits: hitsNum,
        misses: missesNum,
        totalRequests: total,
        hitRate: total > 0 ? (hitsNum / total) * 100 : 0,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        hitRate: 0,
      };
    }
  }

  /**
   * Clear all cache entries
   * Use with caution in production!
   */
  async clearCache(): Promise<number> {
    try {
      const pattern = `${this.PREFIX}*`;
      const keys = await this.scanKeys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      console.log(`🗑️ Cleared ${keys.length} cache entries`);
      return keys.length;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Scan for keys matching pattern (Redis SCAN)
   * More efficient than KEYS for large datasets
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [newCursor, batch] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = newCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Warm cache with frequently used texts
   * Call this on startup with common phrases
   */
  async warmCache(
    preloadData: Array<{
      text: string;
      result: SentimentResult;
      modelName?: string;
    }>
  ): Promise<void> {
    console.log(`🔥 Warming cache with ${preloadData.length} entries...`);

    const results = await Promise.allSettled(
      preloadData.map(item =>
        this.cacheSentiment(item.text, item.result, item.modelName)
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Cache warmed: ${succeeded}/${preloadData.length} entries cached`);
  }

  /**
   * Check if Redis is connected and healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache memory usage info
   */
  async getMemoryInfo(): Promise<{
    usedMemory: string;
    usedMemoryHuman: string;
    memoryFragmentationRatio: number;
  } | null> {
    try {
      const info = await this.redis.info('memory');
      const lines = info.split('\r\n');

      const getField = (field: string): string => {
        const line = lines.find(l => l.startsWith(field));
        return line ? line.split(':')[1] : '';
      };

      return {
        usedMemory: getField('used_memory'),
        usedMemoryHuman: getField('used_memory_human'),
        memoryFragmentationRatio: parseFloat(getField('mem_fragmentation_ratio')),
      };
    } catch (error) {
      console.error('Error getting memory info:', error);
      return null;
    }
  }

  /**
   * Gracefully close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('🔌 Redis connection closed gracefully');
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
      this.redis.disconnect();
    }
  }
}

// Export singleton instance with default config
export const sentimentCache = new SentimentCacheService();

// Also export the class for custom instances
export default SentimentCacheService;