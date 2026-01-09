import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/AudioSystem';
import { ArrowLeft, RefreshCw, Zap } from 'lucide-react';

export default function ReactionTraining({ onBack, difficulty }) {
    const [gameState, setGameState] = useState('intro'); // intro, waiting, signal, result
    const [scores, setScores] = useState([]); // ms
    const [currentRound, setCurrentRound] = useState(1);
    const [message, setMessage] = useState('TAP TO START');
    const [signalTime, setSignalTime] = useState(0);

    const backgroundRef = useRef('var(--bg-color)');
    const timeoutRef = useRef(null);

    const MAX_ROUNDS = 5;

    // Difficulty actually doesn't strictly affect *reaction* measuring, 
    // but we can make the "Waiting" time more random/stressful at higher levels?
    // Standard Reaction Test is just pure reflex.
    // Let's keep it pure but maybe strictly fail if user is too slow (>500ms) on high levels.

    useEffect(() => {
        // audio.startBgm('start'); // Minimal BGM?
        // Actually reaction test needs silence for concentration usually.
        return () => {
            clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleInteraction = () => {
        if (gameState === 'intro') {
            startRound();
        } else if (gameState === 'waiting') {
            // Early Start (False Start)
            handleFalseStart();
        } else if (gameState === 'signal') {
            // Success
            handleSuccess();
        }
    };

    const startRound = () => {
        setGameState('waiting');
        setMessage('WAIT FOR COLOR...');
        backgroundRef.current = 'var(--bg-color)';
        audio.playSe('click');

        // Random delay between 2s and 5s
        const delay = 2000 + Math.random() * 3000;

        timeoutRef.current = setTimeout(() => {
            triggerSignal();
        }, delay);
    };

    const triggerSignal = () => {
        setGameState('signal');
        setMessage('CLICK!');
        backgroundRef.current = '#00f3ff'; // Bright Cyan Flash
        setSignalTime(performance.now());
        // audio.playSe('start'); // A sharp sound

        // Custom sharp beep for signal
        const ctx = audio.ctx;
        if (ctx) {
            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, t);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.1);
        }
    };

    const handleSuccess = () => {
        const reactionMs = performance.now() - signalTime;
        setScores(prev => [...prev, reactionMs]);

        // Feedback logic
        let grade = 'GOOD';
        if (reactionMs < 200) grade = 'GODLIKE';
        else if (reactionMs < 250) grade = 'PRO';
        else if (reactionMs < 300) grade = 'AVERAGE';
        else grade = 'SLOW'; // Just kidding, 300 is decent

        setMessage(`${Math.floor(reactionMs)} ms\n${grade}`);
        backgroundRef.current = 'var(--success)';

        timeoutRef.current = setTimeout(() => {
            if (currentRound < MAX_ROUNDS) {
                setCurrentRound(r => r + 1);
                startRound();
            } else {
                finishGame();
            }
        }, 2000); // Show result for 2s
    };

    const handleFalseStart = () => {
        clearTimeout(timeoutRef.current);
        setMessage('TOO EARLY!');
        backgroundRef.current = 'var(--error)';
        audio.playSe('failure');

        // Penalty? Or just restart round?
        // Restart round after delay
        timeoutRef.current = setTimeout(() => {
            startRound();
        }, 1500);
    };

    const finishGame = () => {
        setGameState('result');
        backgroundRef.current = 'var(--bg-color)';
    };

    // Average
    const averageMs = scores.length > 0
        ? Math.floor(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    // Score calculation for leaderboard (Lower is better, but consistency matters)
    // Let's convert ms to points: 10000 / avgMs ? 
    // e.g. 200ms -> 50pts. Maybe 50000 / avgMs -> 250pts
    const scorePoints = averageMs > 0 ? Math.floor(50000 / averageMs) : 0;

    return (
        <div
            className="game-container flex-center col"
            onClick={handleInteraction}
            style={{
                background: gameState === 'signal' ? '#00f3ff' : gameState === 'waiting' ? '#1a1a2e' : 'var(--bg-color)',
                transition: gameState === 'signal' ? 'none' : 'background 0.3s',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent'
            }}
        >
            {/* HUD */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
                <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', gap: '0.5rem', background: '#000' }}>
                    <ArrowLeft size={16} /> Back
                </button>
            </div>

            {gameState !== 'result' && (
                <div style={{ position: 'absolute', top: 20, right: 20, textAlign: 'right', zIndex: 10, pointerEvents: 'none' }}>
                    <div className="label">AVG</div>
                    <div style={{ fontSize: '1.5rem', fontFamily: 'monospace' }}>{averageMs} ms</div>
                    <div className="label">ROUND {currentRound}/{MAX_ROUNDS}</div>
                </div>
            )}

            {/* CENTER MESSAGE */}
            {gameState !== 'result' && (
                <div className="animate-enter" style={{
                    textAlign: 'center',
                    pointerEvents: 'none',
                    color: gameState === 'signal' ? '#000' : '#fff'
                }}>
                    {gameState === 'intro' && <Zap size={64} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />}
                    <h1 style={{ fontSize: '4rem', whiteSpace: 'pre-line' }}>{message}</h1>
                    {gameState === 'intro' && <p className="label" style={{ marginTop: '1rem' }}>Click as fast as possible when screen turns BLUE</p>}
                </div>
            )}

            {/* RESULT */}
            {gameState === 'result' && (
                <div className="glass-panel animate-enter flex-center col" style={{ padding: '3rem', zIndex: 20 }} onClick={(e) => e.stopPropagation()}>
                    <h2 className="display-text" style={{ fontSize: '2rem' }}>SESSION COMPLETE</h2>

                    <div style={{ display: 'flex', gap: '2rem', margin: '2rem 0' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div className="label">AVG SPEED</div>
                            <div style={{ fontSize: '3rem', color: 'var(--primary)' }}>{averageMs} ms</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div className="label">SCORE</div>
                            <div style={{ fontSize: '3rem' }}>{scorePoints} pts</div>
                        </div>
                    </div>

                    <button className="btn-primary" onClick={onBack} style={{ display: 'flex', gap: '0.5rem' }}>
                        <RefreshCw /> Return to Menu
                    </button>
                </div>
            )}
        </div>
    );
}
