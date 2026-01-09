import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/AudioSystem';
import { ArrowLeft, RefreshCw, Target } from 'lucide-react';

export default function DepthTraining({ onBack, difficulty }) {
    const [gameState, setGameState] = useState('intro'); // intro, playing, result
    const [round, setRound] = useState(1);
    const [scores, setScores] = useState([]); // Array of errors in mm
    const [rodPosition, setRodPosition] = useState(0); // -1 (far) to 1 (near), 0 is aligned
    const [lastResult, setLastResult] = useState(null); // { error, diff }

    const reqRef = useRef(null);
    const startTimeRef = useRef(0);
    const movingForwardRef = useRef(true);

    const MAX_ROUNDS = 5;
    const RANGE_MM = 100; // The virtual range of movement in mm (+/-)

    // Difficulty settings
    // Faster movement at higher levels
    const cycleDuration = Math.max(1000, 4000 - (difficulty * 300)); // Period of one full sway

    useEffect(() => {
        audio.startBgm('game');
        startRound();

        const handleKeyDown = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                handleStop();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            cancelAnimationFrame(reqRef.current);
            audio.stopBgm();
        };
    }, []);

    const startRound = () => {
        setGameState('playing');
        setLastResult(null);
        startTimeRef.current = performance.now();
        // Random start direction
        movingForwardRef.current = Math.random() > 0.5;
        // Random start offset phase? Maybe just start from far back (-1)

        loop();
    };

    const loop = () => {
        const now = performance.now();
        const elapsed = now - startTimeRef.current;

        // Sine wave motion for smooth back an forth
        // We want it to go from -1 to 1 and back
        // sin(t) goes -1 to 1.

        const freq = (2 * Math.PI) / cycleDuration;
        const val = Math.sin(elapsed * 0.001 * (10000 / cycleDuration));
        // Wait, simple calculation:
        // progress = (elapsed % duration) / duration
        // let's use Math.cos to start at one end if we want

        // Let's implement a simple linear movement with ease-in-out at ends for realism?
        // Or just simple Sine wave is most natural for "Three Rod Test" machine.

        // We want 0 to be the center. 
        // Amplitude 1.2 to ensure it goes past the alignment point significantly
        const rawPos = Math.sin(elapsed * 0.002 * (difficulty > 5 ? 1.5 : 1));

        // Map so that it spends time passing through 0
        setRodPosition(rawPos);

        reqRef.current = requestAnimationFrame(loop);
    };

    const handleStop = () => {
        if (gameState !== 'playing') return;

        cancelAnimationFrame(reqRef.current);

        // Calculate Error
        // rodPosition 0 is perfect.
        // Let's map rodPosition (-1 to 1) to mm (-100mm to 100mm)
        // But visualized scaling is non-linear usually, but let's assume linear mapping for score
        const errorRaw = rodPosition * 40; // Max error approx 40mm visually simulated
        const errorMm = parseFloat(errorRaw.toFixed(1));
        const absError = Math.abs(errorMm);

        let points = 0;
        let judgment = '';

        // Scoring logic (Professional Level standard)
        // < 2mm is excellent
        if (absError <= 2.0) {
            points = 200;
            judgment = 'PERFECT';
            audio.playSe('success');
        } else if (absError <= 5.0) {
            points = 150;
            judgment = 'GREAT';
            audio.playSe('success');
        } else if (absError <= 10.0) {
            points = 100;
            judgment = 'GOOD';
            audio.playSe('click');
        } else if (absError <= 20.0) {
            points = 50;
            judgment = 'FAIR';
            audio.playSe('failure');
        } else {
            points = 0;
            judgment = 'MISS';
            audio.playSe('failure');
        }

        setLastResult({ error: errorMm, points, judgment });
        setScores(prev => [...prev, points]);

        setTimeout(() => {
            if (round < MAX_ROUNDS) {
                setRound(r => r + 1);
                startRound();
            } else {
                setGameState('result');
                audio.stopBgm();
            }
        }, 2000);
    };

    const getTotalScore = () => scores.reduce((a, b) => a + b, 0);
    const getAverageError = () => {
        // If we stored errors instead of points it would be easier, but let's just show Total Score
        return scores.length > 0 ? Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    };

    // Visualization params
    // Rods are rectangles.
    // Center rod scale varies.
    const baseHeight = 300;
    const baseWidth = 20;

    // Scale factor: 1.0 is aligned. 0.5 is far, 1.5 is near.
    // rodPosition 0 -> 1.0
    // rodPosition -1 -> 0.7
    // rodPosition 1 -> 1.3
    const centerScale = 1.0 + (rodPosition * 0.3);

    // Color hint? (Optional, maybe for lower difficulties)
    // No, keep it visual only.

    return (
        <div className="game-container flex-center col">
            {/* HUD */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>
            </div>
            <div style={{ position: 'absolute', top: 20, right: 20, textAlign: 'right', zIndex: 10 }}>
                <div className="label">SCORE</div>
                <div style={{ fontSize: '1.5rem', fontFamily: 'monospace' }}>{getTotalScore()}</div>
                <div className="label">ROUND {round}/{MAX_ROUNDS}</div>
            </div>

            <div className="label" style={{ position: 'absolute', top: 100, opacity: 0.7 }}>
                PRESS SPACE / TAP SCREEN TO ALIGN
            </div>

            {/* GAME AREA */}
            <div
                style={{
                    display: 'flex',
                    gap: '100px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    perspective: '1000px',
                    cursor: 'pointer'
                }}
                onClick={handleStop}
            >
                {/* Left Rod (Fixed) */}
                <div style={{
                    width: baseWidth,
                    height: baseHeight,
                    background: '#fff',
                    borderRadius: '10px',
                    boxShadow: '0 0 20px rgba(255,255,255,0.2)'
                }} />

                {/* Center Rod (Moving) */}
                <div style={{
                    width: baseWidth,
                    height: baseHeight,
                    background: lastResult ? (Math.abs(lastResult.error) < 5 ? 'var(--success)' : 'var(--error)') : 'var(--primary)',
                    borderRadius: '10px',
                    transform: `scale(${centerScale})`,
                    opacity: 0.8 + (centerScale * 0.2), // Brighter when closer
                    boxShadow: `0 0 ${20 * centerScale}px var(--primary-dim)`,
                    transition: lastResult ? 'all 0.3s' : 'none', // Snap color change
                }} />

                {/* Right Rod (Fixed) */}
                <div style={{
                    width: baseWidth,
                    height: baseHeight,
                    background: '#fff',
                    borderRadius: '10px',
                    boxShadow: '0 0 20px rgba(255,255,255,0.2)'
                }} />
            </div>

            {/* RESULT/FEEDBACK OVERLAY */}
            {lastResult && gameState !== 'result' && (
                <div className="animate-enter flex-center col" style={{ position: 'absolute', bottom: '15%' }}>
                    <div style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: Math.abs(lastResult.error) < 5 ? 'var(--success)' : 'var(--error)'
                    }}>
                        {lastResult.judgment}
                    </div>
                    <div style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>
                        {lastResult.error > 0 ? `+${lastResult.error} mm (Near)` : `${lastResult.error} mm (Far)`}
                    </div>
                </div>
            )}

            {/* FINAL RESULT */}
            {gameState === 'result' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem', zIndex: 20, position: 'absolute' }}>
                    <h2 className="display-text" style={{ fontSize: '2rem' }}>SESSION COMPLETE</h2>
                    <div style={{ fontSize: '4rem', margin: '2rem 0', color: 'var(--primary)' }}>{getTotalScore()} pts</div>
                    <button className="btn-primary" onClick={onBack} style={{ display: 'flex', gap: '0.5rem' }}>
                        <RefreshCw /> Return to Menu
                    </button>
                </div>
            )}
        </div>
    );
}
