import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/AudioSystem';
import { ArrowLeft, RefreshCw, Hash, Timer as TimerIcon } from 'lucide-react';

export default function NumberTouchTraining({ onBack, difficulty }) {
    const [gameState, setGameState] = useState('intro'); // intro, playing, result
    const [numbers, setNumbers] = useState([]);
    const [nextNum, setNextNum] = useState(1);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [penalty, setPenalty] = useState(false);
    const [maxNum, setMaxNum] = useState(20);

    const timerRef = useRef(null);
    const startTimeRef = useRef(0);
    const penaltyRef = useRef(null);

    // Difficulty Settings
    // Range: Level 1 = 15, Level 10 = 60
    const currentMax = 10 + difficulty * 5;
    // Shuffle mode: Level 8+ shuffles on every hit
    const shuffleOnHit = difficulty >= 8;

    useEffect(() => {
        setMaxNum(currentMax);
        return () => {
            clearInterval(timerRef.current);
            clearTimeout(penaltyRef.current);
            audio.stopBgm();
        };
    }, []);

    const COLORS = [
        'rgba(0, 243, 255, 0.4)', // Cyan
        'rgba(16, 185, 129, 0.4)', // Emerald
        'rgba(245, 133, 11, 0.4)', // Amber
        'rgba(236, 72, 153, 0.4)', // Rose
        'rgba(139, 92, 246, 0.4)', // Violet
        'rgba(255, 255, 255, 0.15)' // Default Glass
    ];

    const getRandomPos = (existing = []) => {
        let attempts = 0;
        let candidate = null;

        // Use current viewport for accurate pixel math
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        while (attempts < 100) {
            const x = 10 + Math.random() * 80;
            const y = 20 + Math.random() * 65; // More margin for HUD
            const size = 45 + Math.random() * 35;

            const r1 = size / 2;
            let overlap = false;

            for (const other of existing) {
                // Ignore inactive or non-existent
                if (!other || !other.active) continue;

                const r2 = other.size / 2;

                // Convert percent diff back to pixels for accurate distance
                const dxPx = ((x - other.x) / 100) * vw;
                const dyPx = ((y - other.y) / 100) * vh;
                const dist = Math.sqrt(dxPx * dxPx + dyPx * dyPx);

                // 15px extra margin between circles
                if (dist < (r1 + r2 + 15)) {
                    overlap = true;
                    break;
                }
            }

            if (!overlap) {
                candidate = { x, y, size, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
                break;
            }
            attempts++;
        }

        return candidate || {
            x: 10 + Math.random() * 80,
            y: 20 + Math.random() * 65,
            size: 45,
            color: COLORS[0]
        };
    };

    const initGame = () => {
        const nums = [];
        for (let i = 1; i <= currentMax; i++) {
            const pos = getRandomPos(nums);
            nums.push({ id: i, value: i, active: true, ...pos });
        }

        setNumbers(nums);
        setNextNum(1);
        setElapsedTime(0);
        setGameState('playing');
        setPenalty(false);

        startTimeRef.current = performance.now();
        audio.startBgm('game');

        timerRef.current = setInterval(() => {
            setElapsedTime(performance.now() - startTimeRef.current);
        }, 10);
    };

    const handleTouch = (numObj) => {
        if (gameState !== 'playing' || penalty || !numObj.active) return;

        if (numObj.value === nextNum) {
            // Correct
            audio.playSe('click');

            if (nextNum === currentMax) {
                // Finish
                finishGame();
            } else {
                setNextNum(n => n + 1);

                // Update numbers array
                setNumbers(prev => {
                    const nextArr = prev.map(n => n.id === numObj.id ? { ...n, active: false } : n);
                    if (shuffleOnHit) {
                        const resultArr = [...nextArr];
                        // Get indices of all elements that are still active
                        const activeIndices = resultArr.reduce((acc, n, i) => {
                            if (n.active) acc.push(i);
                            return acc;
                        }, []);

                        // To avoid overlaps, we need to place them one by one considering others
                        // We start with the fixed (inactive) ones as obstacles
                        const currentPlaced = resultArr.filter(n => !n.active);

                        for (const idx of activeIndices) {
                            const newPos = getRandomPos(currentPlaced);
                            resultArr[idx] = { ...resultArr[idx], ...newPos };
                            currentPlaced.push(resultArr[idx]);
                        }
                        return resultArr;
                    }
                    return nextArr;
                });
            }
        } else {
            // Error
            audio.playSe('failure');
            setPenalty(true);
            penaltyRef.current = setTimeout(() => {
                setPenalty(false);
            }, 500);
        }
    };

    const finishGame = () => {
        clearInterval(timerRef.current);
        setGameState('result');
        audio.stopBgm();
        audio.playSe('success');
    };

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const milliseconds = Math.floor((ms % 1000) / 10);
        return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
    };

    return (
        <div className="game-container flex-center col" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* HUD */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', gap: '0.5rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>
            </div>

            <div style={{ position: 'absolute', top: 20, right: 20, textAlign: 'right', zIndex: 10 }}>
                <div className="label">ELAPSED</div>
                <div style={{ fontSize: '2rem', fontFamily: 'monospace', color: 'var(--primary)', textShadow: '0 0 10px var(--primary-glow)' }}>
                    {formatTime(elapsedTime)}
                </div>
                {gameState === 'playing' && (
                    <div className="animate-enter" style={{ marginTop: '0.5rem' }}>
                        <span className="label">NEXT: </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{nextNum}</span>
                    </div>
                )}
            </div>

            {/* Intro */}
            {gameState === 'intro' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem', zIndex: 20 }}>
                    <Hash size={48} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <h2>NUMBER TOUCH</h2>
                    <p className="label" style={{ margin: '1rem 0' }}>Tap numbers 1 to {currentMax} in order!</p>
                    <div className="flex-center col" style={{ gap: '0.5rem', marginBottom: '2rem' }}>
                        <div className="badge">Difficulty: {difficulty}</div>
                        {shuffleOnHit && <div className="badge error">Extreme: Shuffle Mode ON</div>}
                    </div>
                    <button className="btn-primary" onClick={initGame}>START</button>
                </div>
            )}

            {/* Game Area */}
            {gameState === 'playing' && (
                <div className={`full-screen ${penalty ? 'penalty-shake' : ''}`} style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '100%', height: '100%',
                }}>
                    {numbers.map(n => (
                        <div
                            key={n.id}
                            onMouseDown={() => handleTouch(n)}
                            onTouchStart={() => handleTouch(n)}
                            className={`number-circle ${n.active ? '' : 'inactive'}`}
                            style={{
                                position: 'absolute',
                                left: `${n.x}%`,
                                top: `${n.y}%`,
                                width: `${n.size}px`,
                                height: `${n.size}px`,
                                fontSize: `${n.size * 0.4}px`,
                                transform: 'translate(-50%, -50%)',
                                background: n.color,
                                borderColor: n.color.replace('0.4', '0.8'),
                                opacity: n.active ? 1 : 0,
                                pointerEvents: n.active ? 'auto' : 'none',
                                filter: penalty ? 'grayscale(1) opacity(0.3)' : 'none',
                                transition: shuffleOnHit ? 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'opacity 0.2s'
                            }}
                        >
                            {n.value}
                        </div>
                    ))}
                </div>
            )}

            {/* Result */}
            {gameState === 'result' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem', zIndex: 20 }}>
                    <TimerIcon size={48} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <h2 className="display-text" style={{ fontSize: '2rem' }}>TIME RECORD</h2>
                    <div style={{ fontSize: '4rem', margin: '2rem 0', color: 'var(--primary)', textShadow: '0 0 20px var(--primary-glow)' }}>
                        {formatTime(elapsedTime)}
                    </div>
                    <div className="label">NUMBERS: 1 - {currentMax}</div>
                    <button className="btn-primary" onClick={onBack} style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem' }}>
                        <RefreshCw /> Return to Menu
                    </button>
                </div>
            )}

            <style>{`
                .number-circle {
                    background: var(--glass-bg);
                    border: 2px solid var(--glass-border);
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    user-select: none;
                    font-weight: bold;
                    color: #fff;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                }
                .number-circle:active {
                    transform: translate(-50%, -50%) scale(0.9) !important;
                    background: var(--primary);
                    color: #000;
                }
                .penalty-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}</style>
        </div>
    );
}
