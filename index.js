const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const chess = new Chess();
let player = {}; // { white: socketId, black: socketId }
let players = []; // [{ id, name, role }]

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess game" });
});

io.on("connection", (socket) => {
    console.log("User connected: " + socket.id);

    socket.on("setUsername", (username) => {
        let role = null;

        if (!player.white) {
            player.white = socket.id;
            role = "w";
        } else if (!player.black) {
            player.black = socket.id;
            role = "b";
        }

        players.push({ id: socket.id, name: username, role });

        if (role) {
            socket.emit("playerRole", role);
        } else {
            socket.emit("spectatorRole");
        }

        sendPlayerList();
        socket.emit("boardState", chess.fen());
    });

    socket.on("disconnect", () => {
        console.log("User disconnected: " + socket.id);
        players = players.filter(p => p.id !== socket.id);

        if (socket.id === player.white) delete player.white;
        if (socket.id === player.black) delete player.black;

        sendPlayerList();
    });

    socket.on("move", (move) => {
        try {
            const currentTurn = chess.turn();
            if (currentTurn === "w" && socket.id !== player.white) return;
            if (currentTurn === "b" && socket.id !== player.black) return;

            const result = chess.move(move);
            if (result) {
                io.emit("boardState", chess.fen());
            } else {
                socket.emit("invalidMove", move);
            }
        } catch {
            socket.emit("invalidMove", move);
        }
    });

    function sendPlayerList() {
        io.emit("playerList", players.map(p => ({
            name: p.name,
            role: p.role
        })));
    }
});

server.listen(8000, () => {
    console.log("Server running on port 8000");
});
