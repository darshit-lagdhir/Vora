import http from 'http';
import https from 'https';

const TARGET_HOST = process.argv[2] || 'localhost';
const TARGET_PORT = parseInt(process.argv[3] || '5000', 10);
const TARGET_PATHS = [
  '/',
  '/api/v1/explore',
  '/health'
];

console.log('================================================================================');
console.log(`[Cache Warmer] Priming edge caches for target: http://${TARGET_HOST}:${TARGET_PORT}`);
console.log('================================================================================');

const warmRoute = (path) => {
  return new Promise((resolve) => {
    const options = {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: path,
      method: 'GET',
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'VoraEdgeCacheWarmer/1.0.0 (Global Edge Warm)'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`[Cache Warmer] GET ${path} — Status: ${res.statusCode} (Time: ${new Date().toISOString()})`);
      res.resume(); // consume response data to free socket
      resolve();
    });

    req.on('error', (err) => {
      console.error(`[Cache Warmer] FAIL ${path} — Error: ${err.message}`);
      resolve();
    });

    req.end();
  });
};

const runWarmSequence = async () => {
  const tasks = TARGET_PATHS.map(path => warmRoute(path));
  await Promise.all(tasks);
  console.log('================================================================================');
  console.log('[Cache Warmer] Cache priming sequence successfully executed.');
  console.log('================================================================================');
};

runWarmSequence();
