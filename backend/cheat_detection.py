from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import chess
import chess.engine
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Set the path to your Stockfish binary (using a raw string for Windows paths)
STOCKFISH_PATH = r"C:\Users\Akshat Sinha\OneDrive\Desktop\CHEAT DETECTION CHESS ENGINE\stockfish-windows-x86-64-avx2 (1)\stockfish\stockfish-windows-x86-64-avx2.exe"

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Welcome to the Chess Cheat Detection API!"}

app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_best_move(board):
    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        result = engine.play(board, chess.engine.Limit(time=0.1))
        return result.move

@app.post("/analyze")
async def analyze_move(fen: str):
    try:
        board = chess.Board(fen)
        best_move = get_best_move(board)
        return {"best_move": best_move.uci()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Pydantic model for cheat check request
class CheatCheckRequest(BaseModel):
    deviation_count: int
    total_moves: int

@app.post("/check-cheat")
async def check_cheating(request: CheatCheckRequest):
    try:
        deviation_count = request.deviation_count
        total_moves = request.total_moves
        # If more than 80% of moves match Stockfish’s top recommendation, flag as suspicious.
        if total_moves > 0 and ((total_moves - deviation_count) / total_moves) > 0.8:
            return {"suspicious": True}
        return {"suspicious": False}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
