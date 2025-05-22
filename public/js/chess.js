const socket = io();
const chess = new Chess();

let PlayerRole = "w";
let username = "Guest";
const boardElement = document.querySelector(".chessboard");
let draggedPiece = null;
let sourceSquare = null;

function showWelcomeAndPrompt() {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white z-50 text-center space-y-4";
    overlay.innerHTML = `
                <h1 class="text-3xl font-bold">Welcome to Chess Game</h1>
                <div id="countdown" class="text-5xl font-bold">3</div> `;
    document.body.appendChild(overlay);

    let count = 3;
    const interval = setInterval(() => {
        count--;
        if (count === 0) {
            clearInterval(interval);
            const name = prompt("Enter your name:") || "Guest";
            username = name;
            socket.emit("setUsername", name);
            document.body.removeChild(overlay);
        } else {
            document.getElementById("countdown").innerText = count;
        }
    }, 1000);
}

showWelcomeAndPrompt();

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";

    // Update turn indicator
    const turnIndicator = document.getElementById("turnIndicator");
    turnIndicator.textContent = chess.turn() === "w" ? "White's turn" : "Black's turn";
    turnIndicator.style.color = chess.turn() === "w" ? "#f0d9b5" : "#b58863";

    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowindex + squareindex) % 2 === 0 ? "light" : "dark");
            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = PlayerRole === square.color && PlayerRole === chess.turn();

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: squareindex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => e.preventDefault());
            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q"
    };
    socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
    if (!piece) return "";

    const blackMap = {
        p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
    };

    const whiteMap = {
        p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔",
    };

    return piece.color === "w" ? whiteMap[piece.type] : blackMap[piece.type];
};

socket.on("playerRole", (role) => {
    PlayerRole = role;
    renderBoard();
});

socket.on("spectatorRole", () => {
    PlayerRole = null;
    renderBoard();
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
    updatePlayerList();
});

socket.on("invalidMove", (move) => {
    alert("Invalid move: " + move.from + " to " + move.to);
});

socket.on("playerList", (players) => {
    updatePlayerList(players);
});

function updatePlayerList(players) {
    let display = document.getElementById("playerDisplay");
    if (!display) {
        display = document.createElement("div");
        display.id = "playerDisplay";
        display.className = "absolute top-4 left-4 text-white space-y-1 bg-black bg-opacity-60 p-2 rounded";
        document.body.appendChild(display);
    }

    // Get current turn from chess.js
    const currentTurn = chess.turn();

    display.innerHTML = `
                <strong>Players:</strong><br>
                ${players.map(player => {
        const isCurrentPlayer = (player.role === "w" && currentTurn === "w") ||
            (player.role === "b" && currentTurn === "b");
        return `<div class="${isCurrentPlayer ? 'active-player' : ''}">
                        👤 ${player.name} (${player.role === "w" ? "White" : "Black"})
                    </div>`;
    }).join("<br>")}
                ${PlayerRole === null ? '<div class="text-gray-400">👤 You are spectating</div>' : ''}
            `;
}

// Initial render
renderBoard();