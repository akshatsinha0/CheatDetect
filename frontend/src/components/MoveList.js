// src/components/MoveList.js
import React from 'react';

// Optional: mapping for piece icons; adjust as needed.
const pieceIcons = {
  p: '♙',
  n: '♘',
  b: '♗',
  r: '♖',
  q: '♕',
  k: '♔',
};

function MoveList({ moves }) {
  // Group moves into pairs: white (even indices) and black (odd indices)
  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <div className="bg-gray-900 text-gray-100 p-4 rounded shadow w-80 ml-auto">
      <h2 className="text-lg font-bold mb-3">Live Moves</h2>
      {/* Container with fixed max height and vertical scrolling */}
      <div className="overflow-y-scroll" style={{ maxHeight: '400px' }}>
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">#</th>
              <th className="px-2 py-1 text-left">White</th>
              <th className="px-2 py-1 text-left">Black</th>
            </tr>
          </thead>
          <tbody>
            {movePairs.map((pair, index) => (
              <tr key={index} className="hover:bg-gray-800">
                <td className="px-2 py-1 text-center">{pair.moveNumber}.</td>
                <td className="px-2 py-1">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-1">
                      {pair.white?.piece &&
                        pieceIcons[pair.white.piece.toLowerCase()] && (
                          <span className="text-lg">
                            {pieceIcons[pair.white.piece.toLowerCase()]}
                          </span>
                        )}
                      <span>{pair.white?.san || ''}</span>
                    </div>
                    {pair.white?.elapsed !== undefined && (
                      <div className="text-xs text-gray-400">
                        {pair.white.elapsed.toFixed(1)}s
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center justify-end space-x-1">
                      <span>{pair.black?.san || ''}</span>
                      {pair.black?.piece &&
                        pieceIcons[pair.black.piece.toLowerCase()] && (
                          <span className="text-lg">
                            {pieceIcons[pair.black.piece.toLowerCase()]}
                          </span>
                        )}
                    </div>
                    {pair.black?.elapsed !== undefined && (
                      <div className="text-xs text-gray-400">
                        {pair.black.elapsed.toFixed(1)}s
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MoveList;
