import React, { useState } from 'react';
import { audio } from '../utils/AudioSystem';
import { Play, Activity, Eye, Zap, Target, Grid, Move, CircleDot, Hash } from 'lucide-react';

const modes = [
    { id: 'kva', name: 'KVA Training', desc: 'Kinetic Visual Acuity', icon: Move, active: true },
    { id: 'dva', name: 'DVA Training', desc: 'Dynamic Visual Acuity', icon: Activity, active: true },
    { id: 'momentary', name: 'Momentary Vision', desc: 'Photographic Memory', icon: Eye, active: true },
    { id: 'depth', name: 'Depth Perception', desc: '3D Spatial Awareness', icon: Grid, active: true },
    { id: 'peripheral', name: 'Peripheral Vision', desc: 'Wide Field Awareness', icon: Target, active: true },
    { id: 'reaction', name: 'Quick Reaction', desc: 'Reflex Speed', icon: Zap, active: true },
    { id: 'coordination', name: 'Eye-Hand', desc: 'Motor Synchronization', icon: Move, active: true },
    { id: 'reflex_tap', name: 'Reflex Tap', desc: 'Speed Tapping', icon: CircleDot, active: true },
    { id: 'number_touch', name: 'Number Touch', desc: 'Sequence Speed', icon: Hash, active: true },
];

export default function MainMenu({ onStartMode, difficulty, setDifficulty }) {
    const [hoveredMode, setHoveredMode] = useState(null);

    const handleModeClick = (mode) => {
        audio.playSe('click');
        if (mode.active) {
            onStartMode(mode.id);
        } else {
            audio.playSe('failure');
        }
    };

    return (
        <div className="full-screen flex-center col animate-enter" style={{ padding: '2rem' }}>
            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h1 className="display-text" style={{
                    background: 'linear-gradient(to right, #fff, #00f3ff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '0.5rem'
                }}>
                    NEURO VISION
                </h1>
                <p className="label" style={{ opacity: 0.7 }}>Professional Sports Vision Training</p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '60vh',
                overflowY: 'auto',
                padding: '1rem'
            }}>
                {modes.map((mode) => {
                    const Icon = mode.icon;
                    const isHovered = hoveredMode === mode.id;

                    return (
                        <div
                            key={mode.id}
                            className="glass-panel"
                            onMouseEnter={() => {
                                setHoveredMode(mode.id);
                                // audio.playSe('click'); // Maybe too noisy
                            }}
                            onMouseLeave={() => setHoveredMode(null)}
                            onClick={() => handleModeClick(mode)}
                            style={{
                                padding: '1.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                height: '180px',
                                cursor: mode.active ? 'pointer' : 'not-allowed',
                                opacity: mode.active ? 1 : 0.5,
                                transform: isHovered && mode.active ? 'translateY(-5px)' : 'none',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                border: isHovered && mode.active ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                                boxShadow: isHovered && mode.active ? '0 0 30px var(--primary-dim)' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    background: mode.active ? 'rgba(0, 243, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                                    padding: '10px',
                                    borderRadius: '12px',
                                    color: mode.active ? 'var(--primary)' : 'var(--text-muted)'
                                }}>
                                    <Icon size={24} />
                                </div>
                                {mode.active && <Play size={20} style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s' }} />}
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{mode.name}</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{mode.desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <footer className="glass-panel" style={{
                marginTop: '2rem',
                padding: '1rem 2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '2rem',
                borderRadius: '50px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="label">Difficulty Level</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setDifficulty(lvl)}
                                className={difficulty === lvl ? 'btn-primary' : 'btn-secondary'}
                                style={{
                                    padding: '0.5rem 1rem',
                                    minWidth: '40px',
                                    background: difficulty === lvl ? 'var(--primary)' : 'transparent',
                                    color: difficulty === lvl ? '#000' : 'var(--text-muted)',
                                    border: 'none'
                                }}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
}
