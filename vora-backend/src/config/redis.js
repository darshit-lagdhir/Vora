import { createClient } from 'redis';
import config from './env.js';

let isPassThrough = true;
let client = null;

if (config.NODE_ENV !== 'test') {
  try {
    client = createClient({
      url: config.REDIS_URL,
      socket: {
        reconnectStrategy(retries) {
          const delay = retries * 100;
          return Math.min(delay, 3000);
        }
      }
    });

    client.on('error', (err) => {
      if (!isPassThrough) {
        console.warn(`[Redis Error] Connection or operational failure: ${err.message}. Running in pass-through mode.`);
      }
      isPassThrough = true;
    });

    client.on('connect', () => {
      console.log('[Redis Connect] Client connecting to Redis...');
    });

    client.on('ready', () => {
      console.log('[Redis Ready] Redis client is connected and ready to process commands.');
      isPassThrough = false;
    });

    client.connect().catch((err) => {
      console.warn(`[Redis Warning] Failed to connect to Redis. Running in pass-through mode. Error: ${err.message}`);
      isPassThrough = true;
    });
  } catch (err) {
    console.warn(`[Redis Initialization Warning] Redis setup failed. Running in pass-through mode. Error: ${err.message}`);
    isPassThrough = true;
  }
} else {
  isPassThrough = true;
}

// Testing Hook Helpers
export function setRedisPassThroughForTesting(val) {
  isPassThrough = val;
}

export function setMockClientForTesting(mock) {
  client = mock;
}

export async function cacheGet(key) {
  if (isPassThrough || !client || !client.isOpen) {
    return null;
  }
  try {
    return await client.get(key);
  } catch (err) {
    console.warn(`[Redis Error] Failed to GET key "${key}": ${err.message}`);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds) {
  if (isPassThrough || !client || !client.isOpen) {
    return false;
  }
  try {
    if (ttlSeconds) {
      await client.set(key, value, { EX: ttlSeconds });
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (err) {
    console.warn(`[Redis Error] Failed to SET key "${key}": ${err.message}`);
    return false;
  }
}

export async function cacheDel(key) {
  if (isPassThrough || !client || !client.isOpen) {
    return false;
  }
  try {
    await client.del(key);
    return true;
  } catch (err) {
    console.warn(`[Redis Error] Failed to DEL key "${key}": ${err.message}`);
    return false;
  }
}

export async function cacheScanKeys(pattern) {
  if (isPassThrough || !client || !client.isOpen) {
    return [];
  }
  try {
    const keys = [];
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    return keys;
  } catch (err) {
    try {
      const keys = [];
      let cursor = 0;
      do {
        const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = Number(reply.cursor || 0);
        keys.push(...(reply.keys || []));
      } while (cursor !== 0);
      return keys;
    } catch (innerErr) {
      console.warn(`[Redis Error] Failed to SCAN keys with pattern "${pattern}": ${innerErr.message}`);
      return [];
    }
  }
}

export function isRedisPassThrough() {
  return isPassThrough;
}

export { client };
