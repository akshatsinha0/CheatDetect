import React, { useState, useEffect } from 'react';
import TempChessBoard from './components/TempChessBoard';
import MoveList from './components/MoveList';
import './styles/global.css';
import './styles/custom.css';

// Dynamically import the Svelte web component
// import('../svelte-dashboard/public/build/main.js');

function App() {
  const [moves, setMoves] = useState([]);
  const [totalMoves, setTotalMoves] = useState(0);
  const [deviationCount, setDeviationCount] = useState(0);

  useEffect(() => {
    if (!document.querySelector('script[src="/svelte-dashboard/bundle.js"]')) {
      const script = document.createElement("script");
      script.src = "/svelte-dashboard/bundle.js";
      script.type = "module";
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);
  return (
    
    <div className="min-h-screen w-full bg-cyan-500 flex flex-col">
      
      {/* Header */}
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <h1 className="bungee-tint-regular text-4xl font-bold text-blue-800">
          Chess Cheat Detector
        </h1>
        <nav>
          <ul className="flex space-x-6 text-gray-700 bungee-tint-regular">
            <li className="hover:text-blue-500 cursor-pointer">Home</li>
            <li className="hover:text-blue-500 cursor-pointer">Features</li>
            <li className="hover:text-blue-500 cursor-pointer">Contact</li>
          </ul>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex flex-grow p-4">
        {/* Left Column: Chess Board */}
        <div className="flex-1 flex justify-center items-start">
          <TempChessBoard 
            moves={moves} 
            setMoves={setMoves} 
            totalMoves={totalMoves} 
            setTotalMoves={setTotalMoves}
            deviationCount={deviationCount}
            setDeviationCount={setDeviationCount}
          />
        </div>

        {/* Right Column: Live Moves Panel */}
        <div className="move-panel-center ml-4">
          <MoveList moves={moves} />
        </div>

        {/* Embedded Svelte Dashboard */}
        <div className="svelte-dashboard-container">
        <div id="svelte-app"></div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer-custom bungee-tint-regular text-gray-600">
        &copy; {new Date().getFullYear()} Chess Cheat Detector. All rights reserved.
      </footer>
    </div>
  );
}

export default App;
