from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import chess
import chess.engine
from fastapi.staticfiles import StaticFiles

# Set the path to your Stockfish binary (using a raw string for Windows paths)
STOCKFISH_PATH = r"C:\Users\Akshat Sinha\OneDrive\Desktop\CHEAT DETECTION CHESS ENGINE\stockfish-windows-x86-64-avx2 (1)\stockfish\stockfish-windows-x86-64-avx2.exe"

# Initialize FastAPI app
app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Welcome to the Chess Cheat Detection API!"}

app.mount("/static", StaticFiles(directory="static"), name="static")
# Allow CORS for React frontend on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Function to get the best move from Stockfish
def get_best_move(board):
    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        # Analyze for a short period (0.1 seconds) for a quick recommendation.
        result = engine.play(board, chess.engine.Limit(time=0.1))
        return result.move

# Endpoint to analyze the best move given a FEN string
@app.post("/analyze")
async def analyze_move(fen: str):
    try:
        board = chess.Board(fen)
        best_move = get_best_move(board)
        return {"best_move": best_move.uci()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Endpoint to check for suspicious play based on deviation analysis
@app.post("/check-cheat")
async def check_cheating(deviation_count: int, total_moves: int):
    try:
        # If more than 80% of moves match the engine's top recommendation, flag it as suspicious.
        if total_moves > 0 and ((total_moves - deviation_count) / total_moves) > 0.8:
            return {"suspicious": True}
        return {"suspicious": False}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
