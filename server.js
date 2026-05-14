// Custom Next.js server with Socket.IO integration
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Dynamically import Socket.IO server (handles CJS/ESM interop)
  const { initSocket } = require('./src/lib/socketServer.cjs');
  initSocket(httpServer);

  httpServer.listen(port, () => {
    console.log(`\n🎮 RPS Arena Server`);
    console.log(`   Ready at http://${hostname}:${port}`);
    console.log(`   Socket.IO initialized\n`);
  });
});
