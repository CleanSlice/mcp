import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv.find(arg => arg.startsWith('--source='))?.slice(9) || resolve(root, '../docs/docs/architecture'));
const names = ['transactions', 'reliable-operations', 'authorization-context', 'migrations-and-evidence'];
for (const name of names) {
  const expected = `<!-- Generated from docs/docs/architecture/${name}.md. Run scripts/sync-architecture-docs.mjs in the MCP repo. -->\n` + readFileSync(resolve(source, `${name}.md`), 'utf8');
  const target = resolve(root, 'docs/architecture', `${name}.md`);
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== expected) throw new Error(`Documentation drift: ${name}`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, expected);
  }
}
console.log(`Architecture documentation ${process.argv.includes('--check') ? 'verified' : 'synchronized'} (${names.length} pages).`);
