const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store data in memory (in production, use a database)
let sensorData = [];
const MAX_DATA_POINTS = 1000;

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected');
    
    // Send existing data to new client
    ws.send(JSON.stringify({
        type: 'initial',
        data: sensorData
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);
            
            // Add timestamp if not present
            if (!data.timestamp) {
                data.timestamp = new Date().toISOString();
            }
            
            // Store data
            sensorData.push(data);
            
            // Limit stored data points
            if (sensorData.length > MAX_DATA_POINTS) {
                sensorData.shift();
            }
            
            // Broadcast to all connected clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'update',
                        data: data
                    }));
                }
            });
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// REST API endpoints
app.get('/api/data', (req, res) => {
    res.json(sensorData);
});

app.get('/api/data/export', (req, res) => {
    res.json(sensorData);
});

app.post('/api/data', (req, res) => {
    const data = req.body;
    
    // Add timestamp if not present
    if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
    }
    
    sensorData.push(data);
    
    // Limit stored data points
    if (sensorData.length > MAX_DATA_POINTS) {
        sensorData.shift();
    }
    
    // Broadcast to all connected WebSocket clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'update',
                data: data
            }));
        }
    });
    
    res.json({ success: true, message: 'Data received' });
});

app.delete('/api/data', (req, res) => {
    sensorData = [];
    res.json({ success: true, message: 'Data cleared' });
});

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server is ready`);
});
