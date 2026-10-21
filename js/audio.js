/* ==========================================================================
   Ancient Arcane Bastion (古域魔陣：守護神殿) - Web Audio API Synthesizer
   Zero external audio dependencies; unlocks on first touch/click gesture
   ========================================================================== */

window.SoundEngine = {
  ctx: null,
  muted: false,
  bgmPlaying: false,
  bgmTimer: null,
  stepPitch: 0,
  lastStepTime: 0,

  init: function() {
    if (!this.ctx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  toggleMute: function() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBgm();
    } else {
      this.init();
      this.startBgm();
    }
    return this.muted;
  },

  playTone: function(freq, type, duration, vol, slideTo) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      var now = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }
      gain.gain.setValueAtTime(vol || 0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  },

  // Rising pitch coin feed tick when standing on Ground Logo
  playCoinFeed: function() {
    if (this.muted) return;
    var nowMs = Date.now();
    if (nowMs - this.lastStepTime > 450) {
      this.stepPitch = 0;
    } else {
      this.stepPitch = Math.min(18, this.stepPitch + 1);
    }
    this.lastStepTime = nowMs;
    var baseFreq = 520 + this.stepPitch * 32;
    this.playTone(baseFreq, "triangle", 0.07, 0.07, baseFreq * 1.18);
  },

  playCoinPickup: function() {
    this.playTone(880, "sine", 0.08, 0.05, 1320);
  },

  playUpgradeComplete: function() {
    if (this.muted) return;
    var notes = [523.25, 659.25, 783.99, 1046.5];
    var self = this;
    notes.forEach(function(n, idx) {
      setTimeout(function() {
        self.playTone(n, "triangle", 0.24, 0.10, n * 1.02);
      }, idx * 55);
    });
  },

  playExpand: function() {
    if (this.muted) return;
    var notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
    var self = this;
    notes.forEach(function(n, idx) {
      setTimeout(function() {
        self.playTone(n, "sawtooth", 0.32, 0.07, n * 1.01);
      }, idx * 65);
    });
  },

  playHit: function(kind) {
    if (this.muted) return;
    if (kind === "hammer") {
      this.playTone(140, "sawtooth", 0.16, 0.08, 55);
    } else if (kind === "frost") {
      this.playTone(920, "sine", 0.09, 0.04, 620);
    } else if (kind === "flame") {
      this.playTone(220, "triangle", 0.12, 0.06, 95);
    } else {
      this.playTone(340, "sine", 0.06, 0.04, 180);
    }
  },

  playSkill: function() {
    if (this.muted) return;
    this.playTone(440, "sine", 0.35, 0.10, 880);
    var self = this;
    setTimeout(function() {
      self.playTone(660, "triangle", 0.4, 0.09, 1320);
    }, 90);
  },

  startBgm: function() {
    if (this.muted || this.bgmPlaying) return;
    this.bgmPlaying = true;
    var scale = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440];
    var step = 0;
    var self = this;
    this.bgmTimer = setInterval(function() {
      if (self.muted || !self.ctx || self.ctx.state !== "running") return;
      var note = scale[(step * 3 + (step % 2)) % scale.length];
      self.playTone(note, "sine", 0.45, 0.018, note * 0.998);
      if (step % 4 === 0) {
        self.playTone(note * 0.5, "triangle", 0.8, 0.022, note * 0.5);
      }
      step++;
    }, 550);
  },

  stopBgm: function() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
};
