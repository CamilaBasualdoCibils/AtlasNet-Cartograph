import { readFile, rename, writeFile } from 'node:fs/promises';

export async function writePrometheusConfig(template, destination, discovery) {
  const contents = await readFile(template, 'utf8');
  const generated = contents.replace(/^([ \t]+- url: ).+ # cartograph-discovery$/m,
    (_, prefix) => prefix + JSON.stringify(discovery));
  if (generated === contents) throw new Error('Prometheus template is missing its discovery URL marker.');
  const previous = await readFile(destination, 'utf8').catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (previous === generated) return;
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, generated);
  await rename(temporary, destination);
}
