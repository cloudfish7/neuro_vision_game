import React, { useState, useEffect } from 'react';
import MainMenu from './components/MainMenu';
import KVATraining from './components/KVATraining';
import DVATraining from './components/DVATraining';
import MomentaryTraining from './components/MomentaryTraining';
import DepthTraining from './components/DepthTraining';
import PeripheralTraining from './components/PeripheralTraining';
import ReactionTraining from './components/ReactionTraining';
import CoordinationTraining from './components/CoordinationTraining';
import ReflexTapTraining from './components/ReflexTapTraining';
import { audio } from './utils/AudioSystem';

function App() {
  const [currentMode, setCurrentMode] = useState(null);
  const [difficulty, setDifficulty] = useState(1);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Audio Context requires user interaction to start
  useEffect(() => {
    const unlockAudio = () => {
      audio.init();
      setHasInteracted(true);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const renderMode = () => {
    switch (currentMode) {
      case 'kva':
        return <KVATraining onBack={() => setCurrentMode(null)} difficulty={difficulty} />;
      case 'dva':
        return <DVATraining onBack={() => setCurrentMode(null)} difficulty={difficulty} />;
      case 'momentary':
        return <MomentaryTraining onBack={() => setCurrentMode(null)} difficulty={difficulty} />;
      case 'depth':
        return <DepthTraining onBack={() => setCurrentMode(null)} difficulty={difficulty} />;
      case 'peripheral':
        return <PeripheralTraining onBack={() => setCurrentMode(null)} difficulty={difficulty} />;
      case 'reaction':
        return <ReactionTraining onBack={() => setCurrentMode(null)} difficulty={difficulty} />;
      case 'coordination':
        return <CoordinationTraining onBack={() => setCurrentMode(null)} difficulty={difficulty} />;
      case 'reflex_tap':
        return <ReflexTapTraining onBack={() => setCurrentMode(null)} difficulty={difficulty} />;
      default:
        return (
          <div className="flex-center col" style={{ height: '100%', color: 'var(--text-muted)' }}>
            <h2>Under Construction</h2>
            <button className="btn-secondary" onClick={() => setCurrentMode(null)}>Back</button>
          </div>
        );
    }
  };

  return (
    <div className="full-screen">
      {/* Visual Overlay Effects */}
      <div className="scanlines"></div>
      <div style={{
        position: 'absolute',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 243, 255, 0.05) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 0
      }}></div>

      {!currentMode ? (
        <MainMenu
          onStartMode={setCurrentMode}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
        />
      ) : renderMode()}

      {!hasInteracted && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20,
          background: 'rgba(0,0,0,0.8)',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          fontSize: '0.8rem',
          color: '#aaa',
          border: '1px solid #333'
        }}>
          Click anywhere to enable audio
        </div>
      )}
    </div>
  );
}

export default App;
