const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Spiel-Daten
const categories = ["Stadt", "Land", "Fluss", "männlicher Vorname", "Farbe", "Beruf", "Tier"];
let gameState = {
    players: [], // { id, name, answers: [] }
    categoryIndex: 0,
    activePlayerIndex: 0,
    gameStarted: false
};

io.on('connection', (socket) => {
    console.log('Verbindung:', socket.id);

    // Spieler tritt bei
    socket.on('joinGame', (username) => {
        const newPlayer = {
            id: socket.id,
            name: username,
            answers: []
        };
        gameState.players.push(newPlayer);
        io.emit('updateState', gameState);
    });

    // Kategorie wechseln
    socket.on('nextCategory', () => {
        gameState.categoryIndex = (gameState.categoryIndex + 1) % categories.length;
        // Bei neuer Kategorie Antworten leeren und von vorne anfangen
        gameState.players.forEach(p => p.answers = []);
        gameState.activePlayerIndex = 0;
        io.emit('updateState', gameState);
    });

    // Antwort senden
    socket.on('submitAnswer', (answer) => {
        const currentPlayer = gameState.players[gameState.activePlayerIndex];
        
        // Prüfen, ob der richtige Spieler gesendet hat
        if (socket.id === currentPlayer.id) {
            currentPlayer.answers.push(answer);
            
            // Nächster Spieler ist dran
            gameState.activePlayerIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;
            
            io.emit('updateState', gameState);
        }
    });

    // Trennung behandeln
    socket.on('disconnect', () => {
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        if (gameState.activePlayerIndex >= gameState.players.length) {
            gameState.activePlayerIndex = 0;
        }
        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
