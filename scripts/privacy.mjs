// Gate G3: scans the built site for anything that must not be published.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));

// Design-history folders that must never reach the published site.
const localOnlyFolders = ['explorations', 'phase-2', 'phase-2-5', 'phase-2-6'];
let leaked = 0;
for (const folder of localOnlyFolders) {
  try {
    statSync(join(root, folder));
    console.log(`FAIL local-only folder in dist: ${folder}/`);
    leaked++;
  } catch {
    // not present, which is what we want
  }
}
if (leaked) process.exit(1);

const rules = [
  { name: 'private repository link', pattern: /github\.com\/Casper5253\/(?:quantlab|personal-finance-cockpit|algo-trading[\w-]*|usage-overlay[\w-]*|fde-[\w-]+|semiconductor[\w-]*)/gi },
  { name: 'local Windows path', pattern: /[A-Z]:\\(?:Users|Program Files)\\[^\s"'<]*/g },
  { name: 'local POSIX home path', pattern: /\/(?:Users|home)\/caspe\b[^\s"'<]*/g },
  // Tool-default folders such as ~/.claude/skills are public documentation; session, auth and project stores are not.
  { name: 'vault or agent data path', pattern: /FDE Knowledge|\.claude[\\/]projects|\.codex[\\/](?:sessions|auth)|\.herdr-team|opencode[\\/]auth|opencode\.db/g },
  { name: 'email other than the approved one', pattern: /\b(?!casper5253@gmail\.com\b)[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { name: 'secret-looking token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/g },
  { name: 'bank or broker name', pattern: /\b(?:Rabobank|ING Bank|DBS|DEGIRO|Endowus|Alpaca)\b/g },
  { name: 'unfilled placeholder', pattern: /TODO\(/g },
  { name: 'internal verify note', pattern: /verify:|LinkedIn could not be read/gi },
  { name: 'to-confirm placeholder', pattern: /\[to confirm/gi },
];

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(html|xml|txt|json|js|css|svg)$/.test(name)) files.push(path);
  }
};
walk(root);

let found = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      found++;
      console.log(`FAIL ${rule.name}: ${relative(root, file)}: ${match[0].slice(0, 80)}`);
    }
  }
}

// No private screenshot may ship, wherever it was left in public/.
const privateImage = /(?:finance|usage-overlay)/i;
const imageWalk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) imageWalk(path);
    else if (/\.(?:png|jpe?g|webp|gif|svg|avif)$/i.test(name) && privateImage.test(name)) {
      found++;
      console.log(`FAIL private image name: ${relative(root, path)}`);
    }
  }
};
imageWalk(root);

console.log(found ? `privacy: ${found} findings in ${files.length} files` : `privacy ok: ${files.length} files scanned`);
process.exit(found ? 1 : 0);
