const express = require('express');
const http = require('http');
const WebSocketServer = require('websocket').server;
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false 
});

let items = [
    { name: "Lamborghini Countach 1988", initialBid: 200 },
    { name: "BMW E30 M3", initialBid: 80 },
    { name: "Renault Megane 2003", initialBid: 50 },
];

let players = {}; 
let connections = {}; 
let currentIdx = 0;
let auction = { ...items[0], highestBid: items[0].initialBid, winner: null };
let timer = 15;

const broadcast = (data) => {
    const msg = JSON.stringify(data);
    Object.values(connections).forEach(conn => {
        if (conn.connected) conn.sendUTF(msg);
    });
};

setInterval(() => {
    if (timer > 0) timer--;
    else {
        if (auction.winner && players[auction.winner]) {
            const winnerId = auction.winner;
            players[auction.winner].coins -= auction.highestBid;

            if (!players[winnerId].wonItems) players[winnerId].wonItems = [];
            players[winnerId].wonItems.push(auction.name); 
        }
        currentIdx = (currentIdx + 1) % items.length;
        auction = { ...items[currentIdx], highestBid: items[currentIdx].initialBid, winner: null };
        timer = 15;
        broadcast({ type: 'UPDATE_PLAYERS', data: Object.values(players) });
    }
    broadcast({ type: 'TICK', data: { auction, timer } });
}, 1000);

app.post('/api/register', (req, res) => {
    res.json({ name: req.body.name, coins: 300 });
});

app.post('/rpc/bid', (req, res) => {
    const { id, amount } = req.body;
    if (players[id] && amount > auction.highestBid && players[id].coins >= amount) {
        auction.highestBid = amount;
        auction.winner = id;
        broadcast({ type: 'TICK', data: { auction, timer } });
        return res.json({ success: true });
    }
    res.status(400).json({ error: "Invalide" });
});

wsServer.on('request', (request) => {
    const connection = request.accept(null, request.origin);
    const id = Math.random().toString(36).substring(7);
    connections[id] = connection;

    connection.on('message', (message) => {
        if (message.type === 'utf8') {
            const parsed = JSON.parse(message.utf8Data);
            if (parsed.type === 'JOIN') {
                players[id] = { ...parsed.data, id, wonItems: [] };
                connection.sendUTF(JSON.stringify({ type: 'WELCOME', id }));
                broadcast({ type: 'UPDATE_PLAYERS', data: Object.values(players) });
            }
        }
    });

    connection.on('close', () => {
        delete players[id];
        delete connections[id];
        broadcast({ type: 'UPDATE_PLAYERS', data: Object.values(players) });
    });
});

server.listen(4000, () => console.log("Serveur OK sur 4000"));