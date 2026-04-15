const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let gameState = {
    players: [], 
    currentCategoryName: "Warte auf Host...",
    activePlayerIndex: 0
};

io.on('connection', (socket) => {
    
    // SPIELER TRITT BEI
    socket.on('joinGame', (username) => {
        const newPlayer = {
            id: socket.id,
            name: username,
            answers: [],
            reports: [],         
            isDeactivated: false 
        };
        gameState.players.push(newPlayer);
        io.emit('updateState', gameState);
    });

    // NEU: KATEGORIE SETZEN (Nur für den Host/Ersten Spieler)
    socket.on('setCategory', (customCategory) => {
        if (gameState.players.length > 0 && socket.id === gameState.players[0].id) {
            gameState.currentCategoryName = customCategory || "Allgemein";
            // Runde für alle zurücksetzen
            gameState.players.forEach(p => p.answers = []);
            gameState.activePlayerIndex = 0;
            io.emit('updateState', gameState);
        }
    });

    // VETO / REPORT LOGIK
    socket.on('toggleReport', (targetId) => {
        const target = gameState.players.find(p => p.id === targetId);
        const reporterId = socket.id;

        if (target && targetId !== reporterId) {
            if (target.reports.includes(reporterId)) {
                target.reports = target.reports.filter(id => id !== reporterId);
            } else {
                target.reports.push(reporterId);
            }

            const neededVotes = gameState.players.length - 1;
            if (neededVotes > 0 && target.reports.length >= neededVotes) {
                target.isDeactivated = true;
                // Falls der Spieler gerade dran war, zum nächsten springen
                if (gameState.players[gameState.activePlayerIndex].id === targetId) {
                    moveToNextPlayer();
                }
            } else {
                target.isDeactivated = false;
            }
            io.emit('updateState', gameState);
        }
    });

    // ANTWORT SENDEN
    socket.on('submitAnswer', (answer) => {
        const currentPlayer = gameState.players[gameState.activePlayerIndex];
        
        if (currentPlayer && socket.id === currentPlayer.id && !currentPlayer.isDeactivated && answer.trim().length > 0) {
            // Sicherheit: Auf Server-Seite Text nach 50 Zeichen kappen
            currentPlayer.answers.push(answer.substring(0, 50));
            moveToNextPlayer();
            io.emit('updateState', gameState);
        }
    });

    // HILFSFUNKTION: Zum nächsten aktiven Spieler springen
    function moveToNextPlayer() {
        if (gameState.players.length === 0) return;
        let startIndex = gameState.activePlayerIndex;
        do {
            gameState.activePlayerIndex = (gameState.activePlayerIndex + 1) % gameState.players.length;
        } while (gameState.players[gameState.activePlayerIndex].isDeactivated && gameState.activePlayerIndex !== startIndex);
    }

    socket.on('disconnect', () => {
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        // Falls der Index nun ins Leere zeigt
        if (gameState.activePlayerIndex >= gameState.players.length) {
            gameState.activePlayerIndex = 0;
        }
        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
