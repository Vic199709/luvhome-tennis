import http from 'http';
import { handler as membersHandler } from './netlify/functions/members.js';
import { handler as teamsHandler } from './netlify/functions/teams.js';
import { handler as matchesHandler } from './netlify/functions/matches.js';
import { handler as historyHandler } from './netlify/functions/history.js';

const handlers = {
  members: membersHandler,
  teams: teamsHandler,
  matches: matchesHandler,
  history: historyHandler
};

const server = http.createServer(async (req, res) => {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname.startsWith('/.netlify/functions/')) {
    const parts = url.pathname.split('/');
    const funcName = parts[parts.length - 1] || parts[parts.length - 2];
    const cleanFuncName = funcName.replace('.js', '');
    const handler = handlers[cleanFuncName];
    
    if (handler) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const event = {
            httpMethod: req.method,
            body: body,
            headers: req.headers,
            queryStringParameters: Object.fromEntries(url.searchParams)
          };
          
          const result = await handler(event, {});
          
          res.statusCode = result.statusCode || 200;
          if (result.headers) {
            for (const [key, val] of Object.entries(result.headers)) {
              res.setHeader(key, val);
            }
          }
          res.end(result.body);
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: `Function ${cleanFuncName} not found` }));
    }
  } else {
    // Proxy to Astro dev server (which runs on port 4321)
    const proxyReq = http.request({
      host: 'localhost',
      port: 4321,
      path: req.url,
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    req.pipe(proxyReq);
    
    proxyReq.on('error', (err) => {
      res.statusCode = 502;
      res.end('Astro dev server is offline. Please make sure "npm run dev" is running.');
    });
  }
});

const PORT = 8888;
server.listen(PORT, () => {
  console.log(`\n🚀 Unified Dev Server successfully running at http://localhost:${PORT}\n`);
});
