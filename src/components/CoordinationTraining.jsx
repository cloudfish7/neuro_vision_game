import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/AudioSystem';
import { ArrowLeft, RefreshCw, Move } from 'lucide-react';

export default function CoordinationTraining({ onBack, difficulty }) {
    const [gameState, setGameState] = useState('intro'); // intro, playing, result
    const [score, setScore] = useState(0);
    const [trackingRate, setTrackingRate] = useState(0); // 0-100%

    // Game params
    const [targetPos, setTargetPos] = useState({ x: 50, y: 50 }); // %
    const [isTracking, setIsTracking] = useState(false);

    const reqRef = useRef(null);
    const startTimeRef = useRef(0);
    const lastTimeRef = useRef(0);
    const totalTimeRef = useRef(0);
    const trackedTimeRef = useRef(0);
    const targetRef = useRef({ x: 50, y: 50, vx: 0.5, vy: 0.5 }); // Physics state
    const mouseRef = useRef({ x: -1, y: -1 }); // Screen coords
    const containerRef = useRef(null);

    const DURATION = 20000; // 20 seconds session

    // Difficulty
    // Speed: Level 1=Low, Level 10=High
    const speedBase = 0.5 + (difficulty * 0.15);
    const targetSize = Math.max(40, 100 - (difficulty * 6)); // Size in px
    const changeDirRate = 0.02 + (difficulty * 0.005); // Chance to change direction per frame

    useEffect(() => {
        // Mouse tracking
        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        // Touch tracking
        const handleTouchMove = (e) => {
            e.preventDefault(); // Prevent scroll
            const touch = e.touches[0];
            mouseRef.current = { x: touch.clientX, y: touch.clientY };
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            cancelAnimationFrame(reqRef.current);
            audio.stopBgm();
        };
    }, []);

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setTrackingRate(0);
        totalTimeRef.current = 0;
        trackedTimeRef.current = 0;

        startTimeRef.current = performance.now();
        lastTimeRef.current = performance.now();

        // set initial random velocity
        const angle = Math.random() * Math.PI * 2;
        targetRef.current.vx = Math.cos(angle) * speedBase;
        targetRef.current.vy = Math.sin(angle) * speedBase;

        audio.startBgm('game');
        loop();
    };

    const loop = () => {
        const now = performance.now();
        const dt = now - lastTimeRef.current; // ms
        lastTimeRef.current = now;

        const elapsed = now - startTimeRef.current;
        if (elapsed >= DURATION) {
            finishGame();
            return;
        }

        // Update Target Position (Percentage based 0-100)
        // To make speed consistent across screens, we should maybe use logic based on aspect ratio?
        // For simplicity, treating % as units. Speed need adjustment?
        // Let's assume standard speed is in "% per frame" roughly.

        let { x, y, vx, vy } = targetRef.current;

        // Random direction change
        if (Math.random() < changeDirRate) {
            const angle = Math.random() * Math.PI * 2;
            // Blend new velocity
            vx = vx * 0.9 + Math.cos(angle) * speedBase * 0.1;
            vy = vy * 0.9 + Math.sin(angle) * speedBase * 0.1;

            // Normalize to maintain speed
            const mag = Math.sqrt(vx * vx + vy * vy);
            if (mag > 0) {
                vx = (vx / mag) * speedBase;
                vy = (vy / mag) * speedBase;
            }
        }

        x += vx;
        y += vy;

        // Wall bounce
        if (x <= 5 || x >= 95) {
            vx *= -1;
            x = Math.max(5, Math.min(95, x));
        }
        if (y <= 5 || y >= 95) {
            vy *= -1;
            y = Math.max(5, Math.min(95, y));
        }

        targetRef.current = { x, y, vx, vy };
        setTargetPos({ x, y });

        // Check Tracking Logic
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Target center in px
            const tx = rect.left + (rect.width * x / 100);
            const ty = rect.top + (rect.height * y / 100);

            // Distance to mouse
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;

            const dx = mx - tx;
            const dy = my - ty;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const radius = targetSize / 2;
            // Allow slight leniency padding (+20% size)
            const hit = dist <= (radius * 1.2);

            setIsTracking(hit); // For visual feedback

            // Add time
            totalTimeRef.current += dt;
            if (hit) {
                trackedTimeRef.current += dt;
                // play low volume hum? Maybe annoying.
            }
        }

        // Update live score
        if (totalTimeRef.current > 0) {
            const rate = (trackedTimeRef.current / totalTimeRef.current) * 100;
            setTrackingRate(rate);
            // Score based on rate & difficulty
            const currentScore = Math.floor(rate * 10 * difficulty); // Max 1000 * 10 = 10000
            setScore(currentScore);
        }

        reqRef.current = requestAnimationFrame(loop);
    };

    const finishGame = () => {
        setGameState('result');
        audio.stopBgm();

        const rate = (trackedTimeRef.current / DURATION) * 100; // use total duration
        const finalScore = Math.floor(rate * 10 * difficulty);
        setScore(finalScore);
        setTrackingRate(rate);

        if (rate > 80) audio.playSe('success');
        else audio.playSe('failure');
    };

    return (
        <div
            className="game-container flex-center col"
            ref={containerRef}
            style={{
                cursor: 'none', // Hide standard cursor
                touchAction: 'none'
            }}
        >
            {/* HUD */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer' }}>
                    <ArrowLeft size={16} /> Back
                </button>
            </div>
            <div style={{ position: 'absolute', top: 20, right: 20, textAlign: 'right', zIndex: 10 }}>
                <div className="label">SCORE</div>
                <div style={{ fontSize: '1.5rem', fontFamily: 'monospace' }}>{score}</div>
                <div className="label">{trackingRate.toFixed(1)}%</div>
            </div>

            {/* Intro */}
            {gameState === 'intro' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem', cursor: 'default' }}>
                    <Move size={48} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <h2>EYE-HAND COORD</h2>
                    <p className="label" style={{ margin: '1rem 0' }}>Keep your cursor inside the moving circle.</p>
                    <button className="btn-primary" onClick={startGame}>START</button>
                </div>
            )}

            {/* Game Target */}
            {gameState === 'playing' && (
                <div
                    style={{
                        position: 'absolute',
                        left: `${targetPos.x}%`,
                        top: `${targetPos.y}%`,
                        width: targetSize,
                        height: targetSize,
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '50%',
                        background: isTracking ? 'var(--success)' : 'var(--error)',
                        boxShadow: `0 0 ${isTracking ? '50px' : '20px'} ${isTracking ? 'var(--success)' : 'var(--error)'}`,
                        opacity: 0.8,
                        transition: 'background 0.1s, box-shadow 0.1s'
                    }}
                >
                    {/* Center dot */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        width: '4px', height: '4px',
                        background: '#fff',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)'
                    }} />
                </div>
            )}

            {/* Custom Cursor (Visual Feedback) */}
            {gameState === 'playing' && mouseRef.current.x >= 0 && (
                <div style={{
                    position: 'fixed',
                    left: mouseRef.current.x,
                    top: mouseRef.current.y,
                    width: '20px', height: '20px',
                    border: '2px solid #fff',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 9999
                }} />
            )}

            {/* RESULT */}
            {gameState === 'result' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem', zIndex: 20, cursor: 'default' }}>
                    <h2 className="display-text" style={{ fontSize: '2rem' }}>SESSION COMPLETE</h2>
                    <div style={{ fontSize: '4rem', margin: '2rem 0', color: 'var(--primary)' }}>{score} pts</div>
                    <div className="label">TRACKING: {trackingRate.toFixed(1)}%</div>
                    <button className="btn-primary" onClick={onBack} style={{ display: 'flex', gap: '0.5rem' }}>
                        <RefreshCw /> Return to Menu
                    </button>
                </div>
            )}
        </div>
    );
}
