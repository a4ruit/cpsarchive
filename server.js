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
    } else {
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