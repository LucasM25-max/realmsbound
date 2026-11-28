import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

function walkFiles(target, out = []) {
  if (!fs.existsSync(target)) return out;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target).sort()) {
      walkFiles(path.join(target, entry), out);
    }
  } else {
    out.push({ path: target, mtimeMs: stat.mtimeMs });
  }
  return out;
}

function getBuildInfo() {
  const hash = crypto.createHash('sha1');
  let newest = 0;
  for (const rel of ['js', 'css', 'index.html']) {
    for (const file of walkFiles(path.join(__dirname, rel))) {
      newest = Math.max(newest, file.mtimeMs);
      hash.update(path.relative(__dirname, file.path));
      hash.update(String(file.mtimeMs));
    }
  }
  const id = hash.digest('hex').slice(0, 7);
  const d = new Date(newest || Date.now());
  const built = d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '');
  return { id, built };
}

const app = express();

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.url.startsWith('/b/')) {
    req.url = req.url.replace(/^\/b\/[^/?#]+/, '') || '/';
  }
  next();
});

app.get(['/', '/index.html'], (_req, res) => {
  const { id, built } = getBuildInfo();
  const raw = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  const html = raw.replaceAll('__BUILD__', id).replaceAll('__BUILT__', built);
  res.type('text/html; charset=utf-8').send(html);
});

app.use(express.static(__dirname, { index: false }));

app.listen(PORT, HOST, () => {
  console.log(`Realmsbound server listening on http://${HOST}:${PORT}`);
});
