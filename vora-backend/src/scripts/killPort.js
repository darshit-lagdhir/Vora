import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve port from environment variables or .env file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../.env');

function getPort() {
  let port = 5000;
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^\s*PORT\s*=\s*(.*)?\s*$/m);
    if (match && match[1]) {
      const parsed = parseInt(match[1].trim(), 10);
      if (!isNaN(parsed)) port = parsed;
    }
  }
  return process.env.PORT ? parseInt(process.env.PORT, 10) : port;
}

const port = getPort();
console.log(`[Port Killer] Checking if port ${port} is currently occupied...`);

if (process.platform === 'win32') {
  // Windows port scan and termination
  exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
    if (err || !stdout) {
      console.log(`[Port Killer] Port ${port} is clear and available.`);
      process.exit(0);
    }

    const lines = stdout.split(/\r?\n/);
    const pids = new Set();

    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const localAddress = parts[1];
        // Match exact port pattern (e.g. :5000, .0.0.0:5000, [::]:5000)
        if (
          localAddress.endsWith(`:${port}`) ||
          localAddress.endsWith(`.0.0.0:${port}`) ||
          localAddress.endsWith(`[::]:${port}`)
        ) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        }
      }
    });

    if (pids.size === 0) {
      console.log(`[Port Killer] Port ${port} is occupied but no valid target process PID could be resolved.`);
      process.exit(0);
    }

    console.log(`[Port Killer] Port ${port} is occupied by PID(s): ${Array.from(pids).join(', ')}. Terminating...`);

    const killPromises = Array.from(pids).map((pid) => {
      return new Promise((resolve) => {
        exec(`taskkill /F /PID ${pid}`, (killErr) => {
          if (killErr) {
            console.error(`[Port Killer] Warning: Could not kill process ${pid}: ${killErr.message}`);
          } else {
            console.log(`[Port Killer] Successfully terminated process ${pid}.`);
          }
          resolve();
        });
      });
    });

    Promise.all(killPromises).then(() => {
      // Small cooling period to allow Windows to release the bound socket
      setTimeout(() => {
        process.exit(0);
      }, 500);
    });
  });
} else {
  // UNIX (macOS/Linux) port scan and termination
  exec(`lsof -t -i:${port}`, (err, stdout) => {
    if (err || !stdout) {
      console.log(`[Port Killer] Port ${port} is clear and available.`);
      process.exit(0);
    }

    const pids = stdout.split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
    if (pids.length === 0) {
      process.exit(0);
    }

    console.log(`[Port Killer] Port ${port} is occupied by PID(s): ${pids.join(', ')}. Terminating...`);
    exec(`kill -9 ${pids.join(' ')}`, (killErr) => {
      if (killErr) {
        console.error(`[Port Killer] Warning: Could not terminate processes: ${killErr.message}`);
      } else {
        console.log(`[Port Killer] Successfully terminated processes.`);
      }
      setTimeout(() => {
        process.exit(0);
      }, 500);
    });
  });
}
