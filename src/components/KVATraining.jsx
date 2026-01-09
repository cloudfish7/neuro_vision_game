import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audio } from '../utils/AudioSystem';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function KVATraining({ onBack, difficulty }) {
    const [gameState, setGameState] = useState('intro'); // intro, playing, input, feedback, result
    const [target, setTarget] = useState({ value: '', z: 0, x: 0, y: 0 });
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(1);
    const [inputVal, setInputVal] = useState('');
    const [feedback, setFeedback] = useState(null); // 'correct', 'wrong'
    const canvasRef = useRef(null);
    const reqRef = useRef(null);
    const startTimeRef = useRef(0);

    const MAX_ROUNDS = 5;

    // Difficulty settings
    // Digits: Level 1-2: 3, Level 3-5: 4, Level 6-8: 5, Level 9-10: 6
    let digits = 3;
    if (difficulty >= 3) digits = 4;
    if (difficulty >= 6) digits = 5;
    if (difficulty >= 9) digits = 6;

    // Speed: Level 1 = 1.5x base, Level 10 = 6x base
    const speedMultiplier = 1.5 + ((difficulty - 1) * 0.5);

    // Start initialization
    useEffect(() => {
        audio.startBgm('game');
        startRound();
        return () => {
            cancelAnimationFrame(reqRef.current);
            audio.stopBgm();
        };
    }, []);

    const startRound = () => {
        setGameState('playing');
        setInputVal('');
        setFeedback(null);

        // Generate new number
        const val = Math.floor(Math.random() * (Math.pow(10, digits) - Math.pow(10, digits - 1))) + Math.pow(10, digits - 1);

        setTarget({
            value: val.toString(),
            z: 0, // 0 is far, 1 is near
            x: (Math.random() - 0.5) * 100, // Slight random drift
            y: (Math.random() - 0.5) * 100
        });

        startTimeRef.current = performance.now();
        loop();
    };

    const loop = () => {
        const now = performance.now();
        const dt = (now - startTimeRef.current) / 1000; // seconds elapsed

        // Non-linear approach (exponential)
        // We want it to take about 2-3 seconds at level 1, 0.5s at level 10
        const baseDuration = 3.0; // seconds for full travel
        const actualDuration = baseDuration / speedMultiplier;

        const progress = dt / actualDuration;
        const z = Math.pow(progress, 2); // Accelerating

        if (z >= 0.85) {
            // Disappear point (Simulate passing the user or getting too close/fast to focus)
            setGameState('input');
            return;
        }

        setTarget(prev => ({ ...prev, z }));
        reqRef.current = requestAnimationFrame(loop);
    };

    const handleInput = (num) => {
        if (gameState !== 'input') return;
        audio.playSe('click');
        if (inputVal.length < digits) {
            setInputVal(prev => prev + num);
        }
    };

    const handleSubmit = () => {
        if (gameState !== 'input') return;

        if (inputVal === target.value) {
            audio.playSe('success');
            setFeedback('correct');
            setScore(s => s + 100 * difficulty);
        } else {
            audio.playSe('failure');
            setFeedback('wrong');
        }

        setGameState('feedback');
        setTimeout(() => {
            if (round < MAX_ROUNDS) {
                setRound(r => r + 1);
                startRound();
            } else {
                setGameState('result');
            }
        }, 1500);
    };

    const handleBackspace = () => {
        setInputVal(prev => prev.slice(0, -1));
        audio.playSe('click');
    };

    // Render logic for the numbers
    const scale = 0.1 + (target.z * 1.5); // Grows big
    const opacity = Math.min(1, target.z * 2); // Fades in
    const blur = (1 - target.z) * 10; // Blurs when far

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
                <div style={{ fontSize: '1.5rem', fontFamily: 'monospace' }}>{score}</div>
                <div className="label">ROUND {round}/{MAX_ROUNDS}</div>
            </div>

            {/* GAME VIEW */}
            {gameState === 'playing' && (
                <div style={{
                    position: 'relative',
                    transform: `scale(${scale}) translate(${target.x}px, ${target.y}px)`,
                    opacity: opacity,
                    filter: `blur(${blur}px)`,
                    fontSize: '8rem',
                    fontWeight: 'bold',
                    color: '#fff',
                    textShadow: '0 0 50px var(--primary)',
                    willChange: 'transform, opacity, filter'
                }}>
                    {target.value}
                </div>
            )}

            {/* INPUT PHASE */}
            {gameState === 'input' && (
                <div className="glass-panel animate-enter" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ marginBottom: '1rem' }}>What did you see?</h2>
                    <div style={{
                        fontSize: '3rem',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '1rem 2rem',
                        borderRadius: '12px',
                        minWidth: '200px',
                        textAlign: 'center',
                        border: '2px solid var(--primary-dim)',
                        color: 'var(--primary)',
                        letterSpacing: '0.5rem',
                        marginBottom: '1rem'
                    }}>
                        {inputVal || '_'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                            <button key={n} className="btn-secondary" style={{ fontSize: '1.5rem', padding: '1rem 1.5rem' }} onClick={() => handleInput(n)}>{n}</button>
                        ))}
                        <button className="btn-secondary" style={{ fontSize: '1.5rem', color: '#ff5555' }} onClick={handleBackspace}>Del</button>
                        <button className="btn-secondary" style={{ fontSize: '1.5rem' }} onClick={() => handleInput(0)}>0</button>
                        <button className="btn-primary" style={{ fontSize: '1.2rem' }} onClick={handleSubmit}>OK</button>
                    </div>
                </div>
            )}

            {/* FEEDBACK */}
            {gameState === 'feedback' && (
                <div className="animate-enter flex-center col">
                    <div style={{
                        fontSize: '5rem',
                        color: feedback === 'correct' ? 'var(--success)' : 'var(--error)',
                        textShadow: '0 0 30px currentColor'
                    }}>
                        {feedback === 'correct' ? 'PERFECT' : 'MISS'}
                    </div>
                    {feedback === 'wrong' && <div className="label">Answer: {target.value}</div>}
                </div>
            )}

            {/* RESULT */}
            {gameState === 'result' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem' }}>
                    <h2 className="display-text" style={{ fontSize: '2rem' }}>SESSION COMPLETE</h2>
                    <div style={{ fontSize: '4rem', margin: '2rem 0', color: 'var(--primary)' }}>{score} pts</div>
                    <button className="btn-primary" onClick={onBack} style={{ display: 'flex', gap: '0.5rem' }}>
                        <RefreshCw /> Return to Menu
                    </button>
                </div>
            )}
        </div>
    );
}
