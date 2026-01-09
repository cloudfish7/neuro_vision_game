import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/AudioSystem';
import { ArrowLeft, RefreshCw, Target } from 'lucide-react';

export default function PeripheralTraining({ onBack, difficulty }) {
    const [gameState, setGameState] = useState('intro'); // intro, playing, result
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(1);
    const [centralChar, setCentralChar] = useState('A');
    const [target, setTarget] = useState(null); // { id, x, y, char, active, spawnTime }
    const [feedback, setFeedback] = useState(null);
    const [targetsFound, setTargetsFound] = useState(0);

    const reqRef = useRef(null);
    const charIntervalRef = useRef(null);
    const targetTimerRef = useRef(null);
    const centralCharsRef = useRef('A');

    const GAME_DURATION = 30000; // 30 seconds
    const MAX_TARGETS = 10 + (difficulty * 2); // More targets at higher difficulty

    // Difficulty Params
    // Central change speed: Level 1=1000ms, Level 10=200ms
    const centerSpeed = Math.max(200, 1000 - ((difficulty - 1) * 80));
    // Target lifetime: Level 1=3000ms, Level 10=800ms
    const targetLifetime = Math.max(800, 3000 - ((difficulty - 1) * 220));

    useEffect(() => {
        audio.startBgm('game');
        startRound();

        return () => {
            stopGame();
            audio.stopBgm();
        };
    }, []);

    const stopGame = () => {
        clearInterval(charIntervalRef.current);
        clearTimeout(targetTimerRef.current);
        cancelAnimationFrame(reqRef.current);
    };

    const startRound = () => {
        setGameState('playing');
        setScore(0);
        setTargetsFound(0);
        setTarget(null);
        setFeedback(null);

        // Start Central Task
        charIntervalRef.current = setInterval(() => {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            const c = chars.charAt(Math.floor(Math.random() * chars.length));
            setCentralChar(c);
            centralCharsRef.current = c;
        }, centerSpeed);

        // Schedule First Target
        scheduleNextTarget(1000);

        // End Game Timer
        setTimeout(() => {
            finishGame();
        }, GAME_DURATION);
    };

    const scheduleNextTarget = (delay) => {
        targetTimerRef.current = setTimeout(() => {
            spawnTarget();
        }, delay);
    };

    const spawnTarget = () => {
        if (gameState === 'result') return;

        // Pick random position away from center
        // Center is roughly 50% 50%
        // We want radius > 20%
        const angle = Math.random() * Math.PI * 2;
        // dist from 20% to 45% of screen shortest dim
        const dist = 25 + Math.random() * 20;

        // Convert to Percentage coords centered
        const x = 50 + Math.cos(angle) * dist; // %
        const y = 50 + Math.sin(angle) * dist; // %

        // Sometimes target is a distractor? (Maybe simpler first: just click circles)
        // Actually, "Peripheral Vision" usually requires identifying what appeared while looking at center.
        // Let's make it simpler: Click the circle that appears while keeping eyes on center.
        // To enforcing "Keeping eyes on center", usually we ask user to report the center char AFTER clicking.
        // Or just trust the user for this training tool.

        const newTarget = {
            id: Date.now(),
            x, y,
            active: true,
            spawnTime: performance.now()
        };

        setTarget(newTarget);

        // Auto expire
        setTimeout(() => {
            setTarget(prev => {
                if (prev && prev.id === newTarget.id && prev.active) {
                    // Missed
                    // audio.playSe('failure'); // Maybe too harsh continuously?
                    return null; // Just disappear
                }
                return prev;
            });
        }, targetLifetime);

        // Schedule next
        const nextDelay = targetLifetime + (Math.random() * 1000); // 0-1s gap
        scheduleNextTarget(nextDelay);
    };

    const handleTargetClick = (e) => {
        // e.stopPropagation();
        if (!target || !target.active) return;

        audio.playSe('success');
        setScore(s => s + 100 * difficulty);
        setTargetsFound(n => n + 1);

        // Show quick feedback at position?

        setTarget(null);
    };

    const finishGame = () => {
        setGameState('result');
        stopGame();
    };

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
                <div className="label">FOUND: {targetsFound}</div>
            </div>

            {/* GAME AREA */}
            {/* Central Fixation Point */}
            <div className="flex-center col" style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120px', height: '120px',
                border: '2px dashed var(--text-muted)',
                borderRadius: '50%',
                zIndex: 5
            }}>
                <div className="label" style={{ marginBottom: '10px' }}>FOCUS</div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {centralChar}
                </div>
            </div>

            {/* Peripheral Target */}
            {target && target.active && (
                <div
                    onClick={handleTargetClick}
                    style={{
                        position: 'absolute',
                        left: `${target.x}%`,
                        top: `${target.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'var(--secondary)',
                        boxShadow: '0 0 20px var(--secondary)',
                        cursor: 'pointer',
                        animation: 'fadeIn 0.2s ease-out',
                        zIndex: 10
                    }}
                >
                    <div style={{
                        width: '100%', height: '100%',
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        opacity: 0.5,
                        animation: 'pulse 1s infinite'
                    }} />
                </div>
            )}

            {/* RESULT */}
            {gameState === 'result' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem', zIndex: 20 }}>
                    <h2 className="display-text" style={{ fontSize: '2rem' }}>SESSION COMPLETE</h2>
                    <div style={{ fontSize: '4rem', margin: '2rem 0', color: 'var(--primary)' }}>{score} pts</div>
                    <div className="label">TARGETS FOUND: {targetsFound}</div>
                    <button className="btn-primary" onClick={onBack} style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
                        <RefreshCw /> Return to Menu
                    </button>
                </div>
            )}
        </div>
    );
}
