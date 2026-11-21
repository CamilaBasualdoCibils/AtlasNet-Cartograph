import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atlasNetConfig } from '../web/scripts/atlasnet-config.mjs';
import { writePrometheusConfig } from './prometheus-config.mjs';
import { supervise } from './supervise.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const web = resolve(root, 'web');
const host = '127.0.0.1';

function portSetting(name, fallback) {
  const value = process.env[name] ?? String(fallback);
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a TCP port between 1 and 65535.`);
  }
  return port;
}

function checkPort(port, name) {
  const server = createServer();
  return new Promise((done, reject) => {
    server.once('error', (error) => reject(new Error(error.code === 'EADDRINUSE'
      ? `${name} port ${host}:${port} is already in use. Stop the other session or choose a different port.`
      : `Cannot bind ${name} to ${host}:${port}: ${error.message}`)));
    server.listen(port, host, () => server.close(done));
  });
}

async function main() {
  const { discovery } = atlasNetConfig();
  const enabled = process.env.CARTOGRAPH_PROMETHEUS_ENABLED ?? 'true';
  if (enabled !== 'true' && enabled !== 'false') {
    throw new Error('CARTOGRAPH_PROMETHEUS_ENABLED must be true or false.');
  }

  const production = process.argv.includes('--production');
  let frontend = [resolve(web, 'scripts/serve.mjs')];
  const webPort = portSetting('CARTOGRAPH_WEB_PORT', 5173);
  if (!production) {
    try {
      const require = createRequire(resolve(web, 'package.json'));
      const vite = resolve(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
      frontend = [vite, '--host', host, '--port', String(webPort), '--strictPort'];
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') throw error;
      throw new Error('Vite is missing. Run npm install from the Cartograph repository root.');
    }
  }

  const webURL = `http://${host}:${webPort}`;
  const services = [{
    name: 'Cartograph',
    command: process.execPath,
    args: frontend,
    cwd: web,
    url: webURL,
    ready: webURL,
  }];
  await checkPort(webPort, 'Cartograph');

  if (enabled === 'true') {
    const metricsPort = portSetting('PROMETHEUS_PORT', 9090);
    if (metricsPort === webPort) throw new Error('Vite and Prometheus must use different ports.');
    await checkPort(metricsPort, 'Prometheus');
    const data = resolve(root, process.env.PROMETHEUS_DATA_DIR || '.cartograph/prometheus');
    await mkdir(data, { recursive: true });
    const generated = resolve(data, 'cartograph-scrape.yml');
    await writePrometheusConfig(
      resolve(root, process.env.PROMETHEUS_CONFIG || 'monitoring/prometheus.yml'), generated, discovery);
    const executable = process.env.PROMETHEUS_EXECUTABLE || 'prometheus';
    const metricsURL = `http://${host}:${metricsPort}`;
    services.unshift({
      name: 'Prometheus',
      command: executable,
      args: [
        `--config.file=${generated}`,
        `--storage.tsdb.path=${data}`,
        `--storage.tsdb.retention.time=${process.env.PROMETHEUS_RETENTION || '15d'}`,
        `--web.listen-address=${host}:${metricsPort}`,
      ],
      cwd: root,
      url: metricsURL,
      ready: `${metricsURL}/-/ready`,
      notFound: `Prometheus executable "${executable}" was not found. Install Prometheus and add it to PATH, or set PROMETHEUS_EXECUTABLE to its absolute path. Set CARTOGRAPH_PROMETHEUS_ENABLED=false for an external server.`,
    });
  }

  process.exitCode = await supervise(services);
}

try {
  await main();
} catch (error) {
  console.error(`[Cartograph] ${error.message}`);
  process.exitCode = 1;
}
