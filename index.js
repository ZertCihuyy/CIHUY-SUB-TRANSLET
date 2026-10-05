import { createServer } from 'http';
import worker from './worker/index.js';

const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  const url = `http://${req.headers.host || 'localhost:' + PORT}${req.url}`;
  
  let bodyStr = '';
  if (req.method === 'POST') {
    for await (const chunk of req) {
      bodyStr += chunk;
    }
  }

  const requestInit = {
    method: req.method,
    headers: req.headers,
  };
  if (req.method === 'POST') requestInit.body = bodyStr;

  const webReq = new Request(url, requestInit);

  try {
    const webRes = await worker.fetch(webReq, {}, {});
    
    const headers = {};
    webRes.headers.forEach((value, key) => headers[key] = value);

    res.writeHead(webRes.status, headers);
    
    if (webRes.body) {
      const reader = webRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`[OP API Subtitle] Server running locally on http://localhost:${PORT}`);
});
