import Phaser from 'phaser';
import { OnezwaOrb } from './onezwaOrb';
import { GlobalCleanup } from './cleanup';

const updateReactState = (newState: Partial<any>) => {
  if (window.gameState) {
    window.gameState = { ...window.gameState, ...newState };
    if ((window as any).onGameStateChange) {
      (window as any).onGameStateChange(window.gameState);
    }
  }
};

export class DawnForestScene extends Phaser.Scene {
  private endingData: any;
  private runTick: number = 0;
  
  private renderGraphics!: Phaser.GameObjects.Graphics;
  private dialogueGraphics!: Phaser.GameObjects.Graphics;
  
  private jama!: { x: number; y: number };
  private khwezi!: { x: number; y: number };
  private onezwaOrb!: OnezwaOrb | null;

  // Track buttons and properties for safety / conformity with requirements
  private selectedDifficulty: any = null;
  private enterBtn: any = null;
  private activeOscillators: any[] = [];
  private graphicsObjects: any[] = [];
  private currentBubble: any = null;

  constructor() {
    super('DawnForestScene');
  }

  init(data?: any) {
    updateReactState({ 
      activeScene: 'EndingCreditsScene', // Ensure ending/scrolling overlays or wrappers behave smoothly
      isGameOver: false,
      gameCompleted: false,
      isPaused: false
    });
    this.endingData = data || {
      difficulty: (window.gameState as any)?.difficulty || 'medium',
      enemiesDefeated: (window.gameState as any)?.enemiesDefeated || 0,
      artifactsCollected: (window.gameState?.artifactsCollected || []).length,
      elapsedTime: (window.gameState as any)?.elapsedTime || 0
    };
    this.onezwaOrb = null;
    this.currentBubble = null;
  }

  create() {
    // Register shutdown/destroy listeners (FIX 2 rule)
    this.events.on('shutdown', this.shutdown, this);
    this.events.on('destroy', this.shutdown, this);

    // Stop background music layers
    if (window.gameAudio) {
      try {
        window.gameAudio.setMusicTheme('none');
      } catch(e) {}
    }

    const sw = this.scale.width; // 1280
    const sh = this.scale.height; // 720

    // Setup graphics layers
    this.renderGraphics = this.add.graphics().setDepth(10);
    this.dialogueGraphics = this.add.graphics().setDepth(500);
    this.graphicsObjects.push(this.renderGraphics, this.dialogueGraphics);

    // Initial camera fade in
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // ──────────────────────── DRAW BACKGROUND ────────────────────────
    // Dark dawn green base
    const bgBase = this.add.graphics();
    bgBase.fillStyle(0x0a1a05, 1.0);
    bgBase.fillRect(0, 0, sw, sh);
    this.graphicsObjects.push(bgBase);

    // Dawn Sky Overlay: slow orange morning breakouts
    const sky1 = this.add.rectangle(sw/2, 144, sw, 288, 0x1a0a05).setScrollFactor(0);
    const sky2 = this.add.rectangle(sw/2, 144, sw, 288, 0xff9a3c).setScrollFactor(0).setAlpha(0.2);

    // Ground strip (bottom 30% of screen)
    const ground = this.add.rectangle(sw/2, sh - 108, sw, 216, 0x1a3a0a).setScrollFactor(0);

    // Tree silhouettes
    const silhouetteColor = 0x1a4a0a;
    const trees = [
      this.add.circle(200, sh - 250, 50, silhouetteColor),
      this.add.circle(450, sh - 280, 65, silhouetteColor),
      this.add.circle(700, sh - 240, 45, silhouetteColor),
      this.add.circle(950, sh - 270, 58, silhouetteColor),
      this.add.circle(1150, sh - 250, 48, silhouetteColor)
    ];

    // Tree trunks
    const trunkG = this.add.graphics();
    trunkG.fillStyle(silhouetteColor, 1.0);
    [[200, 50], [450, 65], [700, 45], [950, 58], [1150, 48]].forEach(([tx, r]) => {
      trunkG.fillRect(tx - 6, sh - 250, 12, 150);
    });
    this.graphicsObjects.push(trunkG);

    // Rising golden particles
    for (let i = 0; i < 8; i++) {
      const px = Phaser.Math.Between(50, sw - 50);
      const py = Phaser.Math.Between(sh - 300, sh - 80);
      const pr = Phaser.Math.Between(2, 4);
      const p = this.add.circle(px, py, pr, 0xf5d066).setAlpha(0.4);
      
      this.tweens.add({
        targets: p,
        y: py - 180,
        alpha: 0,
        duration: Phaser.Math.Between(4000, 7000),
        loop: -1
      });
    }

    // Set coordinates for Jama (cyan) and Khwezi (#00FFA3) in center-left
    this.jama = { x: sw/2 - 200, y: sh - 120 };
    this.khwezi = { x: sw/2 - 270, y: sh - 120 };

    // Setup quiet breathing sway
    this.tweens.add({
      targets: [this.jama, this.khwezi],
      y: sh - 117,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Spawn OnezwaOrb at center-right
    this.onezwaOrb = new OnezwaOrb(this, sw/2 + 150, sh - 120);

    // Materialize Onezwa after 1000ms delay
    this.time.delayedCall(1000, () => {
      if (!this.onezwaOrb) return;

      // Mist puff
      const mistG = this.add.graphics().setDepth(15);
      this.tweens.add({
        targets: { r: 1, a: 0.35 },
        r: 58,
        a: 0,
        duration: 700,
        onUpdate: (tween, target) => {
          mistG.clear();
          mistG.fillStyle(0x00FFA3, target.a);
          mistG.fillCircle(this.onezwaOrb!.x, this.onezwaOrb!.y - 15, target.r);
        },
        onComplete: () => {
          mistG.destroy();
        }
      });

      this.onezwaOrb.materialize(() => {
        // Run dialogues chain after a small 200ms delay
        this.time.delayedCall(200, () => {
          this.runDialogChain();
        });
      });
    });
  }

  private runDialogChain() {
    const playNextBubble = (idx: number) => {
      const dialogs = [
        {
          speaker: "ONEZWA",
          text: "You have done well, Jama.\nThe forest saw your courage\nfrom the very first step.",
          bg: "#0c0d12", border: "#FFD700", color: "#FFE359",
          char: this.onezwaOrb, duration: 4000
        },
        {
          speaker: "ONEZWA",
          text: "Do not let others tell you\nthe forest is evil.\nIt never was.\nIt was merely overrun.",
          bg: "#0c0d12", border: "#FFD700", color: "#FFE359",
          char: this.onezwaOrb, duration: 4000
        },
        {
          speaker: "ONEZWA",
          text: "When you needed strength,\nthe forest gave it.\nWhen you needed courage,\nyour ancestors stood beside you.\nYou were never alone.\nNot for a single moment.",
          bg: "#0c0d12", border: "#FFD700", color: "#FFE359",
          char: this.onezwaOrb, duration: 4500
        },
        {
          speaker: "ONEZWA",
          text: "After your triumph,\nlet the villagers know —\nGod rewards courage.\nHe meets those who try\nhalfway.",
          bg: "#0c0d12", border: "#FFD700", color: "#FFE359",
          char: this.onezwaOrb, duration: 4200
        },
        {
          speaker: "ONEZWA",
          text: "Go home and rest,\nlittle Khwezi.",
          bg: "#0c0d12", border: "#FFD700", color: "#FFE359",
          char: this.onezwaOrb, duration: 2500
        },
        {
          speaker: "KHWEZI",
          text: "Thank you.",
          bg: "#000508", border: "#aaccff", color: "#aaccff",
          char: this.khwezi, duration: 2000
        },
        {
          speaker: "ONEZWA",
          text: "The forest will remember you,\nJama.\nGo well.",
          bg: "#0c0d12", border: "#FFD700", color: "#FFE359",
          char: this.onezwaOrb, duration: 3200
        }
      ];

      // End of Dialogue Sequence
      if (idx >= dialogs.length) {
        if (this.onezwaOrb) {
          this.onezwaOrb.fadeOutDisappear(() => {
            // Onezwa is gone
            this.time.delayedCall(800, () => {
              // Transition to VillageScene
              this.cameras.main.fadeOut(800, 0, 0, 0);
              this.cameras.main.once('camerafadeoutcomplete', () => {
                this.shutdown();
                this.scene.start('VillageScene', { endingCinematic: true });
              });
            });
          });
        } else {
          // Fallback if orb is unavailable
          this.time.delayedCall(800, () => {
            this.shutdown();
            this.scene.start('VillageScene', { endingCinematic: true });
          });
        }
        return;
      }

      const current = dialogs[idx];

      // Speck pulse animation if Onezwa is speaking
      if (current.speaker === "ONEZWA" && this.onezwaOrb) {
        this.onezwaOrb.speakPulse();
      }

      this.showBubble(
        current.speaker, current.text,
        current.bg, current.border, current.color,
        current.char, current.duration,
        () => {
          playNextBubble(idx + 1);
        }
      );
    };

    playNextBubble(0);
  }

  // Typewriter-enabled text dialogue speech bubble
  private showBubble(speaker: string, text: string, bg: string, border: string, color: string, character: any, duration: number, onComplete: () => void) {
    if (this.currentBubble) {
      try { this.currentBubble.destroy(); } catch(e){}
      this.currentBubble = null;
    }

    const sw = this.scale.width;
    const sh = this.scale.height;

    const charX = character ? character.x : sw/2;
    const charY = character ? character.y : sh/2;

    const bw = 260;
    const bh = 85;

    // Center Speech bubble placement above or below depending on entity type
    let bx = charX;
    // Onezwa Orb: above (onezwa.y - 80). Others: below (y + 65)
    let by = (speaker === "ONEZWA") ? (charY - 80) : (charY + 65);

    // Bounds checking
    bx = Phaser.Math.Clamp(bx, bw/2 + 10, sw - bw/2 - 10);
    by = Phaser.Math.Clamp(by, bh/2 + 10, sh - bh/2 - 10);

    const container = this.add.container(bx, by).setDepth(500).setScrollFactor(0);

    const bgInt = parseInt(bg.replace('#','0x'));
    const borderInt = parseInt(border.replace('#','0x'));

    const rect = this.add.rectangle(0, 0, bw, bh, bgInt).setStrokeStyle(2, borderInt);
    
    const lbl = this.add.text(-bw/2 + 8, -bh/2 + 6, speaker, {
      fontSize: '10px', color: border, fontFamily: 'monospace', fontStyle: 'bold'
    });

    const txt = this.add.text(-bw/2 + 8, -bh/2 + 22, '', {
      fontSize: '11px', color: color, fontFamily: 'monospace', wordWrap: { width: bw - 16 }
    });

    container.add([rect, lbl, txt]);
    this.currentBubble = container;

    // Typewriter effect 28ms per character
    let currentIdx = 0;
    const timer = this.time.addEvent({
      delay: 28,
      repeat: text.length - 1,
      callback: () => {
        if (txt && txt.active && container && container.active) {
          txt.text += text[currentIdx];
          currentIdx++;
          if (window.gameAudio && currentIdx % 2 === 0) {
            try { window.gameAudio.playSfx('click'); } catch(e){}
          }
        }
      }
    });

    const totalTypingTime = (text.length * 28) + duration;
    this.time.delayedCall(totalTypingTime, () => {
      try {
        if (container && container.scene) {
          this.tweens.add({
            targets: container,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              try { container.destroy(); } catch(e){}
              if (this.currentBubble === container) {
                this.currentBubble = null;
              }
              if (onComplete) onComplete();
            }
          });
        } else {
          if (onComplete) onComplete();
        }
      } catch(e) {
        if (onComplete) onComplete();
      }
    });
  }

  // Vector stickmen drawer (reused for Jama and Khwezi)
  private drawStickman(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, color: number, alpha: number, runTick: number, isKhwezi: boolean, glanceBack: boolean = false) {
    const torsoL = 26 * scale;
    const legL = 30 * scale;
    const armL = 24 * scale;
    const headRadius = isKhwezi ? 6.5 : 8.5;
    
    let headX = x;
    let headY = y - torsoL - headRadius - 4;
    if (glanceBack) headX -= 3 * scale;

    g.lineStyle(2.5, color, alpha).fillStyle(color, alpha);
    g.strokeCircle(headX, headY, headRadius).fillStyle(color, alpha * 0.25).fillCircle(headX, headY, headRadius - 0.5);

    g.lineBetween(x, y - torsoL, x, y);

    const sL = Math.sin(runTick);
    const sR = -Math.sin(runTick);
    const stride = 11 * scale;
    const rFootX = x + sR * stride;
    const rFootY = y + legL + (sR > 0 ? -3 : 1) * scale;
    const lFootX = x + sL * stride;
    const lFootY = y + legL + (sL > 0 ? -3 : 1) * scale;
    g.lineBetween(x, y, rFootX, rFootY).lineBetween(x, y, lFootX, lFootY);

    g.lineBetween(x - 2, y - torsoL, x + sL * stride, y - torsoL + armL);
    g.lineBetween(x + 2, y - torsoL, x + sR * stride, y - torsoL + armL);

    // Spear accessory for Jama
    if (!isKhwezi) {
      g.lineStyle(1.5, 0x8b5a2b, alpha * 0.9); // mahogany spear shaft
      g.lineBetween(x + 12, y - torsoL - 10, x + 12, y + legL);
      g.fillStyle(0xd3d3d3, alpha * 0.95); // iron spearhead
      g.fillTriangle(x + 12, y - torsoL - 18, x + 9, y - torsoL - 10, x + 15, y - torsoL - 10);
    }
  }

  update(time: number, delta: number) {
    try {
      this.runTick += 0.015 * delta;
      
      // Update OnezwaOrb logic
      if (this.onezwaOrb && this.onezwaOrb.active) {
        this.onezwaOrb.update(time, delta);
      }

      // Redraw graphics layer
      this.renderGraphics.clear();

      // Draw Jama (breathing in Forest)
      this.drawStickman(this.renderGraphics, this.jama.x, this.jama.y, 1.0, 0x00bfff, 1.0, this.runTick * 0.5, false);

      // Draw Khwezi (shorter, blue/green accent)
      this.drawStickman(this.renderGraphics, this.khwezi.x, this.khwezi.y, 0.72, 0x00FFA3, 1.0, this.runTick * 0.5, true);

    } catch(err) {
      console.warn("Harmless DawnForestScene update render skip:", err);
    }
  }

  shutdown() {
    // Kill all active tweens (FIX 2 guidelines)
    this.tweens.killAll();

    // Kill all active timers
    this.time.removeAllEvents();

    // Remove all input listeners
    this.input.removeAllListeners();

    // Remove keyboard keys
    try {
      if (this.input.keyboard) {
        this.input.keyboard.removeAllKeys(true);
      }
    } catch(e) {}

    // Cleanup oscillators
    if (this.activeOscillators) {
      this.activeOscillators.forEach(o => {
        try {
          o.stop(0);
          o.disconnect();
        } catch(e) {}
      });
      this.activeOscillators = [];
    }

    // Destroy graphics arrays
    if (this.graphicsObjects) {
      this.graphicsObjects.forEach(g => {
        if (g && !g.destroyed && g.destroy) {
          g.destroy();
        }
      });
      this.graphicsObjects = [];
    }

    // Destroy speech bubble
    if (this.currentBubble) {
      try { this.currentBubble.destroy(); } catch(e){}
      this.currentBubble = null;
    }

    // Destroy OnezwaOrb
    if (this.onezwaOrb) {
      try { this.onezwaOrb.destroy(); } catch(e){}
      this.onezwaOrb = null;
    }

    GlobalCleanup.cleanScene(this);
  }
}
