import { cacheScanKeys, cacheDel } from '../config/redis.js';
import logger from './loggerService.js';

/**
 * Sweeps and purges all cached keys belonging to a specific collection domain.
 * @param {string} domain - The target namespace domain (e.g. 'events' or 'analytics').
 */
export async function triggerCachePurge(domain) {
  if (!domain) {
    logger.warn({ module: 'cacheInvalidationService.js' }, 'No domain tag provided for cache purge.');
    return;
  }
  
  try {
    const pattern = `*:domain:${domain}`;
    const keys = await cacheScanKeys(pattern);
    
    if (keys && keys.length > 0) {
      logger.info({ module: 'cacheInvalidationService.js', domain, count: keys.length }, `Found cached keys matching domain for eviction.`);
      await Promise.all(keys.map((key) => cacheDel(key)));
      logger.info({ module: 'cacheInvalidationService.js', domain }, `Successfully evicted all keys for domain.`);
    } else {
      logger.info({ module: 'cacheInvalidationService.js', domain }, `No keys found to evict for domain.`);
    }
  } catch (err) {
    logger.error({ module: 'cacheInvalidationService.js', domain, err: err.message }, 'Error during cache sweep for domain');
  }
}
