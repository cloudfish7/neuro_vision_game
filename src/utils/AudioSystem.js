class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmOscillators = [];
    this.isMuted = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Default volume
    this.masterGain.connect(this.ctx.destination);
  }

  playSe(type) {
    if (!this.ctx) this.init();
    if (this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    switch (type) {
      case 'click':
        // High, short blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;

      case 'success':
        // Nice bright ping (bell-like)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, t); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, t + 0.1); 
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.start(t);
        osc.stop(t + 0.5);
        
        // Add a second harmonic for richness
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, t); // E6
        gain2.gain.setValueAtTime(0.2, t);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        osc2.start(t);
        osc2.stop(t + 0.6);
        break;

      case 'failure':
        // Low discord
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.3);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;

      case 'countdown':
        // Woodblock-ish
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
        
      case 'start':
        // Go sound!
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
        break;

      default:
        break;
    }
  }

  // Simple ambient drone generator for "Focus"
  startBgm(mode = 'menu') {
    if (!this.ctx) this.init();
    if (this.bgmOscillators.length > 0) return; // Already playing

    // Create a deep drone
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.frequency.value = 55; // A1
    osc1.type = 'sine';
    
    // Create a slow modulation
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.1; // 0.1 Hz
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    gain1.gain.value = 0.1;

    osc1.start();
    lfo.start();

    this.bgmOscillators.push(osc1, lfo, gain1); // Store to stop later
  }

  stopBgm() {
    this.bgmOscillators.forEach(node => {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    });
    this.bgmOscillators = [];
  }
}

export const audio = new AudioSystem();
