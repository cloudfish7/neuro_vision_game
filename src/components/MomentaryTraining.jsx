import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/AudioSystem';
import { ArrowLeft, RefreshCw, Eye } from 'lucide-react';

export default function MomentaryTraining({ onBack, difficulty }) {
    const [gameState, setGameState] = useState('intro'); // intro, countdown, memorize, input, feedback, result
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(1);
    const [gridData, setGridData] = useState([]); // Array of { id, value (number|null), status ('hidden','visible','correct','wrong') }
    const [nextNumber, setNextNumber] = useState(1);
    const [countdown, setCountdown] = useState(3);
    const [feedback, setFeedback] = useState(null);

    const GRID_SIZE = 5; // 5x5 grid
    const MAX_ROUNDS = 5;

    // Difficulty settings
    // Level 1: 3 nums, 1.5s
    // Level 10: 7 nums, 0.2s
    const numCount = Math.min(9, 3 + Math.floor((difficulty - 1) / 2));
    // Duration: 1500ms -> 200ms
    // Lvl 1: 1500, Lvl 5: 800, Lvl 10: 200
    const displayDuration = Math.max(200, 1500 - ((difficulty - 1) * 140));

    const timerRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        // Start BGM
        audio.startBgm('game');
        startRoundSequence();

        return () => {
            clearInterval(timerRef.current);
            clearTimeout(timeoutRef.current);
            audio.stopBgm();
        };
    }, []);

    const generateGrid = () => {
        // Create empty grid
        const totalCells = GRID_SIZE * GRID_SIZE;
        let newGrid = Array(totalCells).fill(null).map((_, i) => ({
            id: i,
            value: null,
            status: 'hidden' // hidden (default empty), visible (showing num), masked (input phase), correct, wrong
        }));

        // Place numbers 1 to numCount randomly
        let positions = [];
        while (positions.length < numCount) {
            const r = Math.floor(Math.random() * totalCells);
            if (!positions.includes(r)) positions.push(r);
        }

        positions.forEach((pos, idx) => {
            newGrid[pos].value = idx + 1;
            newGrid[pos].status = 'visible';
        });

        return newGrid;
    };

    const startRoundSequence = () => {
        setGameState('countdown');
        setCountdown(3);
        setFeedback(null);
        setNextNumber(1);

        // Reset grid to empty
        setGridData(Array(GRID_SIZE * GRID_SIZE).fill(null).map((_, i) => ({ id: i, value: null, status: 'hidden' })));

        let count = 3;
        audio.playSe('countdown');

        timerRef.current = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
                audio.playSe('click'); // lighter tick
            } else {
                clearInterval(timerRef.current);
                startMemorizePhase();
            }
        }, 800);
    };

    const startMemorizePhase = () => {
        const grid = generateGrid();
        setGridData(grid);
        setGameState('memorize');
        audio.playSe('start');

        timeoutRef.current = setTimeout(() => {
            // Hide numbers, enter input phase
            setGridData(prev => prev.map(cell => ({
                ...cell,
                // If it had a value, it becomes masked (clickable), else remains hidden (non-interactive)
                status: cell.value ? 'masked' : 'hidden'
            })));
            setGameState('input');
        }, displayDuration);
    };

    const handleCellClick = (index) => {
        if (gameState !== 'input') return;

        const cell = gridData[index];

        // Ignore clicks on empty cells or already solved cells
        if (cell.status !== 'masked') return;

        if (cell.value === nextNumber) {
            // Correct
            audio.playSe('click');
            const isLast = nextNumber === numCount;

            setGridData(prev => {
                const next = [...prev];
                next[index] = { ...next[index], status: 'correct' };
                return next;
            });

            if (isLast) {
                // Round Clear
                handleSuccess();
            } else {
                setNextNumber(n => n + 1);
            }
        } else {
            // Pattern Failure
            handleFailure(index);
        }
    };

    const handleSuccess = () => {
        audio.playSe('success');
        setFeedback('correct');
        setScore(s => s + (difficulty * 100) + (numCount * 50));

        setTimeout(() => {
            nextRound();
        }, 1000);
    };

    const handleFailure = (wrongIndex) => {
        audio.playSe('failure');
        setFeedback('wrong');
        // Reveal all
        setGridData(prev => prev.map((cell, i) => {
            if (cell.value) {
                // If it was the wrong one clicked
                if (i === wrongIndex) return { ...cell, status: 'wrong' };
                // Reveal others
                return { ...cell, status: 'visible' };
            }
            return cell;
        }));

        setTimeout(() => {
            nextRound();
        }, 2000);
    };

    const nextRound = () => {
        if (round < MAX_ROUNDS) {
            setRound(r => r + 1);
            startRoundSequence();
        } else {
            setGameState('result');
            audio.stopBgm();
        }
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
                <div className="label">ROUND {round}/{MAX_ROUNDS}</div>
            </div>

            {/* COUNTDOWN OVERLAY */}
            {gameState === 'countdown' && (
                <div className="animate-enter" style={{ fontSize: '6rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    {countdown}
                </div>
            )}

            {/* GAME GRID */}
            {(gameState === 'memorize' || gameState === 'input' || gameState === 'feedback') && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    gap: '10px',
                    width: '90vw',
                    maxWidth: '400px',
                    aspectRatio: '1',
                }}>
                    {gridData.map((cell, i) => (
                        <div
                            key={cell.id}
                            onClick={() => handleCellClick(i)}
                            style={{
                                background: cell.status === 'hidden'
                                    ? 'rgba(255,255,255,0.03)'
                                    : cell.status === 'masked'
                                        ? 'rgba(255,255,255,0.2)'
                                        : cell.status === 'correct'
                                            ? 'var(--success)'
                                            : cell.status === 'wrong'
                                                ? 'var(--error)'
                                                : 'var(--glass-highlight)',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                color: cell.status === 'correct' || cell.status === 'wrong' ? '#000' : '#fff',
                                cursor: cell.status === 'masked' ? 'pointer' : 'default',
                                transition: 'all 0.1s',
                                border: cell.status === 'hidden' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                boxShadow: cell.status === 'masked' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            {(cell.status === 'visible' || cell.status === 'correct' || cell.status === 'wrong') ? cell.value : ''}
                        </div>
                    ))}
                </div>
            )}

            {/* FEEDBACK OVERLAY */}
            {feedback && (
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '4rem',
                    fontWeight: 'bold',
                    color: feedback === 'correct' ? 'var(--success)' : 'var(--error)',
                    textShadow: '0 0 20px rgba(0,0,0,0.8)',
                    pointerEvents: 'none',
                    zIndex: 20
                }}>
                    {feedback === 'correct' ? 'Vision Clear' : 'Memory Fail'}
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
