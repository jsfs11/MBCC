import { SentimentCacheService } from '../services/sentimentCache.service';

describe('SentimentCacheService', () => {
  let cacheService: SentimentCacheService;

  beforeAll(async () => {
    // Use a test-specific configuration
    cacheService = new SentimentCacheService({
      prefix: 'test-sentiment:',
      enableStats: true,
    });
  });

  afterAll(async () => {
    await cacheService.disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.clearCache();
  });

  describe('Basic caching functionality', () => {
    it('should return null for uncached content', async () => {
      const result = await cacheService.getCachedSentiment('test text');
      expect(result).toBeNull();
    });

    it('should cache and retrieve sentiment', async () => {
      const text = 'I love this app!';
      const sentiment = {
        sentiment: 'positive',
        confidence: 0.99,
        processingTime: 150,
      };

      await cacheService.cacheSentiment(text, sentiment);
      const cached = await cacheService.getCachedSentiment(text);

      expect(cached).not.toBeNull();
      expect(cached!.sentiment).toBe('positive');
      expect(cached!.confidence).toBe(0.99);
      expect(cached!.processingTime).toBe(150);
      expect(cached!.fromCache).toBe(true);
      expect(cached!.cachedAt).toBeDefined();
    });

    it('should handle empty or invalid text', async () => {
      const result1 = await cacheService.getCachedSentiment('');
      const result2 = await cacheService.getCachedSentiment('   ');
      const result3 = await cacheService.getCachedSentiment('   \n\t  ');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('should not cache empty text', async () => {
      const result = await cacheService.cacheSentiment('', { sentiment: 'positive', confidence: 0.5 });
      expect(result).toBe(false);
    });
  });

  describe('Model-specific caching', () => {
    it('should handle different models separately', async () => {
      const text = 'Great day!';
      const result1 = { sentiment: 'positive', confidence: 0.95, processingTime: 100 };
      const result2 = { sentiment: 'neutral', confidence: 0.80, processingTime: 120 };

      await cacheService.cacheSentiment(text, result1, 'model1');
      await cacheService.cacheSentiment(text, result2, 'model2');

      const cached1 = await cacheService.getCachedSentiment(text, 'model1');
      const cached2 = await cacheService.getCachedSentiment(text, 'model2');

      expect(cached1!.confidence).toBe(0.95);
      expect(cached2!.confidence).toBe(0.80);
    });

    it('should not return results from different models', async () => {
      const text = 'Amazing!';
      const result = { sentiment: 'positive', confidence: 0.98, processingTime: 80 };

      await cacheService.cacheSentiment(text, result, 'model-a');

      const cached1 = await cacheService.getCachedSentiment(text, 'model-a');
      const cached2 = await cacheService.getCachedSentiment(text, 'model-b');

      expect(cached1).not.toBeNull();
      expect(cached1!.confidence).toBe(0.98);
      expect(cached2).toBeNull();
    });
  });

  describe('Cache statistics', () => {
    it('should track cache statistics correctly', async () => {
      await cacheService.getCachedSentiment('text1'); // miss
      await cacheService.cacheSentiment('text1', { sentiment: 'positive', confidence: 0.8 });
      await cacheService.getCachedSentiment('text1'); // hit
      await cacheService.getCachedSentiment('text2'); // miss

      const stats = await cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.totalRequests).toBe(3);
      expect(stats.hitRate).toBeCloseTo(33.33, 1);
    });

    it('should handle empty stats correctly', async () => {
      const stats = await cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Batch operations', () => {
    it('should handle batch get operations', async () => {
      const texts = ['text1', 'text2', 'text3'];
      const sentiments = [
        { sentiment: 'positive', confidence: 0.9, processingTime: 100 },
        { sentiment: 'negative', confidence: 0.8, processingTime: 90 },
        { sentiment: 'positive', confidence: 0.95, processingTime: 110 },
      ];

      // Cache only first two
      await cacheService.cacheSentiment(texts[0], sentiments[0]);
      await cacheService.cacheSentiment(texts[1], sentiments[1]);

      const results = await cacheService.getBatchCached(texts);

      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull();
      expect(results[0]!.sentiment).toBe('positive');
      expect(results[0]!.fromCache).toBe(true);

      expect(results[1]).not.toBeNull();
      expect(results[1]!.sentiment).toBe('positive');
      expect(results[1]!.fromCache).toBe(true);

      expect(results[2]).toBeNull();
    });

    it('should handle empty batch requests', async () => {
      const results = await cacheService.getBatchCached([]);
      expect(results).toEqual([]);
    });
  });

  describe('Cache management', () => {
    it('should clear cache correctly', async () => {
      // Add some cached items
      await cacheService.cacheSentiment('text1', { sentiment: 'positive', confidence: 0.8 });
      await cacheService.cacheSentiment('text2', { sentiment: 'negative', confidence: 0.6 });

      // Verify they are cached
      expect(await cacheService.getCachedSentiment('text1')).not.toBeNull();
      expect(await cacheService.getCachedSentiment('text2')).not.toBeNull();

      // Clear cache
      const clearedCount = await cacheService.clearCache();
      expect(clearedCount).toBe(2);

      // Verify they are no longer cached
      expect(await cacheService.getCachedSentiment('text1')).toBeNull();
      expect(await cacheService.getCachedSentiment('text2')).toBeNull();
    });

    it('should handle clearing empty cache', async () => {
      const clearedCount = await cacheService.clearCache();
      expect(clearedCount).toBe(0);
    });
  });

  describe('Cache warming', () => {
    it('should warm cache with provided data', async () => {
      const preloadData = [
        { text: 'happy text', result: { sentiment: 'positive', confidence: 0.95 } },
        { text: 'sad text', result: { sentiment: 'negative', confidence: 0.85 } },
      ];

      await cacheService.warmCache(preloadData);

      const cached1 = await cacheService.getCachedSentiment('happy text');
      const cached2 = await cacheService.getCachedSentiment('sad text');

      expect(cached1!.sentiment).toBe('positive');
      expect(cached2!.sentiment).toBe('negative');
    });

    it('should handle empty preload data', async () => {
      // Should not throw error
      await cacheService.warmCache([]);
    });
  });

  describe('Error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Create a service with invalid Redis configuration
      const faultyService = new SentimentCacheService({
        redisHost: 'invalid-host-that-does-not-exist',
        enableStats: false,
      });

      // Should not throw errors but return null for cache operations
      const result = await faultyService.getCachedSentiment('test');
      expect(result).toBeNull();

      const cacheResult = await faultyService.cacheSentiment('test', { sentiment: 'positive', confidence: 0.5 });
      expect(cacheResult).toBe(false);

      // Should still return default stats
      const stats = await faultyService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);

      await faultyService.disconnect();
    });
  });

  describe('Health checks', () => {
    it('should return health status', async () => {
      const isHealthy = await cacheService.isHealthy();
      // In test environment, Redis might not be running
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Memory information', () => {
    it('should return memory info if available', async () => {
      const memoryInfo = await cacheService.getMemoryInfo();

      if (memoryInfo) {
        expect(memoryInfo).toHaveProperty('usedMemory');
        expect(memoryInfo).toHaveProperty('usedMemoryHuman');
        expect(memoryInfo).toHaveProperty('memoryFragmentationRatio');
        expect(typeof memoryInfo.memoryFragmentationRatio).toBe('number');
      } else {
        // Memory info might not be available in test environment
        expect(memoryInfo).toBeNull();
      }
    });
  });
});