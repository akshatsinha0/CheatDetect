import React, { useState, useRef, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { motion } from 'framer-motion';

const TempChessBoard = ({
  moves,
  setMoves,
  totalMoves,
  setTotalMoves,
  deviationCount,
  setDeviationCount,
}) => {
  const [game, setGame] = useState(new Chess());
  const [position, setPosition] = useState('start');
  const [cheatMessage, setCheatMessage] = useState('');
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [gameStats, setGameStats] = useState(null);
  const lastMoveTimeRef = useRef(Date.now());

  // Flip the board's orientation
  const flipBoard = () => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  // onDrop: process player's move, compare with Stockfish's recommended move, and check for game over.
  const onDrop = async (sourceSquare, targetSquare) => {
    try {
      if (!sourceSquare || !targetSquare) {
        throw new Error('Invalid source or target square.');
      }

      // Calculate time taken for this move
      const now = Date.now();
      const timeTaken = (now - lastMoveTimeRef.current) / 1000; // Convert to seconds
      lastMoveTimeRef.current = now; // Reset timer for next move

      // Get current FEN before making the move.
      const fenBefore = game.fen();

      // Call the /analyze-advanced endpoint to get Stockfish's recommended move.
      let recommendedMove = '';
      let moveComplexity = 0;
      let positionScore = 0;
      
      try {
        const analyzeResponse = await fetch('http://127.0.0.1:8000/analyze-advanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fen: fenBefore,
            depth: 15  // You can adjust the depth for more accurate analysis
          }),
        });
        if (!analyzeResponse.ok) {
          throw new Error('Analyze endpoint returned an error.');
        }
        const analyzeData = await analyzeResponse.json();
        recommendedMove = analyzeData.best_move;
        moveComplexity = analyzeData.complexity;
        positionScore = analyzeData.score;
        
        console.log('Position complexity:', moveComplexity);
        console.log('Position evaluation:', positionScore);
      } catch (err) {
        // Fallback to basic analyze endpoint if advanced fails
        try {
          const analyzeResponse = await fetch('http://127.0.0.1:8000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fen: fenBefore }),
          });
          if (!analyzeResponse.ok) {
            throw new Error('Analyze endpoint returned an error.');
          }
          const analyzeData = await analyzeResponse.json();
          recommendedMove = analyzeData.best_move;
        } catch (fallbackErr) {
          console.error('Error calling fallback /analyze:', fallbackErr);
        }
      }

      const piece = game.get(sourceSquare);
      if (!piece) {
        throw new Error('No piece exists at the source square.');
      }

      // Attempt to make the player's move.
      let move;
      if (piece.type === 'p' && (targetSquare.endsWith('8') || targetSquare.endsWith('1'))) {
        move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });
      } else {
        move = game.move({
          from: sourceSquare,
          to: targetSquare,
        });
      }

      if (!move) {
        throw new Error(`Invalid move from ${sourceSquare} to ${targetSquare}.`);
      }

      // Update the board position.
      setGame(new Chess(game.fen())); // Update state properly
      setPosition(game.fen());
      setTotalMoves((prev) => prev + 1);

      // If we got a recommended move, compare it.
      if (recommendedMove) {
        const playerMoveUci = `${sourceSquare}${targetSquare}${move.promotion || ''}`;
        if (playerMoveUci !== recommendedMove) {
          setDeviationCount((prev) => prev + 1);
        }
      } else {
        console.warn('No recommended move available; skipping deviation check.');
      }

      // Record the move with additional data
      const moveData = {
        ...move,
        timeTaken: timeTaken,
        fen: fenBefore,
        complexity: moveComplexity,
        evaluation: positionScore
      };
      setMoves((prev) => [...prev, moveData]);

      // Check if the game is over.
      if (game.isGameOver()) {
        let resultMessage = 'Game Over: ';
        if (game.isCheckmate()) {
          const winner = game.turn() === 'w' ? 'Black' : 'White';
          resultMessage += `Checkmate! ${winner} wins.`;
        } else if (game.isStalemate()) {
          resultMessage += 'Stalemate.';
        } else if (game.isDraw()) {
          resultMessage += 'Draw.';
        } else if (game.isThreefoldRepetition()) {
          resultMessage += 'Draw by threefold repetition.';
        } else if (game.isInsufficientMaterial()) {
          resultMessage += 'Draw due to insufficient material.';
        }
        setMoves((prev) => [...prev, { san: resultMessage, piece: '' }]);
      }
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  };

  // Finish game: call backend /analyze-game endpoint
  const finishGame = async () => {
    try {
      // First, prepare the game moves data with time information
      const gameData = {
        moves: moves.filter(move => move.fen && move.from && move.to).map(move => ({
          fen: move.fen,
          move: `${move.from}${move.to}${move.promotion || ''}`,
          time_taken: move.timeTaken || 1.0
        })),
        player_id: "player1", // You can use a unique identifier for the player
      };

      // Send the entire game for analysis
      const response = await fetch('http://127.0.0.1:8000/analyze-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData),
      });

      if (!response.ok) {
        // Fallback to basic cheat detection if advanced fails
        return fallbackCheatDetection();
      }

      const data = await response.json();
      console.log('Received response:', data);
      setGameStats(data);

      // Handle the more detailed response
      if (data.cheat_detection.suspicious) {
        let message = 'Potential cheating detected!';
        if (data.cheat_detection.confidence) {
          message += ` (Confidence: ${Math.round(data.cheat_detection.confidence * 100)}%)`;
        }
        setCheatMessage(message);
      } else {
        setCheatMessage('Game completed. No cheating detected.');
      }
    } catch (error) {
      console.error('Error with advanced game analysis:', error);
      // Fall back to basic cheat detection
      fallbackCheatDetection();
    }
  };

  // Fallback to basic cheat detection
  const fallbackCheatDetection = async () => {
    try {
      const payload = { deviation_count: deviationCount, total_moves: totalMoves };
      console.log('Falling back to /check-cheat with payload:', payload);
      const response = await fetch('http://127.0.0.1:8000/check-cheat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server responded with an error:', errorText);
        throw new Error('Server error');
      }

      const data = await response.json();
      console.log('Received basic response:', data);

      if (data.suspicious) {
        setCheatMessage('Potential cheating detected in this game!');
      } else {
        setCheatMessage('Game completed. No cheating detected.');
      }
    } catch (error) {
      console.error('Error with fallback cheat detection:', error);
      setCheatMessage('Error checking game status.');
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold mb-4">Play a Game</h2>
      <motion.div
        className="bg-white p-6 rounded-lg shadow-2xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Chessboard
          position={position}
          onPieceDrop={onDrop}
          boardWidth={500}
          boardOrientation={boardOrientation}
          customDarkSquareStyle={{ backgroundColor: '#3e4c59', borderRadius: '4px' }}
          customLightSquareStyle={{ backgroundColor: '#cbd5e1', borderRadius: '4px' }}
          animationDuration={300}
        />
      </motion.div>
      <div className="flex space-x-4 mt-4">
        <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" onClick={finishGame}>
          Finish Game
        </button>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={flipBoard}>
          Flip Board
        </button>
      </div>
      
      {cheatMessage && (
        <div className="mt-4 p-4 bg-gray-800 text-white rounded-lg">
          <h3 className="text-xl font-bold mb-2">{cheatMessage}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Moves: {totalMoves}</div>
            <div>Matching Engine: {totalMoves - deviationCount}</div>
            <div>Match Ratio: {totalMoves > 0 ? ((totalMoves - deviationCount) / totalMoves * 100).toFixed(1) + '%' : '0%'}</div>
          </div>
        </div>
      )}
      
      {gameStats && (
        <div className="mt-4 p-4 bg-gray-700 text-white rounded-lg w-full max-w-xl">
          <h3 className="text-lg font-bold mb-2">Advanced Statistics</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Average Move Time: {gameStats.avg_time?.toFixed(2)}s</div>
            <div>Time Consistency: {gameStats.time_consistency?.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TempChessBoard;
