const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let gameState = {
    players: [],
    currentCategory: "Automarken",
    turnIndex: 0
};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('Ein Spieler ist beigetreten:', socket.id);

    // Spieler zur Liste hinzufügen
    socket.on('joinGame', (username) => {
        gameState.players.push({ id: socket.id, name: username });
        io.emit('updatePlayers', gameState.players); // Alle informieren
    });

    // Wenn ein Spieler eine Antwort sendet
    socket.on('submitAnswer', (answer) => {
        io.emit('newAnswer', { user: socket.id, text: answer });
        // Hier Logik einfügen: Wer ist als nächstes dran?
    });
});

server.listen(3000, () => console.log('Server läuft auf Port 3000'));
