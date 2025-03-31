from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import chess
import chess.engine
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import logging
import numpy as np
from typing import List, Optional
import joblib
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("cheat_detection")

# Path to Stockfish engine
STOCKFISH_PATH = r"C:\Users\Akshat Sinha\OneDrive\Desktop\CHEAT DETECTION CHESS ENGINE\stockfish-windows-x86-64-avx2 (1)\stockfish\stockfish-windows-x86-64-avx2.exe"

# Path to ML model
MODEL_PATH = "cheat_detection_model.pkl"

# Initialize FastAPI app
app = FastAPI()

# Global variables
model = None
games_data = []

@app.on_event("startup")
async def startup_event():
    # Load ML model if exists
    load_model()

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

# Load ML model
def load_model():
    global model
    try:
        if os.path.exists(MODEL_PATH):
            logger.info(f"Loading existing model from {MODEL_PATH}")
            model = joblib.load(MODEL_PATH)
        else:
            logger.info("No model found. Will train when sufficient data is available.")
            model = None
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        model = None

# Enhanced function to get best move with evaluation
def get_best_move_with_eval(board, depth=15):
    try:
        with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
            # Get the best move
            result = engine.play(board, chess.engine.Limit(depth=depth))
            best_move = result.move
            
            # Get position evaluation
            info = engine.analyse(board, chess.engine.Limit(depth=depth))
            score = info["score"].relative.score(mate_score=10000)
            
            # Calculate position complexity based on number of legal moves and position score
            complexity = len(list(board.legal_moves)) * (abs(score) / 100 if score else 1)
            
            return {
                "best_move": best_move,
                "score": score,
                "complexity": complexity
            }
    except Exception as e:
        logger.error(f"Error analyzing with Stockfish: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Engine analysis error: {str(e)}")

# Get best move (original function preserved for compatibility)
def get_best_move(board):
    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        result = engine.play(board, chess.engine.Limit(time=0.1))
        return result.move

# Pydantic models
class AnalysisRequest(BaseModel):
    fen: str
    depth: Optional[int] = 15

class MoveData(BaseModel):
    fen: str
    move: str
    time_taken: float

class GameMoveSequence(BaseModel):
    moves: List[MoveData]
    player_id: str
    game_id: Optional[str] = None

class CheatCheckRequest(BaseModel):
    deviation_count: int
    total_moves: int
    avg_time: Optional[float] = None
    time_consistency: Optional[float] = None

# Original analyze endpoint (preserved for compatibility)
@app.post("/analyze")
async def analyze_move(fen: str):
    try:
        board = chess.Board(fen)
        best_move = get_best_move(board)
        return {"best_move": best_move.uci()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Enhanced analyze endpoint with depth parameter
@app.post("/analyze-advanced")
async def analyze_move_advanced(request: AnalysisRequest):
    try:
        board = chess.Board(request.fen)
        analysis = get_best_move_with_eval(board, request.depth)
        return {
            "best_move": analysis["best_move"].uci(),
            "score": analysis["score"],
            "complexity": analysis["complexity"]
        }
    except Exception as e:
        logger.error(f"Error in analyze-advanced endpoint: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Enhanced cheat detection
@app.post("/check-cheat")
async def check_cheating(request: CheatCheckRequest):
    try:
        # Basic threshold check (original implementation)
        basic_suspicious = False
        move_match_ratio = 0
        if request.total_moves > 0:
            move_match_ratio = (request.total_moves - request.deviation_count) / request.total_moves
            if move_match_ratio > 0.8:
                basic_suspicious = True
        
        # Advanced check using ML model if available
        advanced_suspicious = False
        confidence = 0.0
        if model is not None and request.avg_time is not None and request.time_consistency is not None:
            # Prepare features for the model
            features = np.array([
                move_match_ratio, 
                request.avg_time,
                request.time_consistency,
                request.total_moves
            ]).reshape(1, -1)
            
            # Make prediction
            try:
                prediction = model.predict(features)[0]
                advanced_suspicious = bool(prediction)
                
                # If model has predict_proba method
                if hasattr(model, 'predict_proba'):
                    confidence = model.predict_proba(features)[0][1]
                else:
                    confidence = 0.9 if advanced_suspicious else 0.1
            except Exception as e:
                logger.error(f"Error making model prediction: {str(e)}")
        
        # Combine results
        is_suspicious = basic_suspicious or advanced_suspicious
        
        return {
            "suspicious": is_suspicious,
            "basic_check": basic_suspicious,
            "advanced_check": advanced_suspicious if model is not None else None,
            "confidence": confidence if model is not None else None,
            "threshold": 0.8,
            "match_ratio": move_match_ratio
        }
    except Exception as e:
        logger.error(f"Error in check-cheat endpoint: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# New endpoint to analyze a game move sequence
@app.post("/analyze-game")
async def analyze_game(game: GameMoveSequence):
    try:
        # Initialize stats
        total_moves = len(game.moves)
        if total_moves == 0:
            return {"error": "No moves provided"}
        
        matching_moves = 0
        move_analyses = []
        times = [move.time_taken for move in game.moves]
        avg_time = sum(times) / total_moves
        time_consistency = np.std(times)
        
        # Analyze each move
        for move in game.moves:
            board = chess.Board(move.fen)
            analysis = get_best_move_with_eval(board)
            is_matching = move.move == analysis["best_move"].uci()
            if is_matching:
                matching_moves += 1
            
            move_analyses.append({
                "fen": move.fen,
                "player_move": move.move,
                "engine_move": analysis["best_move"].uci(),
                "is_matching": is_matching,
                "score": analysis["score"],
                "complexity": analysis["complexity"],
                "time_taken": move.time_taken
            })
        
        # Check if suspicious
        deviation_count = total_moves - matching_moves
        cheat_check = await check_cheating(CheatCheckRequest(
            deviation_count=deviation_count,
            total_moves=total_moves,
            avg_time=avg_time,
            time_consistency=time_consistency
        ))
        
        # Store game data for future model training
        game_data = {
            "player_id": game.player_id,
            "game_id": game.game_id or str(datetime.now().timestamp()),
            "date": datetime.now().isoformat(),
            "total_moves": total_moves,
            "matching_moves": matching_moves,
            "avg_time": avg_time,
            "time_consistency": time_consistency,
            "suspicious": cheat_check["suspicious"],
            "move_analyses": move_analyses
        }
        
        games_data.append(game_data)
        
        # Train model automatically if we have enough data
        if len(games_data) >= 10 and (model is None or len(games_data) % 10 == 0):
            await train_model()
        
        return {
            "total_moves": total_moves,
            "matching_moves": matching_moves,
            "match_ratio": matching_moves / total_moves,
            "avg_time": avg_time,
            "time_consistency": time_consistency,
            "cheat_detection": cheat_check,
            "move_analyses": move_analyses
        }
    except Exception as e:
        logger.error(f"Error in analyze-game endpoint: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# New endpoint to train the model
@app.post("/train-model")
async def train_model():
    global model, games_data
    try:
        if len(games_data) < 10:
            return {"status": "error", "message": "Not enough data to train model. Need at least 10 games."}
        
        # Prepare training data
        X = []
        y = []
        
        for game in games_data:
            # Features: match ratio, avg time, time consistency, total moves
            match_ratio = game['matching_moves'] / game['total_moves']
            X.append([
                match_ratio,
                game['avg_time'],
                game['time_consistency'],
                game['total_moves']
            ])
            y.append(1 if game['suspicious'] else 0)
        
        # Train model
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        
        # Convert to numpy arrays
        X = np.array(X)
        y = np.array(y)
        
        # Split data if we have enough
        accuracy = "N/A"
        if len(X) > 20:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X_train, y_train)
            accuracy = model.score(X_test, y_test)
        else:
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X, y)
        
        # Save model
        joblib.dump(model, MODEL_PATH)
        
        return {
            "status": "success", 
            "message": "Model trained successfully", 
            "games_used": len(games_data),
            "accuracy": accuracy
        }
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        return {"status": "error", "message": str(e)}

# New endpoint to get model statistics
@app.get("/model-stats")
async def get_model_stats():
    return {
        "model_exists": model is not None,
        "games_collected": len(games_data),
        "model_features": ["match_ratio", "avg_time", "time_consistency", "total_moves"],
        "last_trained": os.path.getmtime(MODEL_PATH) if os.path.exists(MODEL_PATH) else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
