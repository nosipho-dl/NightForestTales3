import Phaser from 'phaser';
import { GlobalCleanup } from './cleanup';

// Event bridge helper to React
const updateReactState = (newState: Partial<any>) => {
  if (window.gameState) {
    window.gameState = { ...window.gameState, ...newState };
    if ((window as any).onGameStateChange) {
      (window as any).onGameStateChange(window.gameState);
    }
  }
};

export class EscapeScene extends Phaser.Scene {
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  khweziSprite!: Phaser.GameObjects.Sprite;
  khweziGraphics!: Phaser.GameObjects.Graphics;
  bgGraphics!: Phaser.GameObjects.Graphics;
  debrisGraphics!: Phaser.GameObjects.Graphics;
  redOverlay!: Phaser.GameObjects.Graphics;
  
  // Controls & Inputs
  cursors!: any;
  wasd!: any;
  upButton: any;
  downButton: any;
  leftButton: any;
  rightButton: any;
  moveUp = false;
  moveDown = false;
  moveLeft = false;
  moveRight = false;
  
  // Follow logic lists
  playerHistory: { x: number; y: number }[] = [];
  
  // Visual & Audio States
  khweziX = 640;
  khweziY = 120;
  debrisParticles: any[] = [];
  debrisSpawnEvent!: Phaser.Time.TimerEvent;
  flashEvent!: Phaser.Time.TimerEvent;
  rumbleOscillator: OscillatorNode | null = null;
  rumbleGainNode: GainNode | null = null;
  
  // Timing
  startTime = 0;
  transitionTriggered = false;

  constructor() {
    super('EscapeScene');
  }

  init() {
    updateReactState({ 
      activeScene: 'PassagewayScene', // Map back to existing layout overlay in App.tsx
      isGameOver: false, 
      gameCompleted: false,
      isPaused: false
    });
    this.transitionTriggered = false;
  }

  create() {
    this.events.on('shutdown', this.shutdown, this);
    this.events.on('destroy', this.shutdown, this);

    this.startTime = this.time.now;

    // Reset control buttons
    this.upButton = new Phaser.Events.EventEmitter();
    this.downButton = new Phaser.Events.EventEmitter();
    this.leftButton = new Phaser.Events.EventEmitter();
    this.rightButton = new Phaser.Events.EventEmitter();

    this.upButton.removeAllListeners();
    this.downButton.removeAllListeners();
    this.leftButton.removeAllListeners();
    this.rightButton.removeAllListeners();

    this.upButton.on('pointerdown', () => { this.moveUp = true; });
    this.upButton.on('pointerup', () => { this.moveUp = false; });
    this.upButton.on('pointerout', () => { this.moveUp = false; });

    this.downButton.on('pointerdown', () => { this.moveDown = true; });
    this.downButton.on('pointerup', () => { this.moveDown = false; });
    this.downButton.on('pointerout', () => { this.moveDown = false; });

    this.leftButton.on('pointerdown', () => { this.moveLeft = true; });
    this.leftButton.on('pointerup', () => { this.moveLeft = false; });
    this.leftButton.on('pointerout', () => { this.moveLeft = false; });

    this.rightButton.on('pointerdown', () => { this.moveRight = true; });
    this.rightButton.on('pointerup', () => { this.moveRight = false; });
    this.rightButton.on('pointerout', () => { this.moveRight = false; });

    // Keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      });
    }

    // World size mirrors vertical corridor (1280x2200)
    this.physics.world.setBounds(0, 0, 1280, 2200);
    this.cameras.main.setBackgroundColor('#050302');
    this.cameras.main.setBounds(0, 0, 1280, 2200);

    // Render original gorgeous background layout
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(0.01);
    this.drawBackgroundLayout();

    // Spawn player at Top of Corridor
    this.player = this.physics.add.sprite(640, 120, 'jama-light');
    this.player.setCollideWorldBounds(true);
    this.player.setBodySize(36, 36);
    this.player.setDepth(2);
    this.player.play('jama-light-idle');
    this.player.setTint(0x00FFA3);

    // Spawn follow target Khwezi (static head sprite)
    this.khweziSprite = this.add.sprite(595, 120, 'khwezi').setScale(1.25);
    this.khweziSprite.setDepth(2.1);

    // Procedural Khwezi body stickman layers
    this.khweziGraphics = this.add.graphics().setDepth(2.0);

    // Soft pulsing aura beneath player sprite
    const aura = this.add.graphics();
    aura.fillStyle(0x00FFA3, 1.0);
    aura.fillCircle(0, 0, 11);
    aura.setDepth(1.9);
    this.tweens.add({
      targets: aura,
      alpha: { from: 0.18, to: 0.08 },
      scaleX: { from: 1.15, to: 0.9 },
      scaleY: { from: 1.15, to: 0.9 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (this.player && this.player.active && aura && aura.active) {
          aura.setPosition(this.player.x, this.player.y + 16);
        }
      }
    });

    // Make camera smoothly track sibling
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Collapse warning UI panel fixed in screen space
    const hudContainer = this.add.container(640, 90);
    hudContainer.setScrollFactor(0);
    hudContainer.setDepth(150);

    const bgPanel = this.add.graphics();
    bgPanel.fillStyle(0x0a0f14, 0.85);
    bgPanel.lineStyle(1, 0xff3a3a, 1);
    bgPanel.fillRoundedRect(-170, -32, 340, 65, 6);
    bgPanel.strokeRoundedRect(-170, -32, 340, 65, 6);
    hudContainer.add(bgPanel);

    const mainHeaderText = this.add.text(0, -22, "PASSAGEWAY COLLAPSING", {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '14px',
      color: '#ff3a3a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subText1 = this.add.text(0, -2, "Move downward to escape the cave-in!", {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '12px',
      color: '#f5c842',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const subText2 = this.add.text(0, 16, "Keep moving — the roof is giving way.", {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '11px',
      color: '#7bc8f6',
    }).setOrigin(0.5);

    hudContainer.add(mainHeaderText);
    hudContainer.add(subText1);
    hudContainer.add(subText2);

    this.tweens.add({
      targets: hudContainer,
      alpha: 0.75,
      yoyo: true,
      repeat: -1,
      duration: 1000
    });

    // Start Collapse Effects
    this.debrisGraphics = this.add.graphics().setDepth(130).setScrollFactor(0);
    this.redOverlay = this.add.graphics().setDepth(140).setScrollFactor(0);

    // Red vignette flashing
    this.flashEvent = this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        this.redOverlay.clear();
        this.redOverlay.fillStyle(0xff0000, 0.082);
        this.redOverlay.fillRect(0, 0, 1280, 720);
        this.time.delayedCall(200, () => {
          this.redOverlay.clear();
        });
      }
    });

    // Spawn falling rocks/dust particles
    this.debrisSpawnEvent = this.time.addEvent({
      delay: 150,
      loop: true,
      callback: () => {
        this.debrisParticles.push({
          x: Math.random() * 1280,
          y: -10,
          vy: 240 + Math.random() * 220,
          radius: 1.5 + Math.random() * 2.5,
          color: Math.random() > 0.5 ? 0x2a1a10 : 0x1f140d
        });
      }
    });

    // Low rumble audio synthesis
    try {
      const actx = (window.gameAudio && (window.gameAudio as any).ctx);
      if (actx) {
        if (window.gameAudio) {
          try { window.gameAudio.setMusicTheme('none'); } catch(e) {}
        }
        this.rumbleOscillator = actx.createOscillator();
        this.rumbleGainNode = actx.createGain();
        this.rumbleOscillator.type = 'sine';
        this.rumbleOscillator.frequency.value = 32;
        this.rumbleGainNode.gain.setValueAtTime(0.065, actx.currentTime);
        this.rumbleOscillator.connect(this.rumbleGainNode);
        this.rumbleGainNode.connect(actx.destination);
        this.rumbleOscillator.start();
      }
    } catch(e) {
      console.warn("Rumble synth failed:", e);
    }

    // Camera rumble shake
    this.cameras.main.shake(300000, 0.004);
  }

  update(time: number, delta: number) {
    if (window.gameState.isPaused || this.transitionTriggered) {
      this.player.setVelocity(0, 0);
      return;
    }

    // Drive falling dust particles
    if (this.debrisParticles && this.debrisGraphics) {
      this.debrisGraphics.clear();
      for (let i = this.debrisParticles.length - 1; i >= 0; i--) {
        const p = this.debrisParticles[i];
        p.y += p.vy * (delta / 1000);
        this.debrisGraphics.fillStyle(p.color, 0.65);
        this.debrisGraphics.fillCircle(p.x, p.y, p.radius);
        if (p.y > 750) {
          this.debrisParticles.splice(i, 1);
        }
      }
    }

    // Check bottom threshold to transition to VillageScene
    if (this.player.y >= 2100 && !this.transitionTriggered) {
      this.transitionTriggered = true;
      this.player.setVelocity(0, 0);
      this.stopRumble();

      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.shutdown();
        this.scene.start('DawnForestScene', {
          difficulty: window.gameState?.currentDifficulty || 'medium',
          enemiesDefeated: (window as any).enemiesDefeated || 0,
          artifactsCollected: window.gameState?.artifactsCollected || [],
          elapsedTime: (window as any).elapsedTime || 0
        });
      });
      return;
    }

    // Follower path recorder
    if (!this.playerHistory) {
      this.playerHistory = [];
    }
    this.playerHistory.push({ x: this.player.x, y: this.player.y });
    if (this.playerHistory.length > 30) {
      this.playerHistory.shift();
    }

    const tpos = this.playerHistory[this.playerHistory.length - 16];
    if (tpos) {
      this.khweziX = tpos.x;
      this.khweziY = tpos.y;
      this.khweziSprite.setPosition(tpos.x, tpos.y);
    }

    // Read game NAV controls
    if (window.gameInput) {
      this.moveUp = !!window.gameInput.up;
      this.moveDown = !!window.gameInput.down;
      this.moveLeft = !!window.gameInput.left;
      this.moveRight = !!window.gameInput.right;
    }

    let vx = 0;
    let vy = 0;
    const speed = 190; // High speed sprint escape

    if (this.moveUp || (this.cursors?.up?.isDown) || (this.wasd?.up?.isDown)) vy = -speed;
    if (this.moveDown || (this.cursors?.down?.isDown) || (this.wasd?.down?.isDown)) vy = speed;
    if (this.moveLeft || (this.cursors?.left?.isDown) || (this.wasd?.left?.isDown)) vx = -speed;
    if (this.moveRight || (this.cursors?.right?.isDown) || (this.wasd?.right?.isDown)) vx = speed;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.player.setVelocity(vx, vy);

    if (vx < 0) {
      this.player.setFlipX(true);
      this.khweziSprite.setFlipX(true);
    } else if (vx > 0) {
      this.player.setFlipX(false);
      this.khweziSprite.setFlipX(false);
    }

    if (vx !== 0 || vy !== 0) {
      this.player.play('jama-light-run', true);
    } else {
      this.player.play('jama-light-idle', true);
    }

    // Redraw procedural khwezi body
    this.drawKhweziBody(time);
  }

  drawBackgroundLayout() {
    this.bgGraphics.clear();

    // 1. Ground base
    this.bgGraphics.fillStyle(0x0a0705, 1.0);
    this.bgGraphics.fillRect(0, 0, 1280, 2200);

    // Slabs
    this.bgGraphics.fillStyle(0x120d0a, 1.0);
    const slabW = 60;
    const slabH = 90;
    const gap = 5;
    for (let x = 180; x < 1100; x += slabW + gap) {
      for (let y = 0; y < 2200; y += slabH + gap) {
        this.bgGraphics.fillRect(x, y, slabW, slabH);
      }
    }

    // Walls
    this.bgGraphics.fillStyle(0x18110e, 1.0);
    this.bgGraphics.fillRect(0, 0, 180, 2200);
    this.bgGraphics.fillRect(1100, 0, 180, 2200);

    // Pillar columns
    this.bgGraphics.fillStyle(0x060403, 1.0);
    for (let y = 100; y < 2100; y += 400) {
      this.bgGraphics.fillRect(140, y, 40, 120);
      this.bgGraphics.fillRect(1100, y, 40, 120);
    }
  }

  drawKhweziBody(time: number) {
    if (!this.khweziGraphics) return;
    this.khweziGraphics.clear();

    // Sways
    const swayAngle = Math.sin(time * 0.005) * 0.05;
    const scale = 0.72;

    const anchorX = this.khweziX;
    const anchorY = this.khweziY + Math.sin(time * 0.005) * 1.5;

    const neckX = anchorX + Math.sin(swayAngle) * -4;
    const neckY = anchorY - 30 * scale;

    const pelvisX = anchorX;
    const pelvisY = anchorY + 10 * scale;

    const leftKneeX = anchorX - 12 * scale;
    const leftKneeY = anchorY + 30 * scale;
    const leftFootX = anchorX - 15 * scale;
    const leftFootY = anchorY + 50 * scale;

    const rightKneeX = anchorX + 12 * scale;
    const rightKneeY = anchorY + 30 * scale;
    const rightFootX = anchorX + 15 * scale;
    const rightFootY = anchorY + 50 * scale;

    this.khweziGraphics.lineStyle(2.5, 0x0091ff, 1.0); // Khwezi blue stroke

    // Torso spine
    this.khweziGraphics.beginPath();
    this.khweziGraphics.moveTo(neckX, neckY);
    this.khweziGraphics.lineTo(pelvisX, pelvisY);
    this.khweziGraphics.strokePath();

    // Hips block
    this.khweziGraphics.lineBetween(pelvisX - 8 * scale, pelvisY, pelvisX + 8 * scale, pelvisY);

    // Left leg
    this.khweziGraphics.beginPath();
    this.khweziGraphics.moveTo(pelvisX - 5 * scale, pelvisY);
    this.khweziGraphics.lineTo(leftKneeX, leftKneeY);
    this.khweziGraphics.lineTo(leftFootX, leftFootY);
    this.khweziGraphics.strokePath();

    // Right leg
    this.khweziGraphics.beginPath();
    this.khweziGraphics.moveTo(pelvisX + 5 * scale, pelvisY);
    this.khweziGraphics.lineTo(rightKneeX, rightKneeY);
    this.khweziGraphics.lineTo(rightFootX, rightFootY);
    this.khweziGraphics.strokePath();

    // Shoulders beam
    this.khweziGraphics.lineBetween(neckX - 15 * scale, neckY, neckX + 15 * scale, neckY);

    // Left Arm
    this.khweziGraphics.lineBetween(neckX - 15 * scale, neckY, neckX - 25 * scale, neckY + 15 * scale);
    // Right Arm
    this.khweziGraphics.lineBetween(neckX + 15 * scale, neckY, neckX + 25 * scale, neckY + 15 * scale);
  }

  stopRumble() {
    try {
      if (this.rumbleOscillator) {
        this.rumbleOscillator.stop();
        this.rumbleOscillator.disconnect();
      }
      if (this.rumbleGainNode) {
        this.rumbleGainNode.disconnect();
      }
    } catch(err) {}
  }

  shutdown() {
    this.stopRumble();
    if (this.flashEvent) this.flashEvent.destroy();
    if (this.debrisSpawnEvent) this.debrisSpawnEvent.destroy();
    GlobalCleanup.cleanScene(this);
  }
}
