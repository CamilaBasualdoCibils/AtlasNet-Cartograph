import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { atlasNetConfig } from './atlasnet-config.mjs';

export function runtimeConfigScript() {
  const { endpoint } = atlasNetConfig();
  return `window.cartographConfig = ${JSON.stringify({ endpoint })};\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { writeFileSync(new URL('../dist/runtime-config.js', import.meta.url), runtimeConfigScript()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
