const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
   
    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } 
    // ADD THIS: Serve video files from src folder
    else if (req.url.startsWith('/src/')) {
        const filePath = path.join(__dirname, req.url);
        const ext = path.extname(filePath).toLowerCase();
        
        // Set content type based on file extension
        const contentTypes = {
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.ogg': 'video/ogg'
        };
        
        const contentType = contentTypes[ext] || 'application/octet-stream';
        
        fs.stat(filePath, (err, stat) => {
            if (err) {
                console.error('File not found:', filePath);
                res.writeHead(404);
                res.end('Video file not found');
                return;
            }
            
            // Support for video streaming (range requests)
            const range = req.headers.range;
            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                const chunksize = (end - start) + 1;
                
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': contentType
                });
                
                const stream = fs.createReadStream(filePath, { start, end });
                stream.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': stat.size,
                    'Content-Type': contentType,
                    'Accept-Ranges': 'bytes'
                });
                
                const stream = fs.createReadStream(filePath);
                stream.pipe(res);
            }
        });
    } 
    else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', function connection(ws) {
    console.log('New client connected. Total clients:', clients.size + 1);
    clients.add(ws);
   
    ws.send('WebSocket server connected');
   
    ws.on('message', function incoming(data) {
        const message = data.toString();
        console.log('Received:', message);
       
        if (message.startsWith('web:')) {
            const command = message.substring(4);
            console.log('From webapp:', command);
           
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(command);
                    console.log('Sent to Unity:', command);
                }
            });
        } else {
            console.log('From Unity/other:', message);
        }
    });
   
    ws.on('close', function close() {
        console.log('Client disconnected. Total clients:', clients.size - 1);
        clients.delete(ws);
    });
   
    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
        clients.delete(ws);
    });
});

const PORT = process.env.PORT || 7000;
server.listen(PORT, '0.0.0.0', () => {
    console.log('\n==============================================');
    console.log('  CPS WebSocket Server Running');
    console.log('==============================================');
    console.log('  HTTP Server: http://localhost:' + PORT);
    console.log('  WebSocket:   ws://localhost:' + PORT);
    console.log('==============================================\n');
});