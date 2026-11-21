import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';

const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];

export async function supervise(services) {
  const children = [];
  const stopping = new AbortController();
  let exitCode = 0;

  function stop(code, message) {
    if (stopping.signal.aborted) return;
    exitCode = code;
    if (message) console.error(`[Cartograph] ${message}`);
    stopping.abort();
  }

  const onSignal = () => stop(0);
  for (const signal of signals) process.on(signal, onSignal);
  try {
    for (const service of services) {
      // Launch the actual executable, with no shell or npm wrapper.
      const child = spawn(service.command, service.args, {
        cwd: service.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const closed = new Promise((resolve) => child.once('close', resolve));
      children.push({ child, closed });
      for (const [stream, write] of [[child.stdout, console.log], [child.stderr, console.error]]) {
        const lines = createInterface({ input: stream });
        lines.on('line', (line) => write(`[${service.name}] ${line}`));
      }
      child.on('error', (error) => stop(1,
        error.code === 'ENOENT' && service.notFound ? service.notFound : `${service.name}: ${error.message}`));
      child.once('exit', (code, signal) => stop(1,
        `${service.name} exited unexpectedly (${signal ?? `exit code ${code}`}).`));
      void waitUntilReady(service, stopping.signal).catch((error) => {
        if (!stopping.signal.aborted) stop(1, error.message);
      });
    }

    await new Promise((resolve) => stopping.signal.addEventListener('abort', resolve, { once: true }));
  } finally {
    stopping.abort();
    function terminate(signal) {
      for (const { child } of children) {
        if (child.pid && child.exitCode === null && child.signalCode === null) {
          child.kill(signal);
        }
      }
    }

    terminate('SIGTERM');
    const force = setTimeout(() => terminate('SIGKILL'), 8000);
    try {
      await Promise.all(children.map(({ closed }) => closed));
    } finally {
      clearTimeout(force);
      for (const signal of signals) process.off(signal, onSignal);
    }
  }
  return exitCode;
}

async function waitUntilReady({ name, ready, url }, signal) {
  const deadline = Date.now() + 30_000;
  while (!signal.aborted && Date.now() < deadline) {
    try {
      const response = await fetch(ready, { signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]) });
      await response.body?.cancel();
      if (response.ok) {
        console.log(`[${name}] Ready at ${url}`);
        return;
      }
    } catch {
      // A child can take a few seconds to bind its port and finish starting.
    }
    await delay(250, undefined, { signal });
  }
  if (!signal.aborted) throw new Error(`${name} did not become ready at ${url} within 30 seconds.`);
}
