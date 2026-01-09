import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/AudioSystem';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

export default function DVATraining({ onBack, difficulty }) {
    /* State & Refs */
    const [gameState, setGameState] = useState('intro');
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(1);
    const [target, setTarget] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [bonusText, setBonusText] = useState('');

    const reqRef = useRef(null);
    const lastTimeRef = useRef(0);
    const containerRef = useRef(null);
    const targetRef = useRef(null);
    const timeoutRef = useRef(null);

    // Refs for tracking state inside event listeners/timeouts without stale closures
    const gameStateRef = useRef('intro');
    const roundRef = useRef(1);

    const MAX_ROUNDS = 10;

    // Difficulty
    const baseSpeed = 500 + (difficulty * 250);
    const targetSize = Math.max(40, 100 - (difficulty * 5));

    // Sync state to refs
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        roundRef.current = round;
    }, [round]);

    useEffect(() => {
        // Start BGM
        audio.startBgm('game');

        // Reset rounds on mount/remount effectively
        setRound(1);
        roundRef.current = 1;

        startRound();
        // Keyboard listeners
        const handleKeyDown = (e) => {
            // Use ref to check current game state without closure issues
            if (gameStateRef.current !== 'playing') return;

            let inputDir = -1;
            if (e.key === 'ArrowUp') inputDir = 0;
            if (e.key === 'ArrowRight') inputDir = 1;
            if (e.key === 'ArrowDown') inputDir = 2;
            if (e.key === 'ArrowLeft') inputDir = 3;

            if (inputDir !== -1) {
                checkAnswerRef.current(inputDir);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            cancelAnimationFrame(reqRef.current);
            clearTimeout(timeoutRef.current);
            audio.stopBgm();
        };
    }, []); // Only run once on mount, logic handled inside

    // We need checkAnswer to be accessible inside the useEffect closure, 
    // but checkAnswer depends on state/refs that might change?
    // Actually, nearly everything it needs is in refs, EXCEPT setScore/setFeedback which are stable or fine.
    // To be safe, let's keep checkAnswer stable or use a ref for it too.
    const checkAnswerRef = useRef(null);

    const startRound = () => {
        setGameState('playing');
        setFeedback(null);
        setBonusText('');

        // Setup Target
        // 0: Up, 1: Right, 2: Down, 3: Left
        const direction = Math.floor(Math.random() * 4);

        // Spawn Position & Velocity
        // We want it to cross the screen.
        // Pick a side: 0:Top, 1:Right, 2:Bottom, 3:Left
        const startSide = Math.floor(Math.random() * 4);

        const w = window.innerWidth;
        const h = window.innerHeight;
        const pad = 100; // start off-screen

        let startX, startY, endX, endY;

        // Randomize start pos along the chosen side
        if (startSide === 0) { // Top
            startX = Math.random() * w; startY = -pad;
            endX = Math.random() * w; endY = h + pad;
        } else if (startSide === 1) { // Right
            startX = w + pad; startY = Math.random() * h;
            endX = -pad; endY = Math.random() * h;
        } else if (startSide === 2) { // Bottom
            startX = Math.random() * w; startY = h + pad;
            endX = Math.random() * w; endY = -pad;
        } else { // Left
            startX = -pad; startY = Math.random() * h;
            endX = w + pad; endY = Math.random() * h;
        }

        // Calculate velocity vector
        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const speed = baseSpeed * (0.8 + Math.random() * 0.4); // +/- var
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        targetRef.current = {
            x: startX,
            y: startY,
            vx,
            vy,
            dir: direction,
            active: true,
            spawnTime: performance.now()
        };

        // Force update to render the arrow
        setTarget({ dir: direction });

        lastTimeRef.current = performance.now();
        loop();
    };

    const loop = () => {
        const now = performance.now();
        const dt = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        const t = targetRef.current;

        if (!t || !t.active) return;

        t.x += t.vx * dt;
        t.y += t.vy * dt;

        // Check bounds - if it went way off screen and wasn't answered
        const w = window.innerWidth;
        const h = window.innerHeight;
        const margin = 200;

        if (
            (t.vx > 0 && t.x > w + margin) ||
            (t.vx < 0 && t.x < -margin) ||
            (t.vy > 0 && t.y > h + margin) ||
            (t.vy < 0 && t.y < -margin)
        ) {
            handleMiss();
            return;
        }

        // Update DOM directly for performance
        const el = document.getElementById('moving-target');
        if (el) {
            el.style.transform = `translate(${t.x}px, ${t.y}px)`;
        }

        reqRef.current = requestAnimationFrame(loop);
    };

    const handleMiss = () => {
        targetRef.current.active = false;
        audio.playSe('failure');
        setFeedback('wrong');
        nextRound();
    };

    const checkAnswer = (inputDir) => {
        if (!targetRef.current || !targetRef.current.active) return;

        targetRef.current.active = false;

        if (inputDir === targetRef.current.dir) {
            audio.playSe('success');

            // Speed Bonus Calc
            const reactionTime = performance.now() - targetRef.current.spawnTime; // ms
            let speedBonus = 0;
            let bonusMsg = '';

            // Strict timing
            if (reactionTime < 600) {
                speedBonus = 200;
                bonusMsg = 'SPEED KING!';
            } else if (reactionTime < 1000) {
                speedBonus = 100;
                bonusMsg = 'FAST!';
            }

            const basePoints = 100 + (difficulty * 10);
            setScore(s => s + basePoints + speedBonus);

            setFeedback('correct');
            setBonusText(bonusMsg ? `+${speedBonus} (${bonusMsg})` : '');
        } else {
            audio.playSe('failure');
            setFeedback('wrong');
        }

        nextRound();
    };

    // Assign to ref so useEffect layout can verify it
    checkAnswerRef.current = checkAnswer;

    const nextRound = () => {
        setGameState('feedback');
        timeoutRef.current = setTimeout(() => {
            // Use Ref for Logic to avoid closure issues
            if (roundRef.current < MAX_ROUNDS) {
                setRound(r => r + 1);
                startRound();
            } else {
                setGameState('result');
                audio.stopBgm();
            }
        }, 1000);
    };

    const getArrowIcon = (dir) => {
        switch (dir) {
            case 0: return <ArrowUp size={targetSize / 1.5} />;
            case 1: return <ArrowRight size={targetSize / 1.5} />;
            case 2: return <ArrowDown size={targetSize / 1.5} />;
            case 3: return <ArrowLeft size={targetSize / 1.5} />;
            default: return null;
        }
    };

    return (
        <div className="game-container flex-center col" ref={containerRef}>
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

            {/* TARGET */}
            {gameState === 'playing' && target && (
                <div
                    id="moving-target"
                    style={{
                        position: 'absolute',
                        left: 0, top: 0,
                        width: targetSize, height: targetSize,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        boxShadow: '0 0 30px var(--primary)',
                        color: '#000',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        willChange: 'transform',
                        // Initial position is handled by JS, but we center the div coordinate system so x,y is center
                        marginTop: -targetSize / 2,
                        marginLeft: -targetSize / 2,
                    }}
                >
                    {getArrowIcon(target.dir)}
                </div>
            )}

            {/* CONTROLS OVERLAY (for touch/mouse users) */}
            <div style={{
                position: 'absolute',
                bottom: 40,
                display: 'grid',
                gridTemplateColumns: '60px 60px 60px',
                gridTemplateRows: '60px 60px',
                gap: '10px',
                opacity: 0.8
            }}>
                <div />
                <button className="glass-panel flex-center" style={{ color: '#fff' }} onClick={() => checkAnswer(0)}><ArrowUp size={32} /></button>
                <div />
                <button className="glass-panel flex-center" style={{ color: '#fff' }} onClick={() => checkAnswer(3)}><ArrowLeft size={32} /></button>
                <button className="glass-panel flex-center" style={{ color: '#fff' }} onClick={() => checkAnswer(2)}><ArrowDown size={32} /></button>
                <button className="glass-panel flex-center" style={{ color: '#fff' }} onClick={() => checkAnswer(1)}><ArrowRight size={32} /></button>
            </div>

            {/* FEEDBACK */}
            {gameState === 'feedback' && (
                <div className="animate-enter flex-center col" style={{ zIndex: 20 }}>
                    <div style={{
                        fontSize: '5rem',
                        color: feedback === 'correct' ? 'var(--success)' : 'var(--error)',
                        textShadow: '0 0 30px currentColor'
                    }}>
                        {feedback === 'correct' ? 'GREAT' : 'MISS'}
                    </div>
                    {feedback === 'correct' && bonusText && (
                        <div className="label animate-enter" style={{ color: 'var(--primary)', marginTop: '1rem' }}>
                            {bonusText}
                        </div>
                    )}
                </div>
            )}

            {/* RESULT */}
            {gameState === 'result' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem', zIndex: 20 }}>
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
