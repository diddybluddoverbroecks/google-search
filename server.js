const { createServer } = require('http');
const parseUrl = require('url').parse;
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store the active room trigger keyword on the server (default: 'message')
let activeSearchKeyword = 'message';

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parseUrl(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  const io = new Server(server);

  io.on('connection', (socket) => {
    // Send current active trigger keyword to newly connected client
    socket.emit('init-keyword', activeSearchKeyword);

    socket.on('join-room', (username) => {
      socket.broadcast.emit('system-message', `${username} joined the chat.`);
    });

    socket.on('send-message', (data) => {
      io.emit('receive-message', data);
    });

    // Handle command to change keyword/password on the server
    socket.on('change-keyword', (newKeyword) => {
      activeSearchKeyword = newKeyword.toLowerCase().trim();
      io.emit('keyword-updated', activeSearchKeyword);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  server.listen(port, () => {
    console.log(`> Server running on http://${hostname}:${port}`);
  });
});
