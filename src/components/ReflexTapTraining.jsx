import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/AudioSystem';
import { ArrowLeft, RefreshCw, CircleDot } from 'lucide-react';

export default function ReflexTapTraining({ onBack, difficulty }) {
    const [gameState, setGameState] = useState('intro'); // intro, playing, result
    const [score, setScore] = useState(0); // Number of circles tapped
    const [timeLeft, setTimeLeft] = useState(20);
    const [target, setTarget] = useState(null); // { id, x, y, size }

    const timerRef = useRef(null);
    const containerRef = useRef(null);
    const startTimeRef = useRef(0);

    const GAME_DURATION = 20; // seconds

    // Difficulty Logic
    // Size: Level 1 = 100px, Level 10 = 30px
    const baseSize = Math.max(30, 100 - (difficulty * 7));

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            audio.stopBgm();
        };
    }, []);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setTimeLeft(GAME_DURATION);
        audio.startBgm('game');
        startTimeRef.current = performance.now();

        spawnTarget();

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    finishGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const spawnTarget = () => {
        // Avoid HUD area (Top Right: Score/Time)
        // HUD is roughly top 80px, right 200px.
        // Let's define safe area more generally: 
        // Padding 50px from edges.
        // Top-Right exclusion zone: x > 70%, y < 15%

        const padding = 10;
        let valid = false;
        let x, y;

        // Try to find a valid position
        while (!valid) {
            x = padding + Math.random() * (100 - padding * 2);
            y = padding + Math.random() * (100 - padding * 2);

            // Check exclusion zone (Top Right HUD)
            // Assuming HUD takes up roughly 250px width and 100px height.
            // In percentages, let's say Top 15% and Right 30% are risky.
            if (x > 60 && y < 15) {
                continue;
            }

            // Also exclude Top Left Back Button zone? (Left 15%, Top 10%)
            if (x < 20 && y < 10) {
                continue;
            }

            valid = true;
        }

        setTarget({
            id: Date.now(),
            x,
            y,
            size: baseSize
        });
    };

    const handleTap = (e) => {
        e.stopPropagation(); // Prevent container click if needed
        if (gameState !== 'playing') return;

        audio.playSe('click');
        setScore(s => s + 1);
        spawnTarget();
    };

    const finishGame = () => {
        setGameState('result');
        setTarget(null);
        audio.stopBgm();
        audio.playSe('success');
    };

    return (
        <div className="game-container flex-center col" ref={containerRef}>
            {/* HUD */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>
            </div>

            {/* STATUS DISPLAY (Avoid this area for spawning) */}
            <div style={{ position: 'absolute', top: 20, right: 20, textAlign: 'right', zIndex: 10 }}>
                <div className="label">SCORE</div>
                <div style={{ fontSize: '2rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{score}</div>
                <div className="label" style={{ marginTop: '0.5rem' }}>TIME</div>
                <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', color: timeLeft <= 5 ? 'var(--error)' : 'white' }}>
                    {timeLeft}s
                </div>
            </div>

            {/* Intro */}
            {gameState === 'intro' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem' }}>
                    <CircleDot size={48} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <h2>REFLEX TAP</h2>
                    <p className="label" style={{ margin: '1rem 0' }}>Tap the circles as fast as you can!</p>
                    <button className="btn-primary" onClick={startGame}>START</button>
                </div>
            )}

            {/* Target Circle */}
            {gameState === 'playing' && target && (
                <div
                    onMouseDown={handleTap} // Desktop simple click
                    onTouchStart={handleTap} // Mobile touch response (faster than click)
                    style={{
                        position: 'absolute',
                        left: `${target.x}%`,
                        top: `${target.y}%`,
                        width: `${target.size}px`,
                        height: `${target.size}px`,
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        boxShadow: '0 0 20px var(--primary)',
                        cursor: 'pointer'
                    }}
                />
            )}

            {/* Result */}
            {gameState === 'result' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem', zIndex: 20 }}>
                    <h2 className="display-text" style={{ fontSize: '2rem' }}>SESSION COMPLETE</h2>
                    <div style={{ fontSize: '4rem', margin: '2rem 0', color: 'var(--primary)' }}>{score}</div>
                    <div className="label">CIRCLES CLEARED</div>
                    <button className="btn-primary" onClick={onBack} style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
                        <RefreshCw /> Return to Menu
                    </button>
                </div>
            )}
        </div>
    );
}
