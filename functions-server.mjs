// Lightweight local server that serves all Netlify functions
// Usage: node functions-server.mjs
import { createServer } from 'http';
import { URL } from 'url';

const PORT = 8889;
const FUNCTIONS = ['matches', 'members', 'teams', 'history', 'settings', 'login', 'admin-auth', 'debug-stats'];

const handlers = {};
for (const name of FUNCTIONS) {
  try {
    const mod = await import(`./netlify/functions/${name}.js`);
    handlers[name] = mod.handler;
    console.log(`✓ loaded: ${name}`);
  } catch (e) {
    console.warn(`✗ skipped: ${name} — ${e.message}`);
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const match = url.pathname.match(/^\/\.netlify\/functions\/([^/]+)/);
  const name = match?.[1];

  if (!name || !handlers[name]) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: `Function "${name}" not found` }));
  }

  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', async () => {
    const body = chunks.length ? Buffer.concat(chunks).toString() : null;
    const params = Object.fromEntries(url.searchParams);
    const event = {
      httpMethod: req.method,
      path: url.pathname,
      queryStringParameters: params,
      headers: req.headers,
      body,
      isBase64Encoded: false
    };
    try {
      const result = await handlers[name](event, {});
      res.writeHead(result.statusCode || 200, result.headers || {});
      res.end(result.body || '');
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}).listen(PORT, () => console.log(`Functions server: http://localhost:${PORT}/.netlify/functions/<name>`));
