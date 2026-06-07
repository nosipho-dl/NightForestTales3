/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Phaser from 'phaser';
import { generateGameTextures } from './textures';
import { GlobalCleanup } from './cleanup';
import { OnezwaOrb } from './onezwaOrb';

// Define the event bridge to React
const updateReactState = (newState: Partial<any>) => {
  if (window.gameState) {
    window.gameState = { ...window.gameState, ...newState };
    if ((window as any).onGameStateChange) {
      (window as any).onGameStateChange(window.gameState);
    }
  }
};

const attachEnemyGlow = (scene: Phaser.Scene, enemy: Phaser.Physics.Arcade.Sprite) => {
  const size = (enemy.body ? enemy.body.width : 32) || 32;
  const radius = (size * 1.3) / 2;
  const glow = scene.add.graphics();
  glow.fillStyle(0xFF3A3A, 0.25);
  glow.fillCircle(0, 0, radius);
  glow.setDepth(enemy.depth - 0.1); // depth below enemy sprite
  enemy.setData('glow', glow);

  enemy.on('destroy', () => {
    if (glow && glow.active) {
      glow.destroy();
    }
  });
  return glow;
};

class EyePair extends Phaser.GameObjects.Graphics {
  blinkTimer: Phaser.Time.TimerEvent | null = null;
  isFadingOut = false;

  constructor(scene: Phaser.Scene) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(1.4);
    this.respawn();
    this.startBlinkTimer();
  }

  respawn() {
    let rx = 0;
    let ry = 0;
    const player = (this.scene as any).player;
    const px = player ? player.x : 150;
    const py = player ? player.y : 1280;

    for (let attempts = 0; attempts < 50; attempts++) {
      rx = Phaser.Math.Between(50, 2510);
      ry = Phaser.Math.Between(50, 2510);

      if (Phaser.Math.Distance.Between(rx, ry, px, py) > 300) {
        break;
      }
    }

    this.setPosition(rx, ry);
    this.alpha = 0.6;
    this.isFadingOut = false;

    this.clear();
    this.fillStyle(0xFF3A3A, 1.0);
    this.fillEllipse(-5, 0, 4, 6);
    this.fillEllipse(5, 0, 4, 6);
  }

  startBlinkTimer() {
    this.blinkTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(2000, 6000),
      callback: () => {
        if (!this.active || this.isFadingOut) return;
        this.scene.tweens.add({
          targets: this,
          alpha: 0,
          duration: 150,
          yoyo: true,
          repeat: 0,
          onComplete: () => {
            if (this.active && !this.isFadingOut) {
              this.alpha = 0.6;
            }
          }
        });
        this.startBlinkTimer();
      }
    });
  }

  retreat() {
    if (this.isFadingOut) return;
    this.isFadingOut = true;
    if (this.blinkTimer) {
      this.blinkTimer.destroy();
    }

    if (window.gameAudio && typeof window.gameAudio.playEyeDisappear === 'function') {
      window.gameAudio.playEyeDisappear();
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        if (this.active) {
          this.respawn();
          this.startBlinkTimer();
        }
      }
    });
  }

  destroy(fromScene?: boolean) {
    if (this.blinkTimer) {
      this.blinkTimer.destroy();
    }
    super.destroy(fromScene);
  }
}

// 1. BOOT SCENE
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // Generate all procedurally compiled canvas textures synchronously
    generateGameTextures(this.game);
    
    const anims = this.anims;
    // Configure Regular Player Jama Animations
    if (!anims.exists('jama-idle')) {
      anims.create({
        key: 'jama-idle',
        frames: [
          { key: 'jama', frame: '0' },
          { key: 'jama', frame: '1' }
        ],
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!anims.exists('jama-run')) {
      anims.create({
        key: 'jama-run',
        frames: [
          { key: 'jama', frame: '2' },
          { key: 'jama', frame: '3' },
          { key: 'jama', frame: '4' },
          { key: 'jama', frame: '5' }
        ],
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!anims.exists('jama-attack')) {
      anims.create({
        key: 'jama-attack',
        frames: [
          { key: 'jama', frame: '6' },
          { key: 'jama', frame: '7' }
        ],
        frameRate: 15,
        repeat: 0,
      });
    }

    // Configure Upgraded Light Player Jama Animations
    if (!anims.exists('jama-light-idle')) {
      anims.create({
        key: 'jama-light-idle',
        frames: [
          { key: 'jama-light', frame: '0' },
          { key: 'jama-light', frame: '1' }
        ],
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!anims.exists('jama-light-run')) {
      anims.create({
        key: 'jama-light-run',
        frames: [
          { key: 'jama-light', frame: '2' },
          { key: 'jama-light', frame: '3' },
          { key: 'jama-light', frame: '4' },
          { key: 'jama-light', frame: '5' }
        ],
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!anims.exists('jama-light-walk')) {
      anims.create({
        key: 'jama-light-walk',
        frames: [
          { key: 'jama-light', frame: '2' },
          { key: 'jama-light', frame: '3' },
          { key: 'jama-light', frame: '4' },
          { key: 'jama-light', frame: '5' }
        ],
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!anims.exists('jama-light-attack')) {
      anims.create({
        key: 'jama-light-attack',
        frames: [
          { key: 'jama-light', frame: '6' },
          { key: 'jama-light', frame: '7' }
        ],
        frameRate: 15,
        repeat: 0,
      });
    }

    this.scene.start('MainMenuScene');
  }
}

// 2. MAIN MENU SCENE
export class MainMenuScene extends Phaser.Scene {
  starsGraphics!: Phaser.GameObjects.Graphics;
  acaciaGraphics!: Phaser.GameObjects.Graphics;
  stars: { x: number; y: number; alpha: number; speed: number; dir: number }[] = [];

  constructor() {
    super('MainMenuScene');
  }

  create() {
    updateReactState({ activeScene: 'MainMenu' });
    if (window.gameAudio) {
      window.gameAudio.setMusicTheme('menu');
    }

    // Process a twinkling dense starfield procedurally
    this.starsGraphics = this.add.graphics();
    for (let i = 0; i < 220; i++) {
      this.stars.push({
        x: Math.random() * 1280,
        y: Math.random() * 550,
        alpha: Math.random(),
        speed: 0.01 + Math.random() * 0.02,
        dir: Math.random() > 0.5 ? 1 : -1,
      });
    }

    // Draw full moon in top-right
    const moonGraphics = this.add.graphics();
    // Halo
    moonGraphics.fillStyle(0xffeec2, 0.15);
    moonGraphics.fillCircle(1120, 110, 65);
    moonGraphics.fillStyle(0xffeec2, 0.3);
    moonGraphics.fillCircle(1120, 110, 50);
    // Real Moon circle
    moonGraphics.fillStyle(0xfffff0, 1.0);
    moonGraphics.fillCircle(1120, 110, 38);
    // Soft craters
    moonGraphics.fillStyle(0xe6dfc3, 0.9);
    moonGraphics.fillCircle(1105, 100, 7);
    moonGraphics.fillCircle(1135, 120, 5);
    moonGraphics.fillCircle(1115, 125, 4);

    // Draw silhouettes of thatched round huts (rondavels) at the bottom
    const terrain = this.add.graphics();
    terrain.fillStyle(0x040409, 1.0); // very dark
    terrain.fillRect(0, 620, 1280, 100);

    // Draw silhouettes of huts (simple half circles + trapezoid thatch roof)
    const drawHutSilhouette = (x: number, scale: number) => {
      terrain.fillStyle(0x020205, 1.0);
      // walls
      terrain.fillRect(x - 25 * scale, 580, 50 * scale, 50);
      // thatch roof
      terrain.beginPath();
      terrain.moveTo(x - 35 * scale, 580);
      terrain.lineTo(x, 520);
      terrain.lineTo(x + 35 * scale, 580);
      terrain.closePath();
      terrain.fill();
    };

    drawHutSilhouette(200, 1.2);
    drawHutSilhouette(320, 0.9);
    drawHutSilhouette(880, 1.1);
    drawHutSilhouette(1020, 1.3);

    // Draw acacia tree silhouettes
    this.acaciaGraphics = this.add.graphics();
    this.acaciaGraphics.fillStyle(0x020205, 0.95);
    // Draw tree on left
    const drawAcacia = (tx: number, ty: number, th: number) => {
      this.acaciaGraphics.fillRect(tx - 6, ty - th, 12, th); // trunk
      // draw flat layered canopy
      this.acaciaGraphics.fillEllipse(tx, ty - th, 70, 16);
      this.acaciaGraphics.fillEllipse(tx - 25, ty - th - 12, 45, 10);
      this.acaciaGraphics.fillEllipse(tx + 25, ty - th - 10, 40, 10);
    };
    drawAcacia(110, 630, 150);
    drawAcacia(1220, 630, 180);

    // Subtle drift smoke particle simulation from a rondavel
    const smokeParticles = this.add.particles(320, 520, 'part-violet', {
      alpha: { start: 0.25, end: 0 },
      scale: { start: 0.6, end: 1.8 },
      speedY: -25,
      speedX: { min: -6, max: 12 },
      frequency: 240,
      lifespan: 3600,
    });
    smokeParticles.setDepth(1);
  }

  update() {
    // Handle twinkling stars animation in menu
    this.starsGraphics.clear();
    this.stars.forEach((star) => {
      star.alpha += star.speed * star.dir;
      if (star.alpha >= 0.95) {
        star.alpha = 0.95;
        star.dir = -1;
      } else if (star.alpha <= 0.15) {
        star.alpha = 0.15;
        star.dir = 1;
      }
      this.starsGraphics.fillStyle(0xffffff, star.alpha);
      this.starsGraphics.fillPoint(star.x, star.y, 2);
    });
  }
}

// 3. DIFFICULTY SCENE
export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super('DifficultyScene');
  }

  create() {
    updateReactState({ activeScene: 'Difficulty' });
  }
}

// 4. CUTSCENE SCENE 1 (THE ABDUCTION)
export class CutsceneScene1 extends Phaser.Scene {
  constructor() {
    super('CutsceneScene1');
  }

  create() {
    updateReactState({ activeScene: 'Cutscene' });
    // Moonlit village backdrop showing tin-roof house, hanging lanterns, and tied torches (Setting Image 1)
    this.add.image(640, 360, 'scene1-bg1');
  }
}

// 5. VILLAGE SCENE (THE CALLING)
export class VillageScene extends Phaser.Scene {
  jamaSprite!: Phaser.GameObjects.Sprite;
  orbSprite!: Phaser.GameObjects.Sprite;
  orbParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Ending Cinematic Fields
  isEndingCinematic = false;
  khweziSprite!: Phaser.GameObjects.Sprite;
  campfireGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('VillageScene');
  }

  init(data?: any) {
    this.isEndingCinematic = !!(data && data.endingCinematic);
    if (this.isEndingCinematic) {
      updateReactState({ activeScene: 'VillageEnding' });
    } else {
      updateReactState({ activeScene: 'Village' });
    }
  }

  create() {
    if (this.isEndingCinematic) {
      this.createEndingCinematic();
      return;
    }

    updateReactState({ activeScene: 'Village' });
    if (window.gameAudio) {
      window.gameAudio.setMusicTheme('menu');
    }

    // Moonlit symmetric thatch-roof huts with dirt pathway leading back to rice paddies (Setting Image 2)
    this.add.image(640, 360, 'scene1-bg2');

    // Add cold glowing camp ash pit in center
    const ash = this.add.graphics();
    ash.fillStyle(0x1a1a24, 1.0);
    ash.fillEllipse(640, 480, 70, 35);
    ash.fillStyle(0x0c0c12, 1.0);
    ash.fillEllipse(640, 480, 55, 25);

    // Add Jama Kneeling on the left, head bowed (use a scale and rotate tween to signify grief)
    this.jamaSprite = this.add.sprite(450, 480, 'jama').setScale(1.4);
    this.jamaSprite.setAngle(-12); // tilted in posture of defeat

    // Sucking pulse animation for kneeling grief
    this.tweens.add({
      targets: this.jamaSprite,
      scaleX: 1.34,
      scaleY: 1.44,
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });

    // Spawn Ancestral Guide Orb Onezwa far right and glide in (delay 2s) - beautifully designed orb container
    this.orbSprite = new OnezwaOrb(this, 1400, 240) as any;
    this.orbSprite.setAlpha(0);
    
    // Trail particles for Onezwa
    this.orbParticles = this.add.particles(0, 0, 'part-gold', {
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      speed: 15,
      frequency: 60,
      lifespan: 800,
      blendMode: 'ADD',
    });
    this.orbParticles.startFollow(this.orbSprite);
    this.orbParticles.stop(); // start when orb arrives

    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: this.orbSprite,
        x: 820,
        y: 350,
        alpha: 1,
        duration: 2500,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.orbParticles.start();
          // Activate particle orbit on the beautiful customized OnezwaOrb
          if (this.orbSprite && (this.orbSprite as any).p1) {
            (this.orbSprite as any).orbitActive = true;
            (this.orbSprite as any).p1.setVisible(true);
            (this.orbSprite as any).p2.setVisible(true);
            (this.orbSprite as any).p3.setVisible(true);
          }
        },
      });
    });

    // Track state bridge transitions
    this.events.on('shutdown', () => {
      if (this.orbParticles) this.orbParticles.destroy();
    });
  }

  createEndingDialogueBubble(
    character: any,
    fullText: string,
    speakerKey: 'jama' | 'khwezi',
    onComplete: () => void
  ) {
    const gameWidth = 1280;
    const gameHeight = 720;
    const bubbleWidth = 300;
    const bubbleHeight = 90;

    let bx = character.x;
    let by = character.y + 70; // Appear below character's body

    if (bx + bubbleWidth / 2 > gameWidth - 10) {
      bx = gameWidth - bubbleWidth / 2 - 10;
    }
    if (bx - bubbleWidth / 2 < 10) {
      bx = bubbleWidth / 2 + 10;
    }
    if (by + bubbleHeight > gameHeight - 10) {
      by = character.y - bubbleHeight - 30;
    }

    const bubbleContainer = this.add.container(bx, by);
    bubbleContainer.setDepth(200);

    const graphics = this.add.graphics();
    bubbleContainer.add(graphics);

    const isJama = (speakerKey === 'jama');
    const bgColor = isJama ? 0x000d05 : 0x000508;
    const strokeColor = isJama ? 0x00ffa3 : 0xaaccff;
    const plateColor = isJama ? '#00ffa3' : '#aaccff';
    const textColor = isJama ? '#00ffa3' : '#aaccff';
    const plateText = isJama ? "JAMA" : "KHWEZI";

    const actualIsBelow = by > character.y;

    // Glow
    for (let g = 1; g <= 5; g++) {
      graphics.lineStyle(g * 3, strokeColor, 0.08 / g);
      if (actualIsBelow) {
        graphics.strokeRoundedRect(-bubbleWidth / 2 - g * 1.5, -g * 1.5, bubbleWidth + g * 3, bubbleHeight + g * 3, 8);
      } else {
        graphics.strokeRoundedRect(-bubbleWidth / 2 - g * 1.5, -bubbleHeight - g * 1.5, bubbleWidth + g * 3, bubbleHeight + g * 3, 8);
      }
    }

    // BG & Border
    graphics.fillStyle(bgColor, 1.0);
    graphics.lineStyle(2, strokeColor, 1.0);
    if (actualIsBelow) {
      graphics.fillRoundedRect(-bubbleWidth / 2, 0, bubbleWidth, bubbleHeight, 8);
      graphics.strokeRoundedRect(-bubbleWidth / 2, 0, bubbleWidth, bubbleHeight, 8);
    } else {
      graphics.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);
      graphics.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);
    }

    // Speech Tail
    graphics.fillStyle(bgColor, 1.0);
    graphics.beginPath();
    if (actualIsBelow) {
      graphics.moveTo(-10, 0);
      graphics.lineTo(10, 0);
      graphics.lineTo(0, -18);
    } else {
      graphics.moveTo(-10, 0);
      graphics.lineTo(10, 0);
      graphics.lineTo(0, 18);
    }
    graphics.closePath();
    graphics.fillPath();

    graphics.lineStyle(2, strokeColor, 1.0);
    graphics.beginPath();
    if (actualIsBelow) {
      graphics.moveTo(-10, 0);
      graphics.lineTo(0, -18);
      graphics.lineTo(10, 0);
    } else {
      graphics.moveTo(-10, 0);
      graphics.lineTo(0, 18);
      graphics.lineTo(10, 0);
    }
    graphics.strokePath();

    graphics.lineStyle(3.5, bgColor, 1.0);
    if (actualIsBelow) {
      graphics.lineBetween(-8, 1, 8, 1);
    } else {
      graphics.lineBetween(-8, -1, 8, -1);
    }

    // Divider
    graphics.lineStyle(1, strokeColor, 0.7);
    if (actualIsBelow) {
      graphics.lineBetween(-bubbleWidth / 2 + 18, 22, bubbleWidth / 2 - 18, 22);
    } else {
      graphics.lineBetween(-bubbleWidth / 2 + 18, -bubbleHeight + 22, bubbleWidth / 2 - 18, -bubbleHeight + 22);
    }

    // Name
    const namePlateY = actualIsBelow ? 7 : -bubbleHeight + 7;
    const namePlate = this.add.text(-bubbleWidth / 2 + 18, namePlateY, plateText, {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '11px',
      color: plateColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    bubbleContainer.add(namePlate);

    const dialogueTextY = actualIsBelow ? 28 : -bubbleHeight + 28;
    const txt = this.add.text(-bubbleWidth / 2 + 18, dialogueTextY, "", {
      fontFamily: '"Space Grotesk", "Courier New", Courier, monospace',
      fontSize: '13px',
      color: textColor,
      wordWrap: { width: bubbleWidth - 36 },
      fontStyle: 'bold',
    });
    bubbleContainer.add(txt);

    if (window.gameAudio) {
      window.gameAudio.playSfx('click');
    }

    let charIndex = 0;
    const totalChars = fullText.length;
    txt.setText("");

    const timer = this.time.addEvent({
      delay: 35,
      repeat: totalChars - 1,
      callback: () => {
        charIndex++;
        if (txt && txt.active) {
          txt.setText(fullText.substring(0, charIndex));
        }
        if (charIndex === totalChars) {
          this.time.delayedCall(2800, () => {
            if (this.tweens) {
              this.tweens.add({
                targets: bubbleContainer,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                  bubbleContainer.destroy();
                  onComplete();
                }
              });
            }
          });
        }
      }
    });
  }

  createEndingCinematic() {
    updateReactState({ activeScene: 'VillageEnding' });
    if (window.gameAudio) {
      window.gameAudio.setMusicTheme('menu');
    }

    // Moonlit village background
    this.add.image(640, 360, 'scene1-bg2');

    // Warm orange campfire glowing base
    const ash = this.add.graphics();
    ash.fillStyle(0x1a1a24, 1.0);
    ash.fillEllipse(640, 480, 70, 35);
    ash.fillStyle(0x0c0c12, 1.0);
    ash.fillEllipse(640, 480, 55, 25);

    // Dynamic flickering flame particle/arcs represents fire
    this.campfireGraphics = this.add.graphics();
    this.campfireGraphics.setDepth(1.5);
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (this.campfireGraphics) {
          this.campfireGraphics.clear();
          
          // Outer flame yellow-orange aura
          const radius = 30 + Math.random() * 15;
          this.campfireGraphics.fillStyle(0xff5a00, 0.4);
          this.campfireGraphics.fillCircle(640, 475, radius);

          // Inner vibrant flames
          for (let i = 0; i < 5; i++) {
            const fx = 640 + (Math.random() - 0.5) * 24;
            const fy = 480 - Math.random() * 45;
            const fsize = 8 + Math.random() * 12;
            this.campfireGraphics.fillStyle(i % 2 === 0 ? 0xff3a00 : 0xffb300, 0.85);
            this.campfireGraphics.fillCircle(fx, fy, fsize);
          }
        }
      }
    });

    // Create Sibling sprites
    this.jamaSprite = this.add.sprite(590, 480, 'jama').setScale(1.4);
    this.jamaSprite.setFlipX(false); // Facing right (toward sister and center)
    this.jamaSprite.setDepth(2);

    this.khweziSprite = this.add.sprite(670, 480, 'khwezi').setScale(1.4);
    this.khweziSprite.setFlipX(true); // Facing left (toward brother)
    this.khweziSprite.setDepth(2);

    // Subtle breath sways on siblings
    this.tweens.add({
      targets: this.jamaSprite,
      scaleX: 1.37,
      scaleY: 1.43,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: this.khweziSprite,
      scaleX: 1.37,
      scaleY: 1.43,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Cascade Dialog sequence after 1500ms initial silence
    this.time.delayedCall(1500, () => {
      // 1. Jama: "Sesifikile ekhaya, sis wam."
      this.createEndingDialogueBubble(this.jamaSprite, "Sesifikile ekhaya, sis wam.", 'jama', () => {
        // 2. Khwezi: "We made it. I'm grateful to have you as my brother."
        this.createEndingDialogueBubble(this.khweziSprite, "We made it. I'm grateful to have you as my brother.", 'khwezi', () => {
          // 3. Jama: "Together again (sigh)Let's put this long night behind us."
          this.createEndingDialogueBubble(this.jamaSprite, "Together again (sigh). Let's put this long night behind us.", 'jama', () => {
            // 4. Khwezi: "All is well." (Add visual golden sparkles around both siblings to symbolize smile)
            
            // Sparkles
            const spark = this.add.particles(630, 440, 'part-gold', {
              speed: 40,
              scale: { start: 0.8, end: 0 },
              alpha: { start: 1.0, end: 0 },
              lifespan: 1200,
              maxParticles: 35,
              emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(-60, -30, 120, 60)
              }
            });
            this.time.delayedCall(2000, () => { spark.destroy(); });

            this.createEndingDialogueBubble(this.khweziSprite, "All is well.", 'khwezi', () => {
              // dialogue sequence ends: wait 1500ms, fade main camera to black over 2500ms
              this.time.delayedCall(1500, () => {
                this.cameras.main.fadeOut(2500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                  this.scene.start('EndingCreditsScene', {
                    difficulty: (this as any).currentDifficulty || 'medium'
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  showVictoryScreenCard() {
    const cardContainer = this.add.container(640, 360);
    cardContainer.setDepth(300);

    const bgG = this.add.graphics();
    bgG.fillStyle(0x020205, 1.0);
    bgG.fillRect(-640, -360, 1280, 720);
    
    // Transparent center card overlay
    bgG.fillStyle(0x0a1017, 0.9);
    bgG.lineStyle(1.5, 0x2d7a4f, 1.0);
    bgG.fillRoundedRect(-240, -140, 480, 280, 12);
    bgG.strokeRoundedRect(-240, -140, 480, 280, 12);

    cardContainer.add(bgG);

    // Title text: YOU RESCUED KHWEZI
    const titleText = this.add.text(0, -75, "YOU RESCUED KHWEZI", {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '32px',
      color: '#f5c842',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    // Subtitle text: The spirit of the forest rests...
    const subtitleText = this.add.text(0, -15, "The spirit of the forest rests...\nbut the trails remember.", {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '16px',
      color: '#888888',
      fontStyle: 'italic',
      align: 'center'
    }).setOrigin(0.5);

    // Gold sparkle particle loop around the title text
    const titleSparkles = this.add.particles(300, 320, 'part-gold', {
      speed: 20,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 1000,
      frequency: 250,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(440, 250, 400, 60)
      }
    });

    const menuButtonX = 0;
    const menuButtonY = 60;
    const mbWidth = 240;
    const mbHeight = 44;

    const btnContainer = this.add.container(menuButtonX, menuButtonY);
    
    const btnBG = this.add.graphics();
    btnBG.fillStyle(0x0d3a1f, 1.0);
    btnBG.lineStyle(2, 0x2d7a4f, 1.0);
    btnBG.fillRoundedRect(-mbWidth / 2, -mbHeight / 2, mbWidth, mbHeight, 6);
    btnBG.strokeRoundedRect(-mbWidth / 2, -mbHeight / 2, mbWidth, mbHeight, 6);
    btnContainer.add(btnBG);

    const btnText = this.add.text(0, 0, "RETURN TO MENU", {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '14px',
      color: '#00ffa3',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    btnContainer.add(btnText);

    btnBG.setInteractive(new Phaser.Geom.Rectangle(-mbWidth / 2, -mbHeight / 2, mbWidth, mbHeight), Phaser.Geom.Rectangle.Contains);
    
    btnBG.on('pointerover', () => {
      btnBG.clear();
      btnBG.fillStyle(0x13532c, 1.0);
      btnBG.lineStyle(2, 0x00ffa3, 1.0);
      btnBG.fillRoundedRect(-mbWidth / 2, -mbHeight / 2, mbWidth, mbHeight, 6);
      btnBG.strokeRoundedRect(-mbWidth / 2, -mbHeight / 2, mbWidth, mbHeight, 6);
      btnText.setColor('#ffffff');
    });

    btnBG.on('pointerout', () => {
      btnBG.clear();
      btnBG.fillStyle(0x0d3a1f, 1.0);
      btnBG.lineStyle(2, 0x2d7a4f, 1.0);
      btnBG.fillRoundedRect(-mbWidth / 2, -mbHeight / 2, mbWidth, mbHeight, 6);
      btnBG.strokeRoundedRect(-mbWidth / 2, -mbHeight / 2, mbWidth, mbHeight, 6);
      btnText.setColor('#00ffa3');
    });

    btnBG.on('pointerdown', () => {
      if (window.gameAudio) {
        window.gameAudio.playSfx('click');
      }
      titleSparkles.destroy();
      cardContainer.destroy();
      
      // Stop and restart to MainMenuScene
      this.scene.stop('VillageScene');
      updateReactState({ isGameOver: false, gameCompleted: false });
      this.scene.start('MainMenuScene');
    });

    cardContainer.add(titleText);
    cardContainer.add(subtitleText);
    cardContainer.add(btnContainer);
  }
}

// 6. FOREST SCENE (LEVEL 2 - THE HUNT)
export class ForestScene extends Phaser.Scene {
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  obstacles!: Phaser.Physics.Arcade.StaticGroup;
  relicsGroup!: Phaser.Physics.Arcade.StaticGroup;
  enemiesGroup!: Phaser.Physics.Arcade.Group;
  projectilesGroup!: Phaser.Physics.Arcade.Group;
  bloodParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  goldParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  
  // Thorny bushes hazard and stats tracking fields
  thornsGroup!: Phaser.Physics.Arcade.StaticGroup;
  herbsGroup!: Phaser.Physics.Arcade.StaticGroup;
  shrubsGroup!: Phaser.GameObjects.Group;
  playerOnThorn = false;
  playerHiding = false;
  lastThornDamageTime = 0;
  lastRegenTime = 0;
  startTime = 0;

  relicNearIndex: number | null = null;
  relicOverlappedList: Phaser.GameObjects.Sprite[] = [];
  
  isAttacking = false;
  isDashing = false;
  lastDashTime = 0;
  dashCooldown = 2000; // ms
  
  // HUD variables
  timerInterval: any = null;
  lastPosSyncTime = 0;
  lastPlayerMoveTime = 0;
  lastChimePlayTime = 0;

  // Atmospheric horror fields
  eyesGroup!: Phaser.GameObjects.Group;
  mistStrips: { rect: Phaser.GameObjects.Rectangle; speed: number }[] = [];
  remainsGroup!: Phaser.GameObjects.Group;
  shadowTimer: Phaser.Time.TimerEvent | null = null;
  howlShockwaveTimer: Phaser.Time.TimerEvent | null = null;

  // Lantern mechanics and overhauled combat / atmosphere state fields
  darknessOverlay!: Phaser.GameObjects.RenderTexture;
  lightMaskImage!: Phaser.GameObjects.Image;
  lightMaskBrush!: Phaser.GameObjects.Graphics;
  lightPoolGraphics!: Phaser.GameObjects.Graphics;
  jamaBlueOutline!: Phaser.GameObjects.Graphics;
  lanternWarningText!: Phaser.GameObjects.Text;
  
  flickerScheduleTimer: Phaser.Time.TimerEvent | null = null;
  fuelDrainTimer: Phaser.Time.TimerEvent | null = null;
  currentDrainRate = 0.3;

  gameplayStarted = false;
  isBlocking = false;
  blockStartTime = 0;
  lastBlockTime = 0;
  blockCooldown = 3000;
  isShieldBashing = false;
  lastBashTime = 0;
  lastStrikeTime = 0;
  lastHeartbeatTime = 0;
  vignetteHeartbeatPulseEndTime = 0;
  nextFlickerTime = 0;
  flickerEndTime = 0;
  isFlickering = false;
  shieldFlashState: 'gold' | 'blue' | null = null;
  spearGraphics!: Phaser.GameObjects.Graphics;
  shieldGraphics!: Phaser.GameObjects.Graphics;
  lanternPool!: Phaser.GameObjects.Graphics;

  upButton: any;
  downButton: any;
  leftButton: any;
  rightButton: any;
  moveUp = false;
  moveDown = false;
  moveLeft = false;
  moveRight = false;
  cutsceneComplete = false;
  cutsceneActive = false;
  blockActive = false;
  playerSpeed = 160;
  baseSpeed = 160;
  cursors!: any;
  wasd!: any;

  constructor() {
    super('ForestScene');
  }

  init(data?: any) {
    this.gameplayStarted = false;
    this.playerOnThorn = false;
    this.playerHiding = false;
    this.isAttacking = false;
    this.isDashing = false;
    this.isBlocking = false;
    this.isShieldBashing = false;
    this.blockActive = false;
    (this as any).dashActive = false;
    (this as any).crouching = false;
    (this as any).strikeCooldown = false;
    (this as any).blockCooldownPct = 0;
    (this as any).bashCooldown = false;
    (this as any).dashCooldown = false;

    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.playerSpeed = this.baseSpeed;

    GlobalCleanup.cleanScene(this);
  }

  shutdown() {
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;
    if (this.player && this.player.active) {
      this.player.setVelocity(0, 0);
    }
    if (this.upButton) this.upButton.removeAllListeners();
    if (this.downButton) this.downButton.removeAllListeners();
    if (this.leftButton) this.leftButton.removeAllListeners();
    if (this.rightButton) this.rightButton.removeAllListeners();
    if (this.tweens) this.tweens.killAll();
    if (this.time) this.time.removeAllEvents();
    if (this.input && this.input.keyboard) {
      this.input.keyboard.removeAllKeys(true);
    }

    GlobalCleanup.cleanScene(this);
    this.shutdownForestScene();
  }

  create(data?: { loadFromSave?: boolean; playerX?: number; playerY?: number }) {
    this.events.on('shutdown', this.shutdown, this);
    this.events.on('destroy', this.shutdown, this);

    this.upButton = new Phaser.Events.EventEmitter();
    this.downButton = new Phaser.Events.EventEmitter();
    this.leftButton = new Phaser.Events.EventEmitter();
    this.rightButton = new Phaser.Events.EventEmitter();

    // ALWAYS clear listeners first
    this.upButton.removeAllListeners();
    this.downButton.removeAllListeners();
    this.leftButton.removeAllListeners();
    this.rightButton.removeAllListeners();

    // Track pressed state with simple flags
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;

    // Register fresh listeners
    this.upButton.on('pointerdown', () => { 
      this.moveUp = true; 
    });
    this.upButton.on('pointerup', () => { 
      this.moveUp = false; 
    });
    this.upButton.on('pointerout', () => { 
      this.moveUp = false; 
    });

    this.downButton.on('pointerdown', () => { 
      this.moveDown = true; 
    });
    this.downButton.on('pointerup', () => { 
      this.moveDown = false; 
    });
    this.downButton.on('pointerout', () => { 
      this.moveDown = false; 
    });

    this.leftButton.on('pointerdown', () => { 
      this.moveLeft = true; 
    });
    this.leftButton.on('pointerup', () => { 
      this.moveLeft = false; 
    });
    this.leftButton.on('pointerout', () => { 
      this.moveLeft = false; 
    });

    this.rightButton.on('pointerdown', () => { 
      this.moveRight = true; 
    });
    this.rightButton.on('pointerup', () => { 
      this.moveRight = false; 
    });
    this.rightButton.on('pointerout', () => { 
      this.moveRight = false; 
    });

    // Keyboard
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Reset all state flags
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.cutsceneComplete = false;
    this.blockActive = false;
    this.playerSpeed = this.baseSpeed || 160;

    updateReactState({ activeScene: 'ForestScene', isGameOver: false, gameCompleted: false });
    (window as any).lastGameplaySceneKey = 'ForestScene';
    if (window.gameAudio) {
      window.gameAudio.setMusicTheme('forest');
    }
    
    // Playtime tracker start trigger
    this.startTime = this.time.now;
    this.playerOnThorn = false;

    // Create the Canvas 'light-mask' if it doesn't already exist
    if (!this.textures.exists('light-mask')) {
      const canvasTexture = this.textures.createCanvas('light-mask', 512, 512);
      const ctx = canvasTexture.context;
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); // Erases solid black
      grad.addColorStop(0.25, 'rgba(0,0,0,0.95)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0.25)');
      grad.addColorStop(1.0, 'rgba(0,0,0,0)'); // Leaves black untouched
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      canvasTexture.refresh();
    }

    this.lightMaskImage = this.add.image(0, 0, 'light-mask');
    this.lightMaskImage.setVisible(false);
    this.lightMaskImage.setBlendMode(Phaser.BlendModes.ERASE);

    this.darknessOverlay = this.add.renderTexture(0, 0, 1280, 720);
    this.darknessOverlay.setScrollFactor(0);
    this.darknessOverlay.setDepth(2.5); // ABOVE sprite layers, below UI

    this.spearGraphics = this.add.graphics();
    this.shieldGraphics = this.add.graphics();
    this.lanternPool = this.add.graphics();

    this.spearGraphics.disableInteractive();
    if (this.spearGraphics.input) this.spearGraphics.input.enabled = false;
    this.shieldGraphics.disableInteractive();
    if (this.shieldGraphics.input) this.shieldGraphics.input.enabled = false;
    this.lanternPool.disableInteractive();
    if (this.lanternPool.input) this.lanternPool.input.enabled = false;

    this.lanternPool.setDepth(1.9); // ABOVE ground, BELOW player sprite base depth
    this.spearGraphics.setDepth(2.1);
    this.shieldGraphics.setDepth(2.2);

    if (!data || !data.loadFromSave) {
      const { difficulty } = window.gameState;
      // Scaled Timers matching build prompt
      let gameTime = 300; // Warrior: 5 minutes default
      if (difficulty === 'EASY') gameTime = 480; // 8 minutes
      else if (difficulty === 'hard') gameTime = 180; // 3 minutes

      updateReactState({ 
        timer: gameTime, 
        initialTimer: gameTime, 
        health: 100, 
        relicsFound: [false, false, false, false, false], 
        artifactsCollected: [],
        lanternFuel: 100,
        strikeCooldownPct: 0,
        blockCooldownPct: 0,
        bashCooldownPct: 0,
        dashCooldownPct: 0
      });
    }

    // Set world size: 2560x2560 Grid
    this.physics.world.setBounds(0, 0, 2560, 2560);
    this.cameras.main.setBounds(0, 0, 2560, 2560);
    this.cameras.main.setBackgroundColor('#0A0F14');

    // Simple floating spirit forest dust particle emitter (Ambient particle spirits)
    this.add.particles(0, 0, 'part-gold', {
      x: { min: 0, max: 2560 },
      y: { min: 0, max: 2560 },
      quantity: 1,
      frequency: 600,
      lifespan: 4000,
      speedY: { min: -15, max: -5 },
      speedX: { min: -5, max: 5 },
      alpha: { start: 0.3, end: 0.15 },
      tint: 0x00FFA3,
      scale: { start: 0.35, end: 0.15 },
      blendMode: 'ADD'
    });

    // Beautiful dynamic falling leaves simulation (using tints #1A4A2E and #2D7A4F)
    this.add.particles(0, 0, 'part-gold', {
      x: { min: 0, max: 2560 },
      y: -50,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(0, -100, 2560, 50)
      },
      gravityY: 35,
      gravityX: -15,
      speedY: { min: 25, max: 55 },
      speedX: { min: -12, max: 18 },
      scale: { start: 0.35, end: 0.65 },
      alpha: { start: 0.4, end: 0.1 },
      tint: [0x1A4A2E, 0x2D7A4F],
      frequency: 70, // Spread nicely
      lifespan: 9000,
    });

    // 1. Procedural ground tiling (draw background tiles dynamically)
    // Darkened tiles by an additional 30%+ to prevent ground competing with character & props
    const groundGroup = this.add.group();
    for (let tx = 0; tx < 40; tx++) {
      for (let ty = 0; ty < 40; ty++) {
        const rand = Math.random();
        let tileFrame = '0'; // Mossy grass (grassland)
        if (rand > 0.95) tileFrame = '3'; // Ancient stone shrines
        else if (rand > 0.85) tileFrame = '2'; // Bioluminescent magic moss
        else if (rand > 0.68) tileFrame = '1'; // Gnarled mud/root (organic dirt terrain)

        const tile = this.add.image(tx * 64 + 32, ty * 64 + 32, 'forest-tileset', tileFrame);
        if (tileFrame === '0') {
          tile.setTint(0x07110A); // Subdued deeply
        } else if (tileFrame === '1') {
          tile.setTint(0x050E0A); // Subdued deeply
        } else if (tileFrame === '2') {
          tile.setTint(0x0F301F); // Darkened bio moss
        } else if (tileFrame === '3') {
          tile.setTint(0x0F301F); // Darkened shrine tile
        }
        groundGroup.add(tile);
      }
    }

    // Scatter ambient decorative props procedurally with colors #1A4A2E and #2D7A4F
    for (let i = 0; i < 280; i++) {
      const dx = Phaser.Math.Between(50, 2510);
      const dy = Phaser.Math.Between(50, 2510);

      // Avoid player spawn area (initial spawn at x = 150, y = 1280)
      if (Phaser.Math.Distance.Between(dx, dy, 150, 1280) < 220) {
        continue;
      }

      const propType = Phaser.Math.Between(0, 2); // 0: mushroom cluster, 1: root line, 2: leaf shapes
      const color = Phaser.Math.RND.pick([0x1A4A2E, 0x2D7A4F]);
      const alpha = Phaser.Math.FloatBetween(0.5, 0.7);

      const gr = this.add.graphics({ x: dx, y: dy });
      gr.setDepth(1.1); // below player (2) and obstacles (3)

      if (propType === 0) {
        // small dark mushroom clusters
        gr.fillStyle(color, alpha);
        // mushroom 1
        gr.fillRect(-2, -5, 4, 5);
        gr.fillCircle(0, -5, 4);
        // mushroom 2
        gr.fillRect(4, -3, 3, 3);
        gr.fillCircle(5.5, -3, 3);
      } else if (propType === 1) {
        // root line graphics
        gr.lineStyle(2, color, alpha);
        gr.beginPath();
        gr.moveTo(-15, Phaser.Math.Between(-3, 3));
        gr.lineTo(0, Phaser.Math.Between(-6, 6));
        gr.lineTo(15, Phaser.Math.Between(-3, 3));
        gr.strokePath();

        gr.beginPath();
        gr.moveTo(0, 0);
        gr.lineTo(4, 4);
        gr.lineTo(8, Phaser.Math.Between(4, 12));
        gr.strokePath();
      } else {
        // faint leaf shapes
        gr.fillStyle(color, alpha);
        const leavesCount = Phaser.Math.Between(2, 4);
        for (let j = 0; j < leavesCount; j++) {
          const lx = Phaser.Math.Between(-10, 10);
          const ly = Phaser.Math.Between(-10, 10);
          
          // Draw standard diamond leaf path
          gr.beginPath();
          gr.moveTo(lx, ly - 3);
          gr.lineTo(lx + 2.5, ly);
          gr.lineTo(lx, ly + 3);
          gr.lineTo(lx - 2.5, ly);
          gr.closePath();
          gr.fillPath();
        }
      }
    }

    // Initialize idle tracking variables
    this.lastPlayerMoveTime = this.time.now;
    this.lastChimePlayTime = this.time.now;

    // 2. Obstacles Group (Gnarled Ancient trees)
    this.obstacles = this.physics.add.staticGroup();
    // Breed 36 trees randomly (keep away from spawn x=150, y=1280, and relic positions)
    const relicCoords = [
      { x: 400, y: 500 },
      { x: 2200, y: 400 },
      { x: 1280, y: 2100 },
      { x: 2300, y: 2200 },
      { x: 1280, y: 1280 },
    ];

    for (let i = 0; i < 38; i++) {
      let tx = 300 + Math.random() * 2000;
      let ty = 200 + Math.random() * 2100;
      
      // Prevent spawning directly on player or relics
      let tooClose = Phaser.Math.Distance.Between(tx, ty, 150, 1280) < 250;
      relicCoords.forEach(relic => {
        if (Phaser.Math.Distance.Between(tx, ty, relic.x, relic.y) < 180) {
          tooClose = true;
        }
      });

      if (!tooClose) {
        const tree = this.obstacles.create(tx, ty, 'forest-tree');
        tree.setBodySize(50, 50); // smaller collider for walking under canopy
        tree.setTint(0x0B2114); // Recessive dark tree foliage/tint
        tree.refreshBody();
      }
    }

    // 3. Spawning player Jama
    const startX = (data && data.loadFromSave && typeof data.playerX === 'number') ? data.playerX : 150;
    const startY = (data && data.loadFromSave && typeof data.playerY === 'number') ? data.playerY : 1280;
    this.player = this.physics.add.sprite(startX, startY, 'jama');
    this.player.setCollideWorldBounds(true);
    this.player.setBodySize(32, 32);
    this.player.setDepth(2);
    this.player.play('jama-idle');
    this.player.setTint(0x00FFA3);

    // Forces velocity to be 0 and resets physics body state
    if (this.player && this.player.body) {
      this.player.body.reset(startX, startY);
      this.player.setVelocity(0, 0);
      this.player.setAcceleration(0, 0);
      this.player.body.blocked.none = true;
    }

    // Create soft pulsing aura beneath player sprite (approximately 0.6x player display width -> radius 10)
    const aura = this.add.graphics();
    aura.fillStyle(0x00FFA3, 1.0);
    aura.fillCircle(0, 0, 10);
    aura.setDepth(1.9); // Renders below player sprite (depth 2)
    (this as any).playerAura = aura;

    this.tweens.add({
      targets: aura,
      alpha: { from: 0.18, to: 0.08 },
      scaleX: { from: 1.15, to: 0.9 },
      scaleY: { from: 1.15, to: 0.9 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Player collides with trees
    this.physics.add.collider(this.player, this.obstacles);

    // 4. Interactive Relics
    this.relicsGroup = this.physics.add.staticGroup();
    relicCoords.forEach((coord, index) => {
      const relic = this.relicsGroup.create(coord.x, coord.y, `relic-${index + 1}`) as Phaser.Physics.Arcade.Sprite;
      relic.setData('relicIdx', index);
      relic.setData('name', ['Drum of Ancestors', 'Bone Mask of Elders', 'Spear of Sjadu', 'Beaded Crown of Queens', 'Calabash of Spirits'][index]);
      
      // Apply correct tint based on rarity
      const isRare = (index === 3); // Beaded Crown of Queens as rare/special
      relic.setTint(isRare ? 0xD4A017 : 0x9B4DCA);

      // Pulse tween
      this.tweens.add({
        targets: relic,
        alpha: { from: 1.0, to: 0.75 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Floating glowing animation for the relics
      this.tweens.add({
        targets: relic,
        y: coord.y - 10,
        duration: 1500 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Gold swirling particle rings behind relics
    this.goldParticles = this.add.particles(0, 0, 'part-gold', {
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.6, end: 0 },
      speed: 10,
      frequency: 200,
      lifespan: 1000,
      blendMode: 'ADD',
    });

    // 4b. Spawning Interactive Thorny Bushes (Environmental Hazard - Slows & Damages on contact)
    this.thornsGroup = this.physics.add.staticGroup();
    for (let i = 0; i < 15; i++) {
      let tx = 400 + Math.random() * 1900;
      let ty = 300 + Math.random() * 2000;
      
      let tooClose = Phaser.Math.Distance.Between(tx, ty, 150, 1280) < 250;
      relicCoords.forEach(relic => {
        if (Phaser.Math.Distance.Between(tx, ty, relic.x, relic.y) < 200) {
          tooClose = true;
        }
      });

      if (!tooClose) {
        const thorn = this.thornsGroup.create(tx, ty, 'thorn-bush');
        thorn.setBodySize(36, 36);
        thorn.setTint(0x0F2E1E); // Subdued static obstacle shadow
        thorn.refreshBody();
      }
    }

    // Overlap callback between player and thorny bushes hazard
    this.physics.add.overlap(this.player, this.thornsGroup, () => {
      this.playerOnThorn = true;
      if (this.time.now > (this.lastThornDamageTime || 0) + 1200) {
        this.lastThornDamageTime = this.time.now;
        // Minor damage deals 6 on contact
        this.damagePlayer(6);
        this.showFloatingText(this.player.x, this.player.y - 20, 'THORNS! -6HP', 0xff3333);
        if (window.gameAudio) {
          window.gameAudio.playSfx('hurt');
        }
      }
    });

    // 4c. Spawning Sutherlandia Healing Herbs (Gifts of the Forest)
    this.herbsGroup = this.physics.add.staticGroup();
    // Spawn 10 beautiful healing herbs at random places throughout the level
    for (let i = 0; i < 10; i++) {
      let hx = 250 + Math.random() * 2000;
      let hy = 200 + Math.random() * 2100;
      
      let tooClose = Phaser.Math.Distance.Between(hx, hy, 150, 1280) < 250;
      relicCoords.forEach(relic => {
        if (Phaser.Math.Distance.Between(hx, hy, relic.x, relic.y) < 150) {
          tooClose = true;
        }
      });

      if (!tooClose) {
        const herb = this.herbsGroup.create(hx, hy, 'sutherlandia-herb');
        herb.setTint(0x39E07A); // Bright organic glowing herb (props are brightest elements)
        // Let them pulse subtle scale tween
        this.tweens.add({
          targets: herb,
          scale: 1.25,
          duration: 1000 + Math.random() * 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }

    // 4d. Spawning Lush Forest Shrubs top-down (depth overlay so player can navigate through & hide behind)
    this.shrubsGroup = this.add.group();
    for (let i = 0; i < 48; i++) {
      let sx = 200 + Math.random() * 2200;
      let sy = 200 + Math.random() * 2200;

      // Prevent spawning directly on player spawn position
      let tooClose = Phaser.Math.Distance.Between(sx, sy, 150, 1280) < 220;
      relicCoords.forEach(relic => {
        if (Phaser.Math.Distance.Between(sx, sy, relic.x, relic.y) < 130) {
          tooClose = true;
        }
      });

      if (!tooClose) {
        const shrub = this.add.sprite(sx, sy, 'forest-shrub');
        shrub.setTint(0x227845); // Rich mid-ground shrub canopy (brighter than background trees)
        shrub.setScale(1.2 + Math.random() * 0.45);
        shrub.setAngle(Math.random() * 360);
        shrub.setDepth(3); // Renders above the player (set to Depth 2) giving a real walk-under canopy/hide-behind effect!
        shrub.setAlpha(0.92); // Slightly translucent so Jama is subtly visible when underneath!
        this.shrubsGroup.add(shrub);
      }
    }

    // Overlap callback for gathering Sutherlandia healing herbs
    this.physics.add.overlap(this.player, this.herbsGroup, (playerObj, herbObj) => {
      const herb = herbObj as Phaser.Physics.Arcade.Sprite;
      if (herb.active) {
        herb.destroy();
        
        // Heal player
        const healedAmt = 25;
        const nextHp = Math.min(100, window.gameState.health + healedAmt);
        updateReactState({ health: nextHp });
        
        // Effects
        this.showFloatingText(herb.x, herb.y, `+${healedAmt} HP Sutherlandia`, 0x10b981);
        if (window.gameAudio) {
          window.gameAudio.playSfx('collect');
        }
        
        // Green healing splash particles
        const healParticles = this.add.particles(herb.x, herb.y, 'part-gold', {
          scale: { start: 0.6, end: 0 },
          alpha: { start: 1, end: 0 },
          speed: 40,
          lifespan: 600,
          maxParticles: 12,
        });
        this.time.delayedCall(800, () => {
          healParticles.destroy();
        });
      }
    });

    // 5. Enemies Group of 3 distinct types
    this.enemiesGroup = this.physics.add.group();
    this.projectilesGroup = this.physics.add.group();

    let enemySpecs = [
      // Guarding relic zones
      { type: 'crawler', x: 500, y: 450 },
      { type: 'crawler', x: 2100, y: 500 },
      { type: 'caller', x: 1380, y: 2000 },
      { type: 'caller', x: 2150, y: 2150 },
      { type: 'wraith', x: 1200, y: 1350 },
      { type: 'wraith', x: 1400, y: 1200 },
    ];

    // Distribute more random enemies
    for (let i = 0; i < 11; i++) {
      enemySpecs.push({ type: 'wraith', x: 400 + Math.random() * 1800, y: 300 + Math.random() * 1900 });
    }
    for (let i = 0; i < 5; i++) {
      enemySpecs.push({ type: 'crawler', x: 500 + Math.random() * 1600, y: 400 + Math.random() * 1600 });
    }
    for (let i = 0; i < 3; i++) {
      enemySpecs.push({ type: 'caller', x: 600 + Math.random() * 1400, y: 600 + Math.random() * 1400 });
    }

    const { difficulty } = window.gameState;
    const maxAllowedEnemies = difficulty === 'hard' ? 8 : (difficulty === 'Medium' ? 5 : 3);
    const validSpecs = enemySpecs.filter(spec => Phaser.Math.Distance.Between(spec.x, spec.y, 150, 1280) > 350);
    const activeSpecs = validSpecs.slice(0, maxAllowedEnemies);

    activeSpecs.forEach((spec, i) => {
      const enemy = this.enemiesGroup.create(spec.x, spec.y, spec.type) as Phaser.Physics.Arcade.Sprite;
        enemy.setData('type', spec.type);
        enemy.setData('id', i);
        enemy.setData('hp', spec.type === 'caller' ? 30 : (spec.type === 'crawler' ? 40 : 25));
        enemy.setData('state', 'patrol'); // patrol, alert, chase, charge, coolDown
        // Store waypoint triggers
        enemy.setData('patrolX', spec.x);
        enemy.setData('patrolY', spec.y);
        enemy.setData('patrolTimer', 0);
        enemy.setData('shootTimer', 0);
        enemy.setCollideWorldBounds(true);
        enemy.setBodySize(32, 32);
        enemy.setTint(0x8B1A1A); // Enemy base tint
        enemy.setDepth(1.5);

        // Call the unified glow creator
        attachEnemyGlow(this, enemy);
    });

    this.physics.add.collider(this.enemiesGroup, this.obstacles);
    this.physics.add.collider(this.enemiesGroup, this.enemiesGroup);

    // Blood spill emitter for hits
    this.bloodParticles = this.add.particles(0, 0, 'part-blood', {
      scale: { start: 0.6, end: 0 },
      speed: 100,
      lifespan: 500,
      frequency: -1,
      blendMode: 'ADD',
    });

    // Handle projectile impact on player, obstacles, or reflected hit on enemies
    this.physics.add.overlap(this.projectilesGroup, this.enemiesGroup, (projNode, enemyNode) => {
      const proj = projNode as Phaser.Physics.Arcade.Sprite;
      const enemy = enemyNode as Phaser.Physics.Arcade.Sprite;
      
      if (proj.getData('isReflected')) {
        proj.destroy();
        // Deal 1.5x damage back to enemy on parry reflect
        const damageAmount = Math.round(specScalerDamage(25) * 1.5);
        this.hitEnemy(enemy, damageAmount, proj.body ? proj.body.velocity.x * 0.05 : 0, proj.body ? proj.body.velocity.y * 0.05 : 0);
      }
    });

    this.physics.add.collider(this.projectilesGroup, this.obstacles, (proj) => {
      proj.destroy();
    });

    this.physics.add.overlap(this.player, this.projectilesGroup, (pl, projNode) => {
      const proj = projNode as Phaser.Physics.Arcade.Sprite;
      
      // Determine if blocking state is active to trigger reflection
      if (this.isBlocking) {
        const blockDuration = this.time.now - this.blockStartTime;
        if (blockDuration <= 600) {
          // Parry reflect!
          proj.setData('isReflected', true);
          proj.setTint(0xFFD700);
          
          if (proj.body) {
            proj.body.velocity.x *= -1.5;
            proj.body.velocity.y *= -1.5;
          }
          
          if (window.gameAudio) {
            window.gameAudio.playReflectSound();
          }
          
          this.shieldFlashState = 'gold';
          this.time.delayedCall(150, () => {
            if (this.shieldFlashState === 'gold') this.shieldFlashState = null;
          });
          
          // Display floating parry text
          const text = this.add.text(this.player.x, this.player.y - 42, "PARRIED!", {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 3
          });
          text.setOrigin(0.5);
          text.setDepth(3.0);
          this.tweens.add({
            targets: text,
            y: text.y - 25,
            alpha: 0,
            duration: 1200,
            onComplete: () => text.destroy()
          });
        } else {
          // Standard block absorbs 80% damage
          proj.destroy();
          this.damagePlayer(Math.round(specScalerDamage(25) * 0.20));
          
          this.shieldFlashState = 'blue';
          this.time.delayedCall(150, () => {
            if (this.shieldFlashState === 'blue') this.shieldFlashState = null;
          });
        }
      } else {
        proj.destroy();
        this.damagePlayer(specScalerDamage(25));
      }
    });

    // Support start gameplay trigger to pause/freeze during prologue intro overlays
    this.gameplayStarted = false;
    
    (window as any).startForestGameplay = () => {
      if (this.gameplayStarted) return;
      this.gameplayStarted = true;
      this.physics.resume();
      
      this.timerInterval = setInterval(() => {
        if (window.gameState.timer > 0 && !window.gameState.isGameOver && !window.gameState.gameCompleted && !window.gameState.isPaused) {
          const newTimer = window.gameState.timer - 1;
          updateReactState({ timer: newTimer });

          if (newTimer === 0) {
            this.triggerTimeFail();
          }
        }
      }, 1000);
    };

    const isSaveLoaded = (window as any).skipForestIntroOnce || localStorage.getItem('isSaveLoaded') === 'true';
    if (isSaveLoaded) {
      this.gameplayStarted = true;
      localStorage.removeItem('isSaveLoaded');
      (window as any).skipForestIntroOnce = true;
      
      this.timerInterval = setInterval(() => {
        if (window.gameState.timer > 0 && !window.gameState.isGameOver && !window.gameState.gameCompleted && !window.gameState.isPaused) {
          const newTimer = window.gameState.timer - 1;
          updateReactState({ timer: newTimer });

          if (newTimer === 0) {
            this.triggerTimeFail();
          }
        }
      }, 1000);
    } else {
      this.physics.pause();
      this.time.delayedCall(60, () => {
        if (typeof (window as any).showReactForestIntro === 'function') {
          (window as any).showReactForestIntro();
        }
      });
    }

    // Difficulty factor modifiers
    const difficultyScaler = () => {
      const { difficulty } = window.gameState;
      return difficulty === 'hard' ? 1.4 : (difficulty === 'Medium' ? 1.0 : 0.7);
    };

    const specScalerDamage = (base: number) => {
      return Math.round(base * difficultyScaler());
    };

    // React hooks to fire from custom window events (React D-pad clicks)
    (window as any).triggerPhaserAttack = () => {
      if (this.scene.isActive() && this.player && this.player.active) {
        this.triggerSpearAttack();
      }
    };

    (window as any).triggerPhaserDash = () => {
      if (this.scene.isActive() && this.player && this.player.active) {
        this.triggerDash();
      }
    };

    (window as any).triggerPhaserBash = () => {
      if (this.scene.isActive() && this.player && this.player.active) {
        this.triggerShieldBash();
      }
    };

    (window as any).triggerPhaserCollect = () => {
      if (this.scene.isActive() && this.player && this.player.active) {
        this.triggerCollect();
      }
    };

    // --- PROCEDURAL ATMOSPHERIC HORROR INITIALIZATIONS ---

    // EFFECT 3 — Fog creep:
    const fog = this.add.rectangle(1280, 1280, 2560, 2560, 0x050d08);
    fog.setDepth(1.4);
    fog.alpha = 0;
    this.tweens.add({
      targets: fog,
      alpha: 0.18,
      duration: 8000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // EFFECT 1 — Eyes in the darkness:
    this.eyesGroup = this.add.group();
    for (let i = 0; i < 10; i++) {
      const eyes = new EyePair(this);
      this.eyesGroup.add(eyes);
    }

    // EFFECT 2 — Shadow figures at the edge:
    const scheduleShadowFigure = () => {
      this.shadowTimer = this.time.delayedCall(Phaser.Math.Between(15000, 25000), () => {
        this.spawnShadowFigure();
        scheduleShadowFigure();
      });
    };
    scheduleShadowFigure();

    // EFFECT 4 — Distant howl visual response:
    const scheduleHowlShockwave = () => {
      this.howlShockwaveTimer = this.time.delayedCall(Phaser.Math.Between(20000, 40000), () => {
        this.triggerHowlShockwave();
        scheduleHowlShockwave();
      });
    };
    scheduleHowlShockwave();

    // EFFECT 5 — Ground mist wisps:
    this.mistStrips = [];
    const grCount = Phaser.Math.Between(5, 8);
    for (let i = 0; i < grCount; i++) {
      const rect = this.add.rectangle(0, 0, 300, 20, 0x0e2218, 0.25);
      rect.setDepth(1.35);
      const startX = Phaser.Math.Between(0, 2560);
      const startY = Phaser.Math.Between(0, 2560);
      rect.setPosition(startX, startY);
      const speed = Phaser.Math.FloatBetween(8, 15) * (Math.random() < 0.5 ? -1 : 1);
      this.mistStrips.push({ rect, speed });
    }

    // VISUAL — Dead animal remains:
    const numRemains = Phaser.Math.Between(4, 6);
    this.remainsGroup = this.add.group();
    for (let r = 0; r < numRemains; r++) {
      let rx = 0;
      let ry = 0;
      for (let attempts = 0; attempts < 50; attempts++) {
        rx = Phaser.Math.Between(100, 2460);
        ry = Phaser.Math.Between(100, 2460);
        if (Phaser.Math.Distance.Between(rx, ry, 150, 1280) < 300) {
          continue;
        }
        break;
      }

      const remainsGraphics = this.add.graphics({ x: rx, y: ry });
      remainsGraphics.setDepth(1.25);

      // Faint red stain beneath
      remainsGraphics.fillStyle(0x3d0000, 0.15);
      remainsGraphics.fillCircle(0, 0, 20);

      const propType = Phaser.Math.Between(0, 2);

      if (propType === 0) {
        // Dead bird
        const rRotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
        remainsGraphics.setRotation(rRotation);

        remainsGraphics.fillStyle(0x3d2b1f, 0.8);
        remainsGraphics.beginPath();
        remainsGraphics.moveTo(-7.5, 5);
        remainsGraphics.lineTo(7.5, 5);
        remainsGraphics.lineTo(0, -5);
        remainsGraphics.closePath();
        remainsGraphics.fillPath();

        remainsGraphics.lineStyle(1.5, 0x2a1e15, 0.8);
        remainsGraphics.beginPath();
        remainsGraphics.moveTo(-3, 0);
        remainsGraphics.lineTo(-12, -4);
        remainsGraphics.moveTo(3, 0);
        remainsGraphics.lineTo(12, 4);
        remainsGraphics.strokePath();

        remainsGraphics.fillStyle(0x3d2b1f, 0.8);
        remainsGraphics.fillCircle(0, -8, 3);
      } else if (propType === 1) {
        // Dead small animal (rat/mongoose)
        const rotationAngle = Phaser.Math.DegToRad(Phaser.Math.Between(80, 100));
        remainsGraphics.setRotation(rotationAngle);

        remainsGraphics.fillStyle(0x2e2218, 0.8);
        remainsGraphics.fillEllipse(0, 0, 25, 10);

        remainsGraphics.lineStyle(1.5, 0x2a1e15, 0.8);
        remainsGraphics.beginPath();
        remainsGraphics.moveTo(-12.5, 0);
        remainsGraphics.lineTo(-16, -3);
        remainsGraphics.lineTo(-20, -1);
        remainsGraphics.strokePath();

        remainsGraphics.fillStyle(0x2e2218, 0.8);
        remainsGraphics.fillCircle(14, 0, 4);

        remainsGraphics.fillStyle(0x1a0f0a, 0.8);
        remainsGraphics.fillCircle(15, -1, 1.25);
      } else {
        // Scattered bones
        remainsGraphics.lineStyle(1.5, 0x4a4035, 0.6);
        const bonesCount = Phaser.Math.Between(3, 4);
        for (let b = 0; b < bonesCount; b++) {
          const bx = Phaser.Math.Between(-10, 10);
          const by = Phaser.Math.Between(-10, 10);
          const boneLenX = Phaser.Math.Between(5, 12) * (Math.random() < 0.5 ? -1 : 1);
          const boneLenY = Phaser.Math.Between(5, 12) * (Math.random() < 0.5 ? -1 : 1);

          remainsGraphics.beginPath();
          remainsGraphics.moveTo(bx, by);
          remainsGraphics.lineTo(bx + boneLenX, by + boneLenY);
          remainsGraphics.strokePath();

          remainsGraphics.strokeCircle(bx, by, 1.25);
          remainsGraphics.strokeCircle(bx + boneLenX, by + boneLenY, 1.25);
        }
      }
      this.remainsGroup.add(remainsGraphics);
    }

    // Clean shutdown listener
    this.events.on('shutdown', () => {
      clearInterval(this.timerInterval);
      if (this.shadowTimer) {
        this.shadowTimer.destroy();
      }
      if (this.howlShockwaveTimer) {
        this.howlShockwaveTimer.destroy();
      }
    });
  }

  spawnShadowFigure() {
    const cam = this.cameras.main;
    const viewWidth = cam.width;
    const viewHeight = cam.height;
    
    const leftX = cam.scrollX;
    const topY = cam.scrollY;
    
    const edge = Phaser.Math.Between(0, 3); // 0: Top, 1: Bottom, 2: Left, 3: Right
    let sx = 0;
    let sy = 0;
    const margin = 35;

    if (edge === 0) {
      sx = Phaser.Math.Between(leftX + 50, leftX + viewWidth - 50);
      sy = topY + margin;
    } else if (edge === 1) {
      sx = Phaser.Math.Between(leftX + 50, leftX + viewWidth - 50);
      sy = topY + viewHeight - margin;
    } else if (edge === 2) {
      sx = leftX + margin;
      sy = Phaser.Math.Between(topY + 50, topY + viewHeight - 50);
    } else {
      sx = leftX + viewWidth - margin;
      sy = Phaser.Math.Between(topY + 50, topY + viewHeight - 50);
    }

    const gr = this.add.graphics();
    gr.setDepth(1.45);

    const color = 0x1a0a0a;
    gr.fillStyle(color, 1.0);
    gr.lineStyle(2, color, 1.0);

    gr.fillCircle(0, -18, 5);
    gr.beginPath();
    gr.moveTo(0, -13);
    gr.lineTo(0, 2);
    gr.moveTo(-10, -8);
    gr.lineTo(10, -8);
    gr.moveTo(0, 2);
    gr.lineTo(-8, 18);
    gr.moveTo(0, 2);
    gr.lineTo(8, 18);
    gr.strokePath();

    gr.setPosition(sx, sy);
    gr.alpha = 0;

    this.tweens.add({
      targets: gr,
      alpha: 0.4,
      duration: 50,
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          if (gr.active) {
            this.tweens.add({
              targets: gr,
              alpha: 0,
              duration: 600,
              onComplete: () => {
                gr.destroy();
              }
            });
          }
        });
      }
    });
  }

  triggerHowlShockwave() {
    const cam = this.cameras.main;
    const viewWidth = cam.width;
    const viewHeight = cam.height;
    
    const minX = cam.scrollX;
    const maxX = cam.scrollX + viewWidth;
    const minY = cam.scrollY;
    const maxY = cam.scrollY + viewHeight;

    let hx = 0;
    let hy = 0;
    for (let attempts = 0; attempts < 50; attempts++) {
      hx = Phaser.Math.Between(100, 2460);
      hy = Phaser.Math.Between(100, 2460);
      if (hx < minX || hx > maxX || hy < minY || hy > maxY) {
        break;
      }
    }

    const shockwave = this.add.graphics();
    shockwave.setDepth(1.28);
    
    shockwave.lineStyle(3, 0x2D7A4F, 1.0);
    shockwave.strokeCircle(0, 0, 100);
    shockwave.setPosition(hx, hy);
    shockwave.setScale(0);
    shockwave.alpha = 0.3;

    this.tweens.add({
      targets: shockwave,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        shockwave.destroy();
      }
    });
  }

  endCutscene() {
    this.cutsceneActive = false;
    this.cutsceneComplete = true;
    if (this.input) this.input.enabled = true;
    if (this.physics && this.physics.world) this.physics.world.resume();
    if (this.time) this.time.timeScale = 1;
    if (this.player && this.player.active) this.player.setVelocity(0, 0);
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;
  }

  update(time: number, delta: number) {
    if (window.gameState.isGameOver || window.gameState.gameCompleted) return;

    if (window.gameState.isPaused) {
      if (this.physics && this.physics.world && !this.physics.world.isPaused) {
        this.physics.pause();
        this.anims.pauseAll();
        this.tweens.pauseAll();
        if (this.player && this.player.active) {
          this.player.setVelocity(0, 0);
        }
        const enemies = this.enemiesGroup?.getChildren() as Phaser.Physics.Arcade.Sprite[];
        if (enemies) {
          enemies.forEach(e => {
            if (e.active) e.setVelocity(0, 0);
          });
        }
      }
      return;
    } else {
      if (this.physics && this.physics.world && this.physics.world.isPaused && this.gameplayStarted) {
        this.physics.resume();
        this.anims.resumeAll();
        this.tweens.resumeAll();
      }
    }

    if (!this.gameplayStarted) {
      if (this.player && this.player.active) {
        this.player.setVelocity(0, 0);
        this.player.play('jama-idle', true);
        this.player.setRotation(0);
      }
      // If we are paused, clear weapons so they don't drift
      if (this.spearGraphics) this.spearGraphics.clear();
      if (this.shieldGraphics) this.shieldGraphics.clear();
      return;
    }

    // Set blocking state based on gameInput block key hold or D-Pad action hold, but only if not dashing or bashing
    const wasBlocking = this.isBlocking;
    const isBlockHeld = !!(window.gameInput && window.gameInput.block);
    
    if (isBlockHeld && !this.isDashing && !this.isShieldBashing) {
      const now = this.time.now;
      const blockCooldownRemaining = Math.max(0, 3000 - (now - this.lastBlockTime));
      
      if (blockCooldownRemaining <= 0) {
        if (!wasBlocking) {
          this.isBlocking = true;
          this.blockStartTime = now;
        } else if (now - this.blockStartTime > 2500) {
          // Automatic shield block fatigue / reset after 2.5 seconds hold
          this.isBlocking = false;
          this.lastBlockTime = now;
        }
      } else {
        this.isBlocking = false;
      }
    } else {
      if (wasBlocking) {
        this.isBlocking = false;
        this.lastBlockTime = this.time.now;
      }
    }

    // Sync cooldowns back to React State!
    const strikeCooldownPct = Math.max(0, 800 - (time - this.lastStrikeTime)) / 800;
    const blockCooldownPct = Math.max(0, 3000 - (time - this.lastBlockTime)) / 3000;
    const bashCooldownPct = Math.max(0, 4000 - (time - this.lastBashTime)) / 4000;
    const dashCooldownPct = Math.max(0, 2200 - (time - this.lastDashTime)) / 2200;
    
    if (Math.floor(time) % 4 === 0) { // Throttled updates to prevent lag
      updateReactState({ 
        strikeCooldownPct, 
        blockCooldownPct, 
        bashCooldownPct, 
        dashCooldownPct 
      });
    }

    // --- HEARTBEAT RATE & PROXIMITY CALCULATOR ---
    let nearbyThreats = 0;
    this.enemiesGroup.getChildren().forEach((node) => {
      const enemy = node as Phaser.Physics.Arcade.Sprite;
      if (enemy && enemy.active) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        if (d < 400) {
          nearbyThreats++;
        }
      }
    });

    // Forest lantern fuel depletion
    const forestDt = delta / 1000;
    const forestBaseDrain = 0.25;
    const forestThreatDrain = nearbyThreats * 0.5;
    const forestTotalDrainRate = forestBaseDrain + forestThreatDrain;
    let currentForestFuel = window.gameState.lanternFuel !== undefined ? window.gameState.lanternFuel : 100;
    currentForestFuel = Math.max(0, currentForestFuel - forestTotalDrainRate * forestDt);
    window.gameState.lanternFuel = currentForestFuel;

    if (window.gameAudio && typeof window.gameAudio.updateLanternSound === 'function') {
      window.gameAudio.updateLanternSound(currentForestFuel);
    }

    let beatInterval = 1800; // slow/calm rate
    if (nearbyThreats === 1) beatInterval = 1100;
    else if (nearbyThreats === 2) beatInterval = 700;
    else if (nearbyThreats >= 3) beatInterval = 400;

    if (time > this.lastHeartbeatTime + beatInterval) {
      this.lastHeartbeatTime = time;
      
      // Trigger lub-dub sound and visual pulses
      if (window.gameAudio && typeof window.gameAudio.playHeartbeatSound === 'function') {
        window.gameAudio.playHeartbeatSound();
      }
      this.triggerHeartbeatVisual(180, 45);
      
      this.vignetteHeartbeatPulseEndTime = time + 400;
      
      this.time.delayedCall(220, () => {
        if (this.player && this.player.active) {
          if (window.gameAudio && typeof window.gameAudio.playHeartbeatSound === 'function') {
            window.gameAudio.playHeartbeatSound();
          }
          this.triggerHeartbeatVisual(140, 35);
        }
      });
    }

    // Calculate lub-dub contractions for vignette scaling and alpha spiking
    let heartbeatAlphaCorrection = 0;
    let heartbeatScaleCorrection = 0;
    
    if (time < this.lastHeartbeatTime + 180) {
      const progress = (time - this.lastHeartbeatTime) / 180;
      const pulseFactor = Math.sin(progress * Math.PI);
      heartbeatAlphaCorrection = 0.07 * pulseFactor;
      heartbeatScaleCorrection = 15 * pulseFactor;
    } else if (time >= this.lastHeartbeatTime + 220 && time < this.lastHeartbeatTime + 360) {
      const progress = (time - (this.lastHeartbeatTime + 220)) / 140;
      const pulseFactor = Math.sin(progress * Math.PI);
      heartbeatAlphaCorrection = 0.04 * pulseFactor;
      heartbeatScaleCorrection = 8 * pulseFactor;
    }

    // --- LANTERN & VIGNETTE EFFECT RENDER ENGINE ---
    if (this.player && this.player.active) {
      this.darknessOverlay.clear();
      
      const fuel = window.gameState.lanternFuel ?? 100;
      const finalAlpha = fuel <= 0 ? 0.95 : Math.min(0.97, 0.82 + heartbeatAlphaCorrection);
      this.darknessOverlay.fill(0x000000, finalAlpha);
      
      const screenX = this.player.x - this.cameras.main.scrollX;
      const screenY = this.player.y - this.cameras.main.scrollY;
      
      const radiusFactor = (() => {
        if (fuel >= 75) {
          return 0.85 + ((fuel - 75) / 25) * 0.15;
        } else if (fuel >= 50) {
          return 0.65 + ((fuel - 50) / 25) * 0.20;
        } else if (fuel >= 25) {
          return 0.40 + ((fuel - 25) / 25) * 0.25;
        } else if (fuel >= 10) {
          return 0.20 + ((fuel - 10) / 15) * 0.20;
        } else if (fuel > 0) {
          return 0.05 + (fuel / 10) * 0.15;
        } else {
          return 0.01;
        }
      })();

      // Active flicker wobble for below 30% fuel
      let wobbleScale = 0;
      if (fuel < 30 && fuel > 0) {
        if (time > ((this as any).nextFlickerTimeForest || 0)) {
          (this as any).nextFlickerTimeForest = time + Phaser.Math.Between(300, 700);
          (this as any).flickerOffsetForest = Phaser.Math.Between(-15, 15);
        }
        wobbleScale = ((this as any).flickerOffsetForest || 0) / 200;
      }
      
      // Breathing oscillations
      const isThreatened = (nearbyThreats > 0);
      const breathSpeed = isThreatened ? 0.015 : (fuel < 25 ? 0.009 : 0.004);
      const breathAmp = isThreatened ? 0.08 : (fuel < 25 ? 0.12 : 0.04);
      const breathScale = 1.0 + Math.sin(time * breathSpeed) * breathAmp;
      
      // Random flicker trigger (every 2-5 seconds)
      let flickerScaleReduction = 0;
      let flickerAlphaReduction = 0;
      if (time > this.nextFlickerTime) {
        this.nextFlickerTime = time + Phaser.Math.Between(2000, 5000);
        this.flickerEndTime = time + Phaser.Math.Between(150, 300);
        this.isFlickering = true;
      }
      if (time < this.flickerEndTime) {
        flickerScaleReduction = 0.15; // shinks radius slightly
        flickerAlphaReduction = 0.06;
      } else {
        this.isFlickering = false;
      }

      const finalScale = Math.max(0.01, 0.75 * radiusFactor * breathScale * (1.0 - flickerScaleReduction) - (heartbeatScaleCorrection / 256) + wobbleScale);
      this.lightMaskImage.setScale(Math.max(0.1, finalScale));
      this.darknessOverlay.draw(this.lightMaskImage, screenX, screenY);
      
      // Redraw lantern light pool underlying props
      this.lanternPool.clear();
      const innerColor = 0xf5c842;
      const innerAlpha = Math.max(0, 0.12 - flickerAlphaReduction);
      const outerAlpha = Math.max(0, 0.04 - flickerAlphaReduction);
      
      this.lanternPool.fillStyle(innerColor, innerAlpha);
      this.lanternPool.fillCircle(this.player.x, this.player.y, 110 * finalScale);
      
      this.lanternPool.fillStyle(innerColor, outerAlpha);
      this.lanternPool.fillCircle(this.player.x, this.player.y, 200 * finalScale);
    }

    // Call weapon custom graphics draw
    this.drawWeapons();

    // --- HORROR ATMOSPHERIC UPDATE LOOPS ---

    // Eyes retreat checks
    if (this.player && this.player.active && this.eyesGroup) {
      this.eyesGroup.getChildren().forEach((eyesObj) => {
        const eyes = eyesObj as any;
        if (eyes && !eyes.isFadingOut) {
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, eyes.x, eyes.y);
          if (d < 150) {
            eyes.retreat();
          }
        }
      });
    }

    // Mist wisps drift and camera wrapping
    const cam = this.cameras.main;
    const viewWidth = cam.width;
    const leftBound = cam.scrollX - 200;
    const rightBound = cam.scrollX + viewWidth + 200;

    if (this.mistStrips && this.mistStrips.length > 0) {
      const dt = delta / 1000;
      this.mistStrips.forEach((wisp) => {
        const r = wisp.rect;
        r.x += wisp.speed * dt;

        if (wisp.speed > 0 && r.x > rightBound) {
          r.x = leftBound;
          r.y = Phaser.Math.Between(Math.max(0, cam.scrollY), Math.min(2560, cam.scrollY + cam.height));
        } else if (wisp.speed < 0 && r.x < leftBound) {
          r.x = rightBound;
          r.y = Phaser.Math.Between(Math.max(0, cam.scrollY), Math.min(2560, cam.scrollY + cam.height));
        }
      });
    }

    // Periodic player coordinate state tracking for Mini-Map display check (throttled for high frame rates)
    if (time > this.lastPosSyncTime + 120) {
      this.lastPosSyncTime = time;
      if (this.player && this.player.active) {
        updateReactState({ playerX: Math.round(this.player.x), playerY: Math.round(this.player.y) });
      }
    }

    if (this.player && this.player.active && (this as any).playerAura) {
      (this as any).playerAura.setPosition(this.player.x, this.player.y);
    }

    // Forest Blessing: Natural beautiful 2D forest healing tick (+3 HP every 4 seconds) if not in immediate danger
    if (!this.playerOnThorn && window.gameState.health < 100) {
      if (!this.lastRegenTime) this.lastRegenTime = time;
      if (time > this.lastRegenTime + 4000) {
        this.lastRegenTime = time;
        const nextHp = Math.min(100, window.gameState.health + 3);
        updateReactState({ health: nextHp });
        this.showFloatingText(this.player.x, this.player.y - 35, '+3 HP Forest Blessing', 0x10b981);
      }
    } else if (this.playerOnThorn) {
      // standing on thorns halts passive healing tick and pushes timer forward
      this.lastRegenTime = time;
    }

    // Check Crouch state
    const isCrouching = !!(window.gameInput as any).crouch;
    this.playerHiding = false;

    if (isCrouching) {
      this.player.setScale(1.0, 0.65); // squash vertically to crawl
      // Calculate proximity to shrubs
      this.shrubsGroup.getChildren().forEach((shrubNode) => {
        const shrub = shrubNode as Phaser.GameObjects.Sprite;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, shrub.x, shrub.y);
        if (d < 52) {
          this.playerHiding = true;
        }
      });
      
      if (this.playerHiding) {
        this.player.setAlpha(0.35); // highly camouflaged inside bush
        // Emit beautiful natural leaf green/gold particles occasionally
        if (Math.random() < 0.04) {
          this.goldParticles.emitParticleAt(this.player.x + (Math.random() - 0.5) * 16, this.player.y + (Math.random() - 0.5) * 16);
        }
      } else {
        this.player.setAlpha(0.65); // crouched translucent
      }

      // Crouch Healing Tick (one-second intervals matching chosen difficulty tier rate)
      let lastCrouchHeal = this.player.getData('lastCrouchHealTime') || 0;
      if (time > lastCrouchHeal + 1000) {
        this.player.setData('lastCrouchHealTime', time);
        if (window.gameState.health < 100) {
          const { difficulty } = window.gameState;
          const healRate = difficulty === 'hard' ? 1 : (difficulty === 'Medium' ? 3 : 5);
          const nextHp = Math.min(100, window.gameState.health + healRate);
          updateReactState({ health: nextHp });
          this.showFloatingText(this.player.x, this.player.y - 35, `+${healRate} HP Spirit Mend`, 0x10b981);
        }
      }
    } else {
      this.player.setScale(1.0, 1.0);
      this.player.setAlpha(1.0);
    }

    // Sync cutscene/gameplay start state automatically
    this.cutsceneActive = !this.gameplayStarted;
    if (this.gameplayStarted) {
      this.cutsceneComplete = true;
    } else {
      this.cutsceneComplete = false;
    }

    // Gate ALL movement behind cutscene flag
    if (!this.cutsceneComplete || this.cutsceneActive) {
      this.player.setVelocity(0, 0);
      return;
    }

    // Bridge window.gameInput values to the scene's movement flags
    if (window.gameInput) {
      this.moveUp = !!window.gameInput.up;
      this.moveDown = !!window.gameInput.down;
      this.moveLeft = !!window.gameInput.left;
      this.moveRight = !!window.gameInput.right;
    }

    // Read input speed dynamically based on crouching, thorn overlapping, and dashing state
    let baseSpd = this.isDashing ? 420 : (isCrouching ? 75 : 160);
    if (this.playerOnThorn) {
      baseSpd = isCrouching ? 45 : 70;
    }
    this.playerOnThorn = false; // Reset for next frame overlap detection
    this.playerSpeed = baseSpd;

    // Read input
    const speed = this.blockActive 
      ? this.playerSpeed * 0.4 
      : this.playerSpeed;

    let vx = 0;
    let vy = 0;

    if (this.moveUp || 
        this.cursors.up.isDown || 
        this.wasd.up.isDown) vy = -speed;
        
    if (this.moveDown || 
        this.cursors.down.isDown || 
        this.wasd.down.isDown) vy = speed;
        
    if (this.moveLeft || 
        this.cursors.left.isDown || 
        this.wasd.left.isDown) vx = -speed;
        
    if (this.moveRight || 
        this.cursors.right.isDown || 
        this.wasd.right.isDown) vx = speed;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    // Apply velocity inside movement flag check block
    if (!this.cutsceneActive && this.cutsceneComplete) {
      this.player.setVelocity(vx, vy);
    } else {
      this.player.setVelocity(0, 0);
    }

    // Face direction
    if (vx < 0) this.player.setFlipX(true);
    if (vx > 0) this.player.setFlipX(false);

    // Dynamic animations and flipping based on movement
    if (vx !== 0 || vy !== 0) {
      const angle = Math.atan2(vy, vx);
      this.player.setData('facingAngle', angle);

      // Lean slightly into movement
      this.player.setRotation((vx / speed) * 0.12);

      if (!this.isAttacking) {
        this.player.play('jama-run', true);
      }

      this.lastPlayerMoveTime = time;
    } else {
      if (!this.isAttacking) {
        this.player.play('jama-idle', true);
        this.player.setRotation(0);
      }

      // Spirit chimes/whispers when player is idle for more than 5 seconds
      if (time - this.lastPlayerMoveTime > 5000) {
        if (time - this.lastChimePlayTime > 3000) {
          this.lastChimePlayTime = time;
          if (Math.random() < 0.25) {
            if (window.gameAudio && typeof window.gameAudio.playSpiritChime === 'function') {
              window.gameAudio.playSpiritChime();
            }
          }
        }
      }
    }

    // Direct Attack Trigger check
    if (window.gameInput.attack) {
      window.gameInput.attack = false;
      this.triggerSpearAttack();
    }

    // Direct Dash click
    if (window.gameInput.dash) {
      window.gameInput.dash = false;
      this.triggerDash();
    }

    // Direct Collect click
    if (window.gameInput.collect) {
      window.gameInput.collect = false;
      this.triggerCollect();
    }

    // 2. Scan relic overlap to enable collect trigger
    let nearIndex: number | null = null;
    let playerCoord = new Phaser.Math.Vector2(this.player.x, this.player.y);
    
    this.relicsGroup.getChildren().forEach((rNode) => {
      const r = rNode as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(playerCoord.x, playerCoord.y, r.x, r.y);
      if (dist < 80) {
        nearIndex = r.getData('relicIdx');
        // Emit sparkling gold particle
        this.goldParticles.emitParticleAt(r.x, r.y);
      }
    });

    if (nearIndex !== this.relicNearIndex) {
      this.relicNearIndex = nearIndex;
      updateReactState({ relicNearIndex: nearIndex });
    }

    // 3. Process enemy finite state machines (FSM) roams and chase
    const enemies = this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const { difficulty } = window.gameState;
    const speedMult = difficulty === 'hard' ? 1.35 : (difficulty === 'Medium' ? 1.0 : 0.7);

    // Keep map populated with active enemies based on selected difficulty limits
    const currentEnemyCount = enemies.filter(e => e.active).length;
    const maxAllowedEnemies = difficulty === 'hard' ? 8 : (difficulty === 'Medium' ? 5 : 3);
    if (currentEnemyCount < maxAllowedEnemies && Math.random() < 0.015) {
      this.spawnEdgeWraith();
    }

    enemies.forEach((enemy) => {
      // Sync static red under-glow with enemy sprite position
      const glow = enemy.getData('glow') as Phaser.GameObjects.Graphics;
      if (glow && enemy.active) {
        glow.setPosition(enemy.x, enemy.y);
      }

      const type = enemy.getData('type');
      const st = enemy.getData('state');
      const dist = Phaser.Math.Distance.Between(playerCoord.x, playerCoord.y, enemy.x, enemy.y);

      // SOUND 2 — Enemy grunt language
      if (dist < 300) {
        let lastGrunt = enemy.getData('lastGruntTime') || 0;
        let gruntInt = enemy.getData('gruntInterval') || 0;
        if (!gruntInt) {
          gruntInt = Phaser.Math.Between(3000, 5000);
          enemy.setData('gruntInterval', gruntInt);
        }
        if (time > lastGrunt + gruntInt) {
          enemy.setData('lastGruntTime', time);
          enemy.setData('gruntInterval', Phaser.Math.Between(3000, 5000));
          
          let nearbyEnemiesCount = 0;
          enemies.forEach((otherEnemy) => {
            if (otherEnemy && otherEnemy.active) {
              const otherDist = Phaser.Math.Distance.Between(playerCoord.x, playerCoord.y, otherEnemy.x, otherEnemy.y);
              if (otherDist < 300) {
                nearbyEnemiesCount++;
              }
            }
          });
          const gruntingVal = nearbyEnemiesCount > 0 ? Math.min(0.08, 0.20 / nearbyEnemiesCount) : 0.08;

          if (window.gameAudio && typeof window.gameAudio.playEnemyGrunt === 'function') {
            const id = enemy.getData('id') || 0;
            window.gameAudio.playEnemyGrunt(id, gruntingVal);
          }
        }
      }
      
      let baseSpeed = type === 'crawler' ? 120 : (type === 'caller' ? 70 : 80);
      let attackRange = type === 'caller' ? 240 : 45;
      let detectRange = type === 'caller' ? 300 : 180;
      if (this.playerHiding) {
        detectRange = 38; // virtually undetectable in bushes unless on top of player
      }

      if (st === 'patrol') {
        // Slow walk towards patrol center
        const pX = enemy.getData('patrolX');
        const pY = enemy.getData('patrolY');
        const targetDist = Phaser.Math.Distance.Between(enemy.x, enemy.y, pX, pY);

        if (targetDist > 160) {
          // head back
          const angle = Math.atan2(pY - enemy.y, pX - enemy.x);
          enemy.setVelocity(Math.cos(angle) * baseSpeed * 0.5 * speedMult, Math.sin(angle) * baseSpeed * 0.5 * speedMult);
        } else {
          // Wander small random steps
          let timer = enemy.getData('patrolTimer') || 0;
          if (time > timer) {
            const rx = (Math.random() - 0.5) * 80;
            const ry = (Math.random() - 0.5) * 80;
            enemy.setVelocity(rx, ry);
            enemy.setData('patrolTimer', time + 1200 + Math.random() * 1500);
          }
        }

        // Check alert trigger
        if (dist < detectRange) {
          enemy.setData('state', 'alert');
          enemy.setVelocity(0, 0);
          // Play visual flicker
          this.tweens.add({
            targets: enemy,
            scale: 1.25,
            duration: 150,
            yoyo: true,
          });
          if (window.gameAudio) {
            window.gameAudio.playSfx('hurt'); // small scream alert
          }
          this.time.delayedCall(400, () => {
            if (enemy.active) {
              enemy.setData('state', 'chase');
            }
          });
        }
      } else if (st === 'chase') {
        const angle = Math.atan2(playerCoord.y - enemy.y, playerCoord.x - enemy.x);
        enemy.setRotation(angle);

        // Callers keep range!
        if (type === 'caller' && dist < 160) {
          // Back off while casting
          enemy.setVelocity(Math.cos(angle) * -baseSpeed * speedMult, Math.sin(angle) * -baseSpeed * speedMult);
        } else {
          enemy.setVelocity(Math.cos(angle) * baseSpeed * 1.1 * speedMult, Math.sin(angle) * baseSpeed * 1.1 * speedMult);
        }

        // Handle attacks
        if (dist <= attackRange) {
          if (type === 'caller') {
            // Shoot projectile orb (cooldown)
            let sTimer = enemy.getData('shootTimer') || 0;
            if (time > sTimer) {
              this.fireCallerSkull(enemy);
              enemy.setData('shootTimer', time + 2500 - (difficulty === 'hard' ? 1000 : 0));
            }
          } else {
            // Melee damage strike
            enemy.setData('state', 'lunge');
            enemy.setVelocity(Math.cos(angle) * baseSpeed * 2.2, Math.sin(angle) * baseSpeed * 2.2);
            
            // Melee attack lunge timer
            this.time.delayedCall(220, () => {
              if (enemy.active) {
                const freshDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                if (freshDist < 50) {
                  const dmg = type === 'crawler' ? 20 : 12;
                  this.damagePlayer(dmg);
                }
                enemy.setData('state', 'patrol');
              }
            });
          }
        }

        // Drop out of chase if player runs too far away or is crouching in bushes
        if (dist > detectRange * 1.6 || (this.playerHiding && dist > 85)) {
          enemy.setData('state', 'patrol');
        }
      }
    });
  }

  triggerSpearAttack() {
    if (this.isAttacking) return;
    const now = this.time.now;
    if (now - this.lastStrikeTime < 800) return; // Attack cooldown boundary
    this.isAttacking = true;
    this.lastStrikeTime = now;

    if (window.gameAudio) {
      window.gameAudio.playSfx('attack');
    }

    // Forward spear lunge slide tween using analytical facing angle
    const originalRotation = this.player.getData('facingAngle') ?? 0;
    const lungeX = Math.cos(originalRotation) * 40;
    const lungeY = Math.sin(originalRotation) * 40;

    // Play attack spritesheet frame flow
    this.player.play('jama-attack', true);
    
    // Rotate character fully in line with attack angle momentarily
    this.player.setRotation(originalRotation);

    this.tweens.add({
      targets: this.player,
      x: this.player.x + lungeX,
      y: this.player.y + lungeY,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.isAttacking = false;
        if (this.player && this.player.active) {
          this.player.setRotation(0);
        }
      },
    });

    // Check hit radius across coordinates
    const reach = 72;
    const damage = 20;

    this.enemiesGroup.getChildren().forEach((node) => {
      const enemy = node as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < reach) {
        // Confirm hitting within wide forward sector angle
        const angleToEnemy = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        const diff = Phaser.Math.Angle.ShortestBetween(originalRotation, angleToEnemy);

        if (Math.abs(diff) < 1.3) { // ~75 degrees forward field
          this.hitEnemy(enemy, damage, lungeX, lungeY);
        }
      }
    });
  }

  triggerDash() {
    const now = this.time.now;
    this.dashCooldown = 2200; // 2.2s as specified
    if (now - this.lastDashTime < this.dashCooldown) return;
    this.lastDashTime = now;
    this.isDashing = true;

    if (window.gameAudio) {
      window.gameAudio.playSfx('dash');
    }

    // Ghost copy particle blur
    this.tweens.add({
      targets: this.player,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 1,
    });

    // 3 translucent ghost copies at 40ms, 80ms, 120ms
    [40, 80, 120].forEach((delay) => {
      this.time.delayedCall(delay, () => {
        if (this.player && this.player.active) {
          const ghost = this.add.sprite(this.player.x, this.player.y, this.player.texture.key, this.player.frame.name);
          ghost.setFlipX(this.player.flipX);
          ghost.setAlpha(0.35);
          ghost.setDepth(1.85);
          ghost.setRotation(this.player.rotation);
          ghost.setTint(0x00FFA3);
          this.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 250,
            onComplete: () => ghost.destroy()
          });
        }
      });
    });

    this.time.delayedCall(220, () => { // 220ms duration as requested
      this.isDashing = false;
    });

    // Fire dash event to React to draw cooling overlay
    updateReactState({ lastDashTime: now, dashCooldown: this.dashCooldown });
  }

  triggerCollect() {
    if (this.relicNearIndex === null) return;
    const index = this.relicNearIndex;

    // Locate the matching node
    let matchedRelic: Phaser.Physics.Arcade.Sprite | null = null;
    this.relicsGroup.getChildren().forEach((rNode) => {
      const r = rNode as Phaser.Physics.Arcade.Sprite;
      if (r.getData('relicIdx') === index) {
        matchedRelic = r;
      }
    });

    if (matchedRelic) {
      if (window.gameAudio) {
        window.gameAudio.playSfx('collect');
      }

      const rName = (matchedRelic as Phaser.Physics.Arcade.Sprite).getData('name');
      
      // Relic pickup golden splash particles
      for (let i = 0; i < 20; i++) {
        this.goldParticles.emitParticleAt((matchedRelic as Phaser.Physics.Arcade.Sprite).x, (matchedRelic as Phaser.Physics.Arcade.Sprite).y);
      }

      // Hide and destroy physical nodes
      (matchedRelic as Phaser.Physics.Arcade.Sprite).destroy();

      // Update state arrays
      const collected = [...window.gameState.artifactsCollected, rName];
      const found = [...window.gameState.relicsFound];
      found[index] = true;
      updateReactState({ relicsFound: found, artifactsCollected: collected });

      // Track statistical artifacts collected
      if ((window as any).incrementArtifactsCollected) {
        (window as any).incrementArtifactsCollected(1);
      }

      // Clean indicators
      this.relicNearIndex = null;
      updateReactState({ relicNearIndex: null });

      // Level 2 victory check
      if (collected.length === 5) {
        this.triggerLevel2Complete();
      }
    }
  }

  hitEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number, pushX: number, pushY: number) {
    if (window.gameAudio) {
      window.gameAudio.playSfx('hit');
    }

    // Spawn splashes
    this.bloodParticles.emitParticleAt(enemy.x, enemy.y, 10);

    // Minor force push
    enemy.x += pushX * 0.5;
    enemy.y += pushY * 0.5;

    // Subtract HP
    let hp = enemy.getData('hp') - damage;
    enemy.setData('hp', hp);

    this.tweens.add({
      targets: enemy,
      tint: 0xff0000,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        if (enemy.active) {
          enemy.setTint(0x8B1A1A);
        }
      },
    });

    if (hp <= 0) {
      // Destroy enemy node
      if (window.gameAudio) {
        window.gameAudio.playSfx('collapse');
      }

      // Death wisps column
      this.add.particles(enemy.x, enemy.y, 'part-violet', {
        scale: { start: 1.0, end: 0 },
        speedY: -60,
        speedX: { min: -15, max: 15 },
        lifespan: 800,
        maxParticles: 15,
      });

      enemy.destroy();

      // Track stats enemies defeated
      if ((window as any).incrementEnemiesDefeated) {
        (window as any).incrementEnemiesDefeated(1);
      }

      updateReactState({ score: window.gameState.score + 100 });
    }
  }

  damagePlayer(amount: number) {
    if (window.gameState.isGameOver || window.gameState.gameCompleted) return;

    // Dash 150ms invincibility iframe check
    if (this.isDashing && (this.time.now - this.lastDashTime < 150)) {
      return;
    }

    if (window.gameAudio) {
      window.gameAudio.playSfx('hurt');
    }

    // Screen Shake effect
    this.cameras.main.shake(200, 0.015);

    // Direct blood burst particles
    this.bloodParticles.emitParticleAt(this.player.x, this.player.y, 8);

    // Apply flash red to player sprite
    this.tweens.add({
      targets: this.player,
      tint: 0xff0000,
      duration: 150,
      yoyo: true,
      onComplete: () => {
        this.player.clearTint();
      },
    });

    const nextHp = Math.max(0, window.gameState.health - amount);
    updateReactState({ health: nextHp });

    if (nextHp <= 0) {
      this.triggerPlayerDeath();
    }
  }

  fireCallerSkull(caller: Phaser.Physics.Arcade.Sprite) {
    if (!caller.active) return;
    const proj = this.physics.add.sprite(caller.x, caller.y, 'projectile');
    this.projectilesGroup.add(proj);

    const angle = Math.atan2(this.player.y - caller.y, this.player.x - caller.x);
    proj.setVelocity(Math.cos(angle) * 190, Math.sin(angle) * 190);
    
    // Auto terminate stray skulls after 2.5 seconds
    this.time.delayedCall(2500, () => {
      if (proj.active) proj.destroy();
    });
  }

  spawnEdgeWraith() {
    // Spawns a wraith randomly from the borders on Shadow difficulty
    const side = Math.floor(Math.random() * 4);
    let wx = 0;
    let wy = 0;
    if (side === 0) { wx = Math.random() * 2560; wy = 30; } // Top
    else if (side === 1) { wx = Math.random() * 2560; wy = 2530; } // Bottom
    else if (side === 2) { wx = 30; wy = Math.random() * 2560; } // Left
    else { wx = 2530; wy = Math.random() * 2560; } // Right

    // Check player spacing
    if (Phaser.Math.Distance.Between(wx, wy, this.player.x, this.player.y) > 300) {
      const wraith = this.enemiesGroup.create(wx, wy, 'wraith') as Phaser.Physics.Arcade.Sprite;
      wraith.setData('type', 'wraith');
      wraith.setData('hp', 25);
      wraith.setData('state', 'chase'); // aggressively hunt
      wraith.setCollideWorldBounds(true);
      wraith.setBodySize(32, 32);
      wraith.setTint(0x8B1A1A); // base enemy tint
      wraith.setDepth(1.5);

      // Call the unified glow creator
      attachEnemyGlow(this, wraith);
    }
  }

  triggerPlayerDeath() {
    updateReactState({ isGameOver: true });
    this.player.setVelocity(0, 0);
    this.player.setAngle(90); // collapse flat

    this.time.delayedCall(1200, () => {
      this.shutdownForestScene();
      const currentKey = this.scene.key;
      this.scene.stop(currentKey);
      setTimeout(() => {
        this.scene.start('GameOverScene');
      }, 150);
    });
  }

  triggerTimeFail() {
    updateReactState({ isGameOver: true });
    this.shutdownForestScene();
    const currentKey = this.scene.key;
    this.scene.stop(currentKey);
    setTimeout(() => {
      this.scene.start('GameOverScene');
    }, 150);
  }

  triggerLevel2Complete() {
    updateReactState({ gameCompleted: true });
    this.player.setVelocity(0, 0);
    
    // Giant magical circular gold animation under player
    const rings = this.add.graphics();
    rings.setDepth(1);
    this.tweens.addCounter({
      from: 0,
      to: 360,
      duration: 1500,
      onUpdate: (tweenValue) => {
        rings.clear();
        rings.lineStyle(4, 0xffd700, 0.85);
        rings.strokeCircle(this.player.x, this.player.y, 45 + Math.sin(tweenValue.getValue() * 0.1) * 6);
        rings.lineStyle(2, 0xffaa00, 0.5);
        rings.strokeCircle(this.player.x, this.player.y, 65);
      },
    });

    this.cameras.main.shake(1200, 0.012);

    this.time.delayedCall(2000, () => {
      this.shutdownForestScene();
      const currentKey = this.scene.key;
      this.scene.stop(currentKey);
      setTimeout(() => {
        this.scene.start('PassagewayScene');
      }, 150);
    });
  }

  showFloatingText(x: number, y: number, textString: string, color: number) {
    const fText = this.add.text(x, y, textString, {
      fontFamily: 'Courier',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 3,
    });
    fText.setDepth(10);
    this.tweens.add({
      targets: fText,
      y: y - 45,
      alpha: 0,
      duration: 1000,
      onComplete: () => fText.destroy(),
    });
  }

  triggerShieldBash() {
    if (this.isBlocking) return;
    const now = this.time.now;
    if (now - this.lastBashTime < 4000) return;
    this.lastBashTime = now;
    this.isShieldBashing = true;

    if (window.gameAudio) {
      window.gameAudio.playShieldBashSound();
    }

    // Lunge forward 45px over 120ms
    const originalRotation = this.player.getData('facingAngle') ?? 0;
    const lungeX = Math.cos(originalRotation) * 45;
    const lungeY = Math.sin(originalRotation) * 45;

    // React speed / state update
    updateReactState({ lastBashTime: now, bashCooldown: 4000 });

    this.tweens.add({
      targets: this.player,
      x: this.player.x + lungeX,
      y: this.player.y + lungeY,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.isShieldBashing = false;
      }
    });

    // Check hit radius
    const reach = 55;
    const damage = 15;

    this.enemiesGroup.getChildren().forEach((node) => {
      const enemy = node as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < reach) {
        const angleToEnemy = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        const diff = Phaser.Math.Angle.ShortestBetween(originalRotation, angleToEnemy);
        if (Math.abs(diff) < 1.3) {
          // Double knockback (pushX, pushY scaled up)
          this.hitEnemy(enemy, damage, lungeX * 2.0, lungeY * 2.0);
        }
      }
    });
  }

  triggerHeartbeatVisual(duration: number, width: number) {
    if (!this.player || !this.player.active) return;
    
    const ring = this.add.graphics();
    ring.setDepth(1.82); // sits BELOW player but above others
    
    this.tweens.addCounter({
      from: 0,
      to: width,
      duration: duration,
      onUpdate: (tweenValue) => {
        if (!this.player || !this.player.active) {
          ring.destroy();
          return;
        }
        ring.clear();
        const currentRadius = tweenValue.getValue();
        const maxOpacity = 0.55;
        const currentAlpha = Math.max(0, maxOpacity * (1 - (currentRadius / width)));
        
        ring.lineStyle(1.8, 0xff2244, currentAlpha);
        ring.strokeCircle(this.player.x, this.player.y, currentRadius);
      },
      onComplete: () => {
        ring.destroy();
      }
    });
  }

  drawWeapons() {
    if (!this.player || !this.player.active) {
      if (this.spearGraphics) this.spearGraphics.clear();
      if (this.shieldGraphics) this.shieldGraphics.clear();
      return;
    }
    
    if (this.spearGraphics) this.spearGraphics.clear();
    if (this.shieldGraphics) this.shieldGraphics.clear();
    
    const isFlipped = this.player.flipX;
    const directionFactor = isFlipped ? -1 : 1;
    
    const isCrouching = !!(window.gameInput as any).crouch;
    
    if (isCrouching) {
      this.spearGraphics.setDepth(1.85);
      this.shieldGraphics.setDepth(1.86);
      
      this.spearGraphics.setPosition(this.player.x, this.player.y);
      this.spearGraphics.setRotation(0);
      this.spearGraphics.setScale(1, 1);
      
      this.spearGraphics.lineStyle(2.5, 0x8B5E3C, 1.0);
      
      if (directionFactor > 0) {
        this.spearGraphics.lineBetween(-15, 12, 18, 12);
        this.spearGraphics.fillStyle(0xC0C0C0, 1.0);
        this.spearGraphics.fillTriangle(18, 9, 18, 15, 23, 12);
      } else {
        this.spearGraphics.lineBetween(-18, 12, 15, 12);
        this.spearGraphics.fillStyle(0xC0C0C0, 1.0);
        this.spearGraphics.fillTriangle(-18, 9, -18, 15, -23, 12);
      }
      
      const shieldX = -6 * directionFactor;
      const shieldY = 14;
      
      this.shieldGraphics.setPosition(this.player.x + shieldX, this.player.y + shieldY);
      this.shieldGraphics.setRotation(0);
      this.shieldGraphics.setScale(1, 1);
      
      this.shieldGraphics.fillStyle(0x5C3D1E, 1.0);
      this.shieldGraphics.fillEllipse(0, 0, 12, 16);
      this.shieldGraphics.lineStyle(1.5, 0x8B6914, 1.0);
      this.shieldGraphics.strokeEllipse(0, 0, 12, 16);
      this.shieldGraphics.fillStyle(0x8B6914, 1.0);
      this.shieldGraphics.fillCircle(0, 0, 3);
      
    } else {
      const isWalking = (Math.abs(this.player.body.velocity.x) > 10 || Math.abs(this.player.body.velocity.y) > 10);
      const bobY = isWalking ? Math.sin(this.time.now * 0.012) * 2.5 : 0;
      
      if (this.isAttacking) {
        this.spearGraphics.setDepth(2.1);
        this.shieldGraphics.setDepth(1.85);

        this.spearGraphics.setPosition(0, 0); // draw absolutely
        this.spearGraphics.setRotation(0);
        this.spearGraphics.setScale(1, 1);
        
        const facingAngle = this.player.getData('facingAngle') ?? 0;
        const spearX = Math.cos(facingAngle) * 12;
        const spearY = Math.sin(facingAngle) * 12 + bobY;
        
        const startX = this.player.x + spearX - Math.cos(facingAngle) * 12;
        const startY = this.player.y + spearY - Math.sin(facingAngle) * 12;
        const endX = this.player.x + spearX + Math.cos(facingAngle) * 28;
        const endY = this.player.y + spearY + Math.sin(facingAngle) * 28;
        
        this.spearGraphics.lineStyle(3, 0x8B5E3C, 1.0);
        this.spearGraphics.lineBetween(startX, startY, endX, endY);
        
        const tipAngle = facingAngle;
        const tipLength = 6;
        const tX = endX + Math.cos(tipAngle) * tipLength;
        const tY = endY + Math.sin(tipAngle) * tipLength;
        
        const leftAngle = tipAngle + Math.PI * 5/6;
        const rightAngle = tipAngle - Math.PI * 5/6;
        const cornerWidth = 3;
        const lX = endX + Math.cos(leftAngle) * cornerWidth;
        const lY = endY + Math.sin(leftAngle) * cornerWidth;
        const rX = endX + Math.cos(rightAngle) * cornerWidth;
        const rY = endY + Math.sin(rightAngle) * cornerWidth;
        
        this.spearGraphics.fillStyle(0xC0C0C0, 1.0);
        this.spearGraphics.fillTriangle(lX, lY, rX, rY, tX, tY);
        
      } else {
        this.spearGraphics.setDepth(1.85);
        this.shieldGraphics.setDepth(2.1);
        
        const spearAngle = (15 * Math.PI / 180) * directionFactor;
        const handX = 12 * directionFactor;
        const handY = 4 + bobY;
        
        this.spearGraphics.setPosition(this.player.x + handX, this.player.y + handY);
        this.spearGraphics.setRotation(spearAngle);
        this.spearGraphics.setScale(1, 1);
        
        this.spearGraphics.lineStyle(2.5, 0x8B5E3C, 1.0);
        this.spearGraphics.lineBetween(0, -28, 0, 12);
        
        this.spearGraphics.fillStyle(0xC0C0C0, 1.0);
        this.spearGraphics.fillTriangle(-3, -28, 3, -28, 0, -34);
      }
      
      const sHandX = -12 * directionFactor;
      const sHandY = 4 + bobY;
      let shieldScale = 1.0;
      if (this.isBlocking) {
        shieldScale = 1.35;
      }
      
      const shieldTilt = -0.15 * directionFactor;
      
      this.shieldGraphics.setPosition(this.player.x + sHandX, this.player.y + sHandY);
      this.shieldGraphics.setScale(shieldScale, shieldScale);
      this.shieldGraphics.setRotation(shieldTilt);
      
      if (this.isBlocking) {
        this.shieldGraphics.fillStyle(0x4a9eff, 0.35);
        this.shieldGraphics.fillEllipse(0, 0, 20, 26);
      }
      
      this.shieldGraphics.fillStyle(0x5C3D1E, 1.0);
      this.shieldGraphics.fillEllipse(0, 0, 16, 22);
      
      let rimColor = 0x8B6914;
      if (this.shieldFlashState === 'gold') {
        rimColor = 0xFFD700;
      } else if (this.shieldFlashState === 'blue') {
        rimColor = 0x4a9eff;
      }
      
      this.shieldGraphics.lineStyle(2, rimColor, 1.0);
      this.shieldGraphics.strokeEllipse(0, 0, 16, 22);
      
      this.shieldGraphics.fillStyle(rimColor, 1.0);
      this.shieldGraphics.fillCircle(0, 0, 4);
      
      this.shieldGraphics.lineStyle(1.5, 0x3d2000, 0.6);
      this.shieldGraphics.lineBetween(-5, -5, 5, 5);
      this.shieldGraphics.lineBetween(-5, 5, 5, -5);
    }
  }

  shutdownForestScene() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.goldParticles) this.goldParticles.destroy();
    if (this.bloodParticles) this.bloodParticles.destroy();

    // Increment player stats playtime
    if (this.startTime) {
      const elapsedSecs = Math.floor((this.time.now - this.startTime) / 1000);
      if (elapsedSecs > 0 && (window as any).incrementPlaytime) {
        (window as any).incrementPlaytime(elapsedSecs);
      }
      this.startTime = 0;
    }
  }
}

export { PassagewayScene } from './passageway';
export { EscapeScene } from './escape';
export { DawnForestScene } from './dawnforest';

/*
export class OldPassagewayScene_Commented {
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  guardsGroup!: Phaser.Physics.Arcade.Group;
  projectilesGroup!: Phaser.Physics.Arcade.Group;
  spearParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  impactParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  radialParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  obstacles!: Phaser.Physics.Arcade.StaticGroup;
  darknessOverlay!: Phaser.GameObjects.RenderTexture;
  lightMaskImage!: Phaser.GameObjects.Image;
  lanternPool!: Phaser.GameObjects.Graphics;
  
  spearGraphics!: Phaser.GameObjects.Graphics;
  shieldGraphics!: Phaser.GameObjects.Graphics;

  startTime = 0;
  isAttacking = false;
  isDashing = false;
  lastDashTime = 0;
  dashCooldown = 2200;
  
  isBlocking = false;
  blockStartTime = 0;
  lastBlockTime = 0;
  blockCooldown = 3000;
  isShieldBashing = false;
  lastBashTime = 0;
  lastStrikeTime = 0;
  shieldFlashState: 'gold' | 'blue' | null = null;

  // Narrative sequence variables
  gameplayStarted = false;
  narrativeTriggerPoint = 250;
  hasTriggeredNarrative = false;
  dialogueShadowForm!: Phaser.GameObjects.Graphics; // Nkanyamba shadow shadow
  
  // Challenge & Difficulty states
  difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  minionKilledCount = 0;
  totalMinionsToSpawn = 10;
  totalMinionsDefeated = 0;
  maxActiveSpirits = 3; // engagement cap
  
  activeChasingSpirits: Phaser.Physics.Arcade.Sprite[] = [];

  constructor() {
    super('PassagewayScene');
  }

  init(data?: any) {
    this.minionKilledCount = 0;
    this.totalMinionsDefeated = 0;
    this.gameplayStarted = false;
    this.hasTriggeredNarrative = false;
    
    if (data) {
      if (data.health !== undefined) {
        window.gameState.health = data.health;
      } else {
        window.gameState.health = 100;
      }
      if (data.lanternFuel !== undefined) {
        window.gameState.lanternFuel = data.lanternFuel;
      } else {
        window.gameState.lanternFuel = 100;
      }
    } else {
      window.gameState.health = 100;
      window.gameState.lanternFuel = 100;
    }

    const rawDiff = (window.gameState.difficulty || 'Medium').toLowerCase();
    this.difficulty = (rawDiff === 'easy' || rawDiff === 'medium' || rawDiff === 'hard') ? rawDiff : 'medium';

    updateReactState({ activeScene: 'PassagewayScene', isGameOver: false, gameCompleted: false });
  }

  create() {
    updateReactState({ activeScene: 'PassagewayScene', isGameOver: false, gameCompleted: false });
    
    if (window.gameAudio) {
      window.gameAudio.setMusicTheme('boss');
      window.gameAudio.startBossDrone();
    }

    this.startTime = this.time.now;
    
    this.physics.world.setBounds(0, 0, 1800, 400);
    this.cameras.main.setBackgroundColor('#050306');
    this.cameras.main.setBounds(0, 0, 1800, 400);

    const ground = this.add.graphics();
    ground.setDepth(0.01);
    ground.fillStyle(0x0a0507, 1.0);
    ground.fillRect(0, 0, 1800, 400);

    for (let tx = 0; tx < 23; tx++) {
      for (let ty = 0; ty < 5; ty++) {
        if ((tx + ty) % 2 === 0) {
          ground.fillStyle(0x2a111a, 0.7);
          ground.fillRect(tx * 80 + 2, ty * 80 + 2, 76, 76);
        } else {
          ground.fillStyle(0x19080f, 0.5);
          ground.fillRect(tx * 80 + 2, ty * 80 + 2, 76, 76);
        }
      }
    }

    ground.lineStyle(1.5, 0x10050a, 0.8);
    for (let i = 0; i < 40; i++) {
      let cx = Phaser.Math.Between(50, 1750);
      let cy = Phaser.Math.Between(80, 350);
      ground.beginPath();
      ground.moveTo(cx, cy);
      for (let pt = 0; pt < 4; pt++) {
        cx += Phaser.Math.Between(-20, 20);
        cy += Phaser.Math.Between(-15, 15);
        ground.lineTo(cx, cy);
      }
      ground.strokePath();
    }

    ground.fillStyle(0x0f050a, 0.9);
    for (let i = 0; i < 20; i++) {
      let rx = Phaser.Math.Between(100, 1700);
      let ry = Phaser.Math.Between(120, 330);
      ground.fillCircle(rx, ry, Phaser.Math.Between(3, 8));
    }

    const walls = this.add.graphics();
    walls.setDepth(1.2);
    walls.fillStyle(0x0f050a, 1.0);
    walls.fillRect(0, 0, 1800, 80);
    walls.fillRect(0, 360, 1800, 40);

    for (let st = 0; st < 45; st++) {
      let stX = Phaser.Math.Between(10, 1790);
      let stWidth = Phaser.Math.Between(14, 40);
      let stHeight = Phaser.Math.Between(25, 60);
      walls.fillStyle(0x1a0710, 0.95);
      walls.beginPath();
      walls.moveTo(stX - stWidth / 2, 80);
      walls.lineTo(stX + stWidth / 2, 80);
      walls.lineTo(stX, 80 + stHeight);
      walls.closePath();
      walls.fillPath();
    }

    this.obstacles = this.physics.add.staticGroup();
    const topWallBlk = this.obstacles.create(900, 40, 'forest-tree');
    topWallBlk.setVisible(false);
    topWallBlk.setBodySize(1800, 80);
    topWallBlk.refreshBody();

    const bottomWallBlk = this.obstacles.create(900, 380, 'forest-tree');
    bottomWallBlk.setVisible(false);
    bottomWallBlk.setBodySize(1800, 40);
    bottomWallBlk.refreshBody();

    this.add.particles(900, 200, 'part-gold', {
      x: { min: 0, max: 1800 },
      y: { min: 80, max: 360 },
      scale: { start: 0.15, end: 0.5 },
      alpha: { start: 0.6, end: 0 },
      speedY: { min: -15, max: -5 },
      speedX: { min: -5, max: 5 },
      lifespan: 2500,
      frequency: 24,
      blendMode: 'ADD'
    });

    this.darknessOverlay = this.add.renderTexture(0, 0, 1800, 400);
    this.darknessOverlay.setDepth(1.1);
    this.darknessOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Create the Canvas 'light-mask' if it doesn't already exist
    if (!this.textures.exists('light-mask')) {
      const canvasTexture = this.textures.createCanvas('light-mask', 512, 512);
      if (canvasTexture) {
        const ctx = canvasTexture.context;
        const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        canvasTexture.refresh();
      }
    }

    this.lightMaskImage = this.add.image(0, 0, 'light-mask');
    this.lightMaskImage.setVisible(false);

    this.lanternPool = this.add.graphics();
    this.lanternPool.setDepth(0.02);

    this.spearGraphics = this.add.graphics();
    this.spearGraphics.setDepth(2.1);

    this.shieldGraphics = this.add.graphics();
    this.shieldGraphics.setDepth(2.1);

    this.spearParticles = this.add.particles(0, 0, 'part-gold', {
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 300,
      speed: 120,
      blendMode: 'ADD',
      emitting: false,
    });
    this.spearParticles.setDepth(2);

    this.impactParticles = this.add.particles(0, 0, 'part-blood', {
      scale: { start: 0.7, end: 0.15 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 400,
      speed: { min: 40, max: 160 },
      blendMode: 'ADD',
      emitting: false,
    });
    this.impactParticles.setDepth(2);

    this.radialParticles = this.add.particles(0, 0, 'part-blue', {
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 500,
      speed: 150,
      blendMode: 'ADD',
      emitting: false,
    });
    this.radialParticles.setDepth(2);

    this.player = this.physics.add.sprite(100, 200, 'jama-light');
    this.player.setCollideWorldBounds(true);
    this.player.setBodySize(36, 36);
    this.player.setDepth(2);
    this.player.play('jama-light-idle');
    this.player.setTint(0x00FFA3);

    const aura = this.add.graphics();
    aura.fillStyle(0x00FFA3, 1.0);
    aura.fillCircle(0, 0, 11);
    aura.setDepth(1.9);
    (this as any).playerAura = aura;

    this.tweens.add({
      targets: aura,
      alpha: { from: 0.18, to: 0.08 },
      scaleX: { from: 1.15, to: 0.9 },
      scaleY: { from: 1.15, to: 0.9 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.physics.add.collider(this.player, this.obstacles);

    this.guardsGroup = this.physics.add.group();
    this.projectilesGroup = this.physics.add.group();

    this.physics.add.collider(this.guardsGroup, this.obstacles);
    this.physics.add.collider(this.guardsGroup, this.guardsGroup);

    this.physics.add.overlap(this.player, this.projectilesGroup, (pl, pNode) => {
      const proj = pNode as Phaser.Physics.Arcade.Sprite;
      if (!proj || !proj.active) return;
      if (proj.getData('friendly')) return;

      if (this.isBlocking) {
        const elapsed = this.time.now - this.blockStartTime;
        if (elapsed <= 180) {
          this.shieldFlashState = 'gold';
          this.radialParticles.emitParticleAt(proj.x, proj.y, 16);
          this.showFloatingText(this.player.x, this.player.y - 45, 'PARRY REFLECT!', 0xffd700);

          let minD = Infinity;
          let target: Phaser.Physics.Arcade.Sprite | null = null;
          this.guardsGroup.getChildren().forEach((g) => {
            const guard = g as Phaser.Physics.Arcade.Sprite;
            if (guard.active) {
              const d = Phaser.Math.Distance.Between(proj.x, proj.y, guard.x, guard.y);
              if (d < minD) {
                minD = d;
                target = guard;
              }
            }
          });

          if (target) {
            const angle = Math.atan2(target.y - proj.y, target.x - proj.x);
            proj.setVelocity(Math.cos(angle) * 380, Math.sin(angle) * 380);
            proj.setData('friendly', true);
            proj.setData('damageAmount', 40);
            proj.setTint(0xffd700);
            return;
          }
        } else {
          this.shieldFlashState = 'blue';
          this.showFloatingText(this.player.x, this.player.y - 45, 'BLOCKED!', 0x4a9eff);
          proj.destroy();
          this.damagePlayer(Math.round(15 * 0.22));
          return;
        }
      }

      proj.destroy();
      this.damagePlayer(12);
    });

    this.physics.add.overlap(this.projectilesGroup, this.guardsGroup, (projNode, enemyNode) => {
      const proj = projNode as Phaser.Physics.Arcade.Sprite;
      const enemy = enemyNode as Phaser.Physics.Arcade.Sprite;
      if (proj.getData('friendly')) {
        proj.destroy();
        const dmg = proj.getData('damageAmount') || 30;
        this.hitGuard(enemy, dmg, proj.body ? proj.body.velocity.x * 0.05 : 0, proj.body ? proj.body.velocity.y * 0.05 : 0);
      }
    });

    this.time.delayedCall(400, () => {
      this.tweens.add({
        targets: this.player,
        x: 220,
        y: 200,
        duration: 800,
        onUpdate: () => {
          this.player.play('jama-light-run', true);
        },
        onComplete: () => {
          this.player.play('jama-light-idle', true);
          this.triggerNkanyambaEntranceSequence();
        }
      });
    });
  }

  triggerNkanyambaEntranceSequence() {
    this.hasTriggeredNarrative = true;
    this.cameras.main.shake(1200, 0.02);
    this.cameras.main.flash(600, 180, 0, 0);
    
    if (window.gameAudio) {
      window.gameAudio.playSfx('ambient');
    }

    this.dialogueShadowForm = this.add.graphics();
    this.dialogueShadowForm.setDepth(1.5);
    this.dialogueShadowForm.fillStyle(0x0d0005, 0.55);
    this.dialogueShadowForm.fillCircle(480, 190, 45);
    this.dialogueShadowForm.fillStyle(0xff0000, 1.0);
    this.dialogueShadowForm.fillCircle(465, 190, 6);
    this.dialogueShadowForm.fillCircle(495, 190, 6);

    this.time.delayedCall(500, () => {
      this.createSpeechBubble(this.dialogueShadowForm, "You have breached my outer walls, Jama. But you will never reach the Shrine. My spirits shall devour your soul!", 'nkanyamba', () => {
        this.createSpeechBubble(this.player, "Khwezi is near... I can feel her spirit. I will tear through every shadow you throw at me!", 'jama', () => {
          this.tweens.add({
            targets: this.dialogueShadowForm,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 900,
            onComplete: () => {
              this.dialogueShadowForm.destroy();
              this.spawnMinionsWave();
              this.gameplayStarted = true;
            }
          });
        });
      });
    });
  }

  spawnMinionsWave() {
    const xs = [580, 700, 820, 950, 1080, 1200, 1315, 1420, 1530, 1640];
    const ys = [150, 280, 220, 160, 310, 190, 260, 140, 300, 220];
    
    let hpStat = 60;
    if (this.difficulty === 'easy') hpStat = 40;
    else if (this.difficulty === 'hard') hpStat = 80;

    for (let i = 0; i < 10; i++) {
      const gX = xs[i];
      const gY = ys[i];
      
      const guard = this.guardsGroup.create(gX, gY, 'wraith') as Phaser.Physics.Arcade.Sprite;
      guard.setTint(0x3a050d);
      guard.setData('hp', hpStat);
      guard.setData('maxHp', hpStat);
      guard.setCollideWorldBounds(true);
      guard.setDepth(1.5);
      
      attachEnemyGlow(this, guard);
    }

    this.showFloatingText(this.player.x, this.player.y - 45, "THE SHADOWS ENGAGE!", 0xff0044);
  }

  update(time: number, delta: number) {
    if (window.gameState.isGameOver || window.gameState.gameCompleted) return;

    if (!this.gameplayStarted) {
      if (this.player && this.player.active) {
        this.player.setVelocity(0, 0);
      }
      this.drawDarknessVignette(time);
      return;
    }

    if (window.gameState.isPaused) {
      if (this.physics && this.physics.world && !this.physics.world.isPaused) {
        this.physics.pause();
        this.anims.pauseAll();
        this.tweens.pauseAll();
        if (this.player) this.player.setVelocity(0, 0);
        this.guardsGroup.getChildren().forEach(node => {
          (node as any).setVelocity(0, 0);
        });
      }
      return;
    } else {
      if (this.physics && this.physics.world && this.physics.world.isPaused) {
        this.physics.resume();
        this.anims.resumeAll();
        this.tweens.resumeAll();
      }
    }

    const wasBlocking = this.isBlocking;
    const isBlockHeld = !!(window.gameInput && window.gameInput.block);
    
    if (isBlockHeld && !this.isDashing && !this.isShieldBashing) {
      const now = this.time.now;
      const blockCooldownRemaining = Math.max(0, 3000 - (now - this.lastBlockTime));
      
      if (blockCooldownRemaining <= 0) {
        if (!wasBlocking) {
          this.isBlocking = true;
          this.blockStartTime = now;
        } else if (now - this.blockStartTime > 2500) {
          this.isBlocking = false;
          this.lastBlockTime = now;
        }
      } else {
        this.isBlocking = false;
      }
    } else {
      if (wasBlocking) {
        this.isBlocking = false;
        this.lastBlockTime = this.time.now;
      }
    }

    const strikeCooldownPct = Math.max(0, 800 - (time - this.lastStrikeTime)) / 800;
    const blockCooldownPct = Math.max(0, 3000 - (time - this.lastBlockTime)) / 3000;
    const bashCooldownPct = Math.max(0, 4000 - (time - this.lastBashTime)) / 4000;
    const dashCooldownPct = Math.max(0, 2200 - (time - this.lastDashTime)) / 2200;
    
    if (Math.floor(time) % 4 === 0) {
      updateReactState({ 
        strikeCooldownPct, 
        blockCooldownPct, 
        bashCooldownPct, 
        dashCooldownPct
      });
    }

    this.drawWeapons();
    this.handleMovementInputs(time);

    this.activeChasingSpirits = [];
    const playerC = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const guards = this.guardsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    
    guards.sort((a, b) => {
      const dA = Phaser.Math.Distance.Between(playerC.x, playerC.y, a.x, a.y);
      const dB = Phaser.Math.Distance.Between(playerC.x, playerC.y, b.x, b.y);
      return dA - dB;
    });

    let threatActiveMod = false;

    guards.forEach((g) => {
      if (!g.active) return;

      const glow = g.getData('glow') as Phaser.GameObjects.Graphics;
      if (glow) {
        glow.setPosition(g.x, g.y);
      }

      const gDist = Phaser.Math.Distance.Between(playerC.x, playerC.y, g.x, g.y);
      const angle = Math.atan2(playerC.y - g.y, playerC.x - g.x);

      let spd = 115;
      let minionContactDamage = 5;
      if (this.difficulty === 'easy') minionContactDamage = 3;
      else if (this.difficulty === 'hard') minionContactDamage = 7;

      let shouldChase = false;
      if (gDist < 420) {
        if (this.activeChasingSpirits.length < this.maxActiveSpirits) {
          this.activeChasingSpirits.push(g);
          shouldChase = true;
        }
      }

      if (shouldChase) {
        g.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);

        if (gDist < 46) {
          let now = time;
          let lastDmg = g.getData('lastDamageTime') || 0;
          if (now > lastDmg + 900) {
            g.setData('lastDamageTime', now);
            let finalDmg = this.isBlocking ? 1 : minionContactDamage;
            this.damagePlayer(finalDmg);
            this.showFloatingText(this.player.x, this.player.y - 20, this.isBlocking ? "BLOCKED! -1HP" : `SHADOW SPIRIT! -${finalDmg}HP`, 0xff3333);
          }
          g.setVelocity(Math.cos(angle) * -120, Math.sin(angle) * -120);
        }

        let lastShoot = g.getData('lastShootTime') || 0;
        let telegraphEnd = g.getData('telegraphEndTime') || 0;

        if (gDist >= 110 && gDist <= 380) {
          if (time > lastShoot + 4000) {
            g.setData('telegraphEndTime', time + 600);
            g.setData('lastShootTime', time);
            
            this.tweens.add({
              targets: g,
              alpha: 0.35,
              yoyo: true,
              duration: 100,
              repeat: 4
            });
          }
        }

        if (telegraphEnd > 0 && time > telegraphEnd) {
          g.setData('telegraphEndTime', 0);
          if (g.active) {
            const proj = this.physics.add.sprite(g.x, g.y, 'projectile');
            this.projectilesGroup.add(proj);
            const fireAngle = Math.atan2(playerC.y - g.y, playerC.x - g.x);
            const projSpd = 190;
            proj.setVelocity(Math.cos(fireAngle) * projSpd, Math.sin(fireAngle) * projSpd);
          }
        }
      } else {
        g.setVelocity(g.body!.velocity.x * 0.9, g.body!.velocity.y * 0.9);
      }
    });

    this.drawDarknessVignette(time);
  }

  handleMovementInputs(time: number) {
    if (this.isDashing) return;

    let moveX = 0;
    let moveY = 0;

    if (window.gameInput) {
      if (window.gameInput.up) moveY = -1;
      if (window.gameInput.down) moveY = 1;
      if (window.gameInput.left) moveX = -1;
      if (window.gameInput.right) moveX = 1;
    }

    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    let defaultSpd = 160;
    if (this.isBlocking) defaultSpd = 70;

    this.player.setVelocity(moveX * defaultSpd, moveY * defaultSpd);

    if (moveX !== 0 || moveY !== 0) {
      if (moveX < 0) {
        this.player.setFlipX(true);
      } else if (moveX > 0) {
        this.player.setFlipX(false);
      }
      this.player.setRotation(moveX * 0.12);
      this.player.play('jama-light-run', true);
    } else {
      this.player.play('jama-light-idle', true);
      this.player.setRotation(0);
    }

    if ((this as any).playerAura) {
      (this as any).playerAura.setPosition(this.player.x, this.player.y + 12);
    }

    const isStrikePressed = !!(window.gameInput && window.gameInput.attack);
    if (isStrikePressed && time > this.lastStrikeTime + 800) {
      this.triggerSpearStrike(time, moveX, moveY);
    }

    const isBashPressed = !!(window.gameInput && window.gameInput.bash);
    if (isBashPressed && time > this.lastBashTime + 4000) {
      this.triggerShieldBash(time, moveX, moveY);
    }

    const isDashPressed = !!(window.gameInput && window.gameInput.dash);
    if (isDashPressed && time > this.lastDashTime + 2200) {
      this.triggerShieldDash(time, moveX, moveY);
    }
  }

  triggerSpearStrike(time: number, moveX: number, moveY: number) {
    this.lastStrikeTime = time;
    this.isAttacking = true;

    if (window.gameAudio) window.gameAudio.playSfx('swipe');

    let lungeX = moveX;
    let lungeY = moveY;
    if (lungeX === 0 && lungeY === 0) {
      lungeX = this.player.flipX ? -1.0 : 1.0;
    }

    const startX = this.player.x;
    const startY = this.player.y;

    this.tweens.add({
      targets: this.player,
      x: startX + lungeX * 24,
      y: startY + lungeY * 24,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.isAttacking = false;
      }
    });

    const testPointX = startX + lungeX * 85;
    const testPointY = startY + lungeY * 85;

    this.spearParticles.emitParticleAt(testPointX, testPointY, 12);

    this.guardsGroup.getChildren().forEach((node) => {
      const guard = node as Phaser.Physics.Arcade.Sprite;
      if (guard.active) {
        const d = Phaser.Math.Distance.Between(testPointX, testPointY, guard.x, guard.y);
        if (d < 58) {
          const damageValue = 35;
          this.hitGuard(guard, damageValue, lungeX * 12, lungeY * 12);
        }
      }
    });
  }

  triggerShieldBash(time: number, moveX: number, moveY: number) {
    this.lastBashTime = time;
    this.isShieldBashing = true;

    if (window.gameAudio) window.gameAudio.playSfx('swipe');

    let bashX = moveX;
    let bashY = moveY;
    if (bashX === 0 && bashY === 0) {
      bashX = this.player.flipX ? -1.0 : 1.0;
    }

    const originalX = this.player.x;
    const originalY = this.player.y;

    this.tweens.add({
      targets: this.player,
      x: originalX + bashX * 36,
      y: originalY + bashY * 36,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        this.isShieldBashing = false;
      }
    });

    const testX = originalX + bashX * 60;
    const testY = originalY + bashY * 60;

    this.radialParticles.emitParticleAt(testX, testY, 8);

    this.guardsGroup.getChildren().forEach((node) => {
      const guard = node as Phaser.Physics.Arcade.Sprite;
      if (guard.active) {
        const d = Phaser.Math.Distance.Between(testX, testY, guard.x, guard.y);
        if (d < 50) {
          this.hitGuard(guard, 25, bashX * 35, bashY * 35);
          this.showFloatingText(guard.x, guard.y - 20, "DUMB-BASHED!", 0x4a9eff);
        }
      }
    });
  }

  triggerShieldDash(time: number, moveX: number, moveY: number) {
    this.lastDashTime = time;
    this.isDashing = true;

    if (window.gameAudio) window.gameAudio.playSfx('chime');

    let dashX = moveX;
    let dashY = moveY;
    if (dashX === 0 && dashY === 0) {
      dashX = this.player.flipX ? -1.0 : 1.0;
    }

    this.player.setVelocity(dashX * 420, dashY * 420);

    this.time.delayedCall(220, () => {
      this.isDashing = false;
      this.player.setVelocity(0, 0);
    });

    this.time.addEvent({
      delay: 24,
      repeat: 8,
      callback: () => {
        if (!this.isDashing) return;
        this.guardsGroup.getChildren().forEach((node) => {
          const enemy = node as Phaser.Physics.Arcade.Sprite;
          if (enemy.active) {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (d < 48) {
              const damage = 20;
              this.hitGuard(enemy, damage, dashX * 40, dashY * 40);
              this.showFloatingText(enemy.x, enemy.y - 20, "DASH HIT! -20HP", 0xff9900);
            }
          }
        });
      }
    });
  }

  hitGuard(guard: Phaser.Physics.Arcade.Sprite, damage: number, pushX: number, pushY: number) {
    if (window.gameAudio) window.gameAudio.playSfx('hit');

    this.impactParticles.emitParticleAt(guard.x, guard.y, 12);

    guard.x += pushX;
    guard.y += pushY;

    let hp = guard.getData('hp') - damage;
    guard.setData('hp', hp);

    this.tweens.add({
      targets: guard,
      tint: 0xffffff,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        if (guard.active) {
          guard.setTint(0x3a050d);
        }
      }
    });

    if (hp <= 0) {
      guard.disableBody(true, false);
      
      this.totalMinionsDefeated++;

      this.tweens.add({
        targets: guard,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        angle: 180,
        duration: 350,
        onComplete: () => {
          guard.destroy();
          this.checkVictoryCondition();
        }
      });

      if ((window as any).incrementEnemiesDefeated) {
        (window as any).incrementEnemiesDefeated(1);
      }
      updateReactState({ score: window.gameState.score + 150 });
    }
  }

  checkVictoryCondition() {
    if (this.totalMinionsDefeated >= 10) {
      this.gameplayStarted = false;
      this.player.setVelocity(0, 0);
      this.player.play('jama-light-idle', true);

      this.createSpeechBubble(this.player, "The seal of shadows has collapsed... The inner chamber lies just beyond this corridor. Hang on, Khwezi!", 'jama', () => {
        this.cameras.main.fadeOut(1800, 0, 0, 0);
        this.time.delayedCall(1900, () => {
          const currentKey = this.scene.key;
          this.scene.stop(currentKey);
          setTimeout(() => {
            this.scene.start('ShrineScene', {
              health: window.gameState.health,
              lanternFuel: window.gameState.lanternFuel,
              score: window.gameState.score
            });
          }, 150);
        });
      });
    }
  }

  damagePlayer(amount: number) {
    if (window.gameState.isGameOver || window.gameState.gameCompleted) return;

    if (this.isDashing && (this.time.now - this.lastDashTime < 150)) {
      return;
    }

    if (window.gameAudio) window.gameAudio.playSfx('hurt');

    this.cameras.main.shake(200, 0.018);
    this.impactParticles.emitParticleAt(this.player.x, this.player.y, 6);

    this.tweens.add({
      targets: this.player,
      tint: 0xff0000,
      duration: 150,
      yoyo: true,
      onComplete: () => { this.player.clearTint(); this.player.setTint(0x00FFA3); },
    });

    const { difficulty } = window.gameState;
    const finalAmt = Math.round(amount * (difficulty === 'hard' ? 1.35 : (difficulty === 'Medium' ? 1.0 : 0.72)));

    const nextHealth = Math.max(0, window.gameState.health - finalAmt);
    window.gameState.health = nextHealth;
    updateReactState({ health: nextHealth });

    if (nextHealth <= 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.gameplayStarted = false;
    this.player.setVelocity(0, 0);
    this.player.play('jama-light-idle');
    
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.time.delayedCall(1600, () => {
      const currentKey = this.scene.key;
      this.scene.stop(currentKey);
      setTimeout(() => {
        this.scene.start('GameOverScene');
      }, 150);
    });
  }

  drawWeapons() {
    this.spearGraphics.clear();
    this.shieldGraphics.clear();

    if (!this.player || !this.player.active) return;

    const angle = this.isAttacking ? this.time.now * 0.05 : 0;
    const plX = this.player.x;
    const plY = this.player.y;

    this.spearGraphics.lineStyle(2, 0xffd700, 1.0);
    this.spearGraphics.save();
    this.spearGraphics.translateCanvas(plX + 16, plY - 4);
    this.spearGraphics.rotateCanvas(angle);
    this.spearGraphics.lineBetween(-15, 0, 25, 0);
    
    this.spearGraphics.fillStyle(0xffaa00, 1.0);
    this.spearGraphics.beginPath();
    this.spearGraphics.moveTo(25, -4);
    this.spearGraphics.lineTo(34, 0);
    this.spearGraphics.lineTo(25, 4);
    this.spearGraphics.closePath();
    this.spearGraphics.fillPath();
    this.spearGraphics.restore();

    this.shieldGraphics.save();
    this.shieldGraphics.translateCanvas(plX - 16, plY + 4);
    this.shieldGraphics.lineStyle(3, 0x4a9eff, 1.0);
    if (this.shieldFlashState === 'gold') {
      this.shieldGraphics.lineStyle(4, 0xffd700, 1.0);
      this.time.delayedCall(100, () => { this.shieldFlashState = null; });
    } else if (this.shieldFlashState === 'blue') {
      this.shieldGraphics.lineStyle(4, 0x00ffff, 1.0);
      this.time.delayedCall(100, () => { this.shieldFlashState = null; });
    }
    
    this.shieldGraphics.beginPath();
    this.shieldGraphics.arc(0, 0, 10, -Math.PI / 3, Math.PI / 3);
    this.shieldGraphics.strokePath();

    this.shieldGraphics.lineStyle(1.5, 0x3d2000, 0.6);
    this.shieldGraphics.lineBetween(-5, -5, 5, 5);
    this.shieldGraphics.lineBetween(-5, 5, 5, -5);
    this.shieldGraphics.restore();
  }

  drawDarknessVignette(time: number) {
    if (!this.player || !this.player.active) return;

    this.darknessOverlay.clear();
    this.darknessOverlay.fill(0x000000, 0.88);

    const screenX = this.player.x - this.cameras.main.scrollX;
    const screenY = this.player.y - this.cameras.main.scrollY;

    const fuel = window.gameState.lanternFuel ?? 100;
    const fuelFactor = Math.max(0.2, fuel / 100);
    const breathScale = 1.0 + Math.sin(time * 0.005) * 0.05;

    const finalScale = 0.72 * fuelFactor * breathScale;
    this.lightMaskImage.setScale(Math.max(0.1, finalScale));
    this.darknessOverlay.draw(this.lightMaskImage, screenX, screenY);

    this.lanternPool.clear();
    this.lanternPool.fillStyle(0xf5c842, 0.1);
    this.lanternPool.fillCircle(this.player.x, this.player.y, 110 * finalScale);
    this.lanternPool.fillStyle(0xf5c842, 0.04);
    this.lanternPool.fillCircle(this.player.x, this.player.y, 200 * finalScale);
  }

  showFloatingText(x: number, y: number, textString: string, color: number) {
    const fText = this.add.text(x, y, textString, {
      fontFamily: 'Courier',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 3,
    });
    fText.setDepth(3);
    this.tweens.add({
      targets: fText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => fText.destroy()
    });
  }

  createSpeechBubble(sourceObject: any, text: string, speakerName: 'jama' | 'nkanyamba' | 'sister' | 'khwezi', onCompleteCallback?: () => void) {
    if (!sourceObject || !sourceObject.active) return;

    const bubbleHeight = 65;
    const bubbleWidth = 240;
    const bubblePadding = 12;

    const bubbleContainer = this.add.container(sourceObject.x, sourceObject.y - 90);
    bubbleContainer.setDepth(3.0);

    const graphics = this.add.graphics();
    bubbleContainer.add(graphics);

    const isNkanyamba = (speakerName === 'nkanyamba');
    const isSister = (speakerName === 'sister' || speakerName === 'khwezi');
    const bgColor = isNkanyamba ? 0x0d0005 : (isSister ? 0x000508 : 0x000d05);
    const strokeColor = isNkanyamba ? 0xff0000 : (isSister ? 0xaaccff : 0x00ffa3);
    const plateColor = isNkanyamba ? '#ff0000' : (isSister ? '#aaccff' : '#00ffa3');
    const textColor = isNkanyamba ? '#ff4ffc' : (isSister ? '#aaccff' : '#00ffa3');
    const plateText = isNkanyamba ? "N K A N Y A M B A" : (isSister ? "K H W E Z I" : "J A M A");

    graphics.fillStyle(bgColor, 0.95);
    for (let g = 3; g > 0; g--) {
      graphics.lineStyle(g * 3, strokeColor, (isNkanyamba ? 0.08 : (isSister ? 0.09 : 0.07)) / g);
      graphics.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 14);
    }
    graphics.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, 14);

    const nameText = this.add.text(-bubbleWidth / 2 + 15, -bubbleHeight / 2 - 12, plateText, {
      fontFamily: 'Courier',
      fontSize: '9px',
      fontStyle: 'bold',
      color: plateColor,
      backgroundColor: '#000000',
      padding: { x: 5, y: 1 }
    });
    bubbleContainer.add(nameText);

    const contentText = this.add.text(-bubbleWidth / 2 + bubblePadding, -bubbleHeight / 2 + bubblePadding, text, {
      fontFamily: 'Courier',
      fontSize: '11px',
      color: textColor,
      align: 'left',
      wordWrap: { width: bubbleWidth - bubblePadding * 2 }
    });
    bubbleContainer.add(contentText);

    const tip = this.add.text(bubbleWidth / 2 - 20, bubbleHeight / 2 - 14, "▶", {
      fontFamily: 'Courier',
      fontSize: '9px',
      color: plateColor,
    });
    bubbleContainer.add(tip);

    this.tweens.add({
      targets: tip,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    let canProgress = false;
    const cooldownTimer = this.time.delayedCall(250, () => {
      canProgress = true;
    });

    const triggerTap = this.input.keyboard ? this.input.keyboard.on('keydown-SPACE', handleProgress) : null;
    const triggerPointer = this.input!.on('pointerdown', handleProgress);

    function handleProgress() {
      if (!canProgress) return;
      if (triggerTap) {
        triggerTap.removeListener('keydown-SPACE', handleProgress);
      }
      triggerPointer.removeListener('pointerdown', handleProgress);
      cooldownTimer.destroy();
      bubbleContainer.destroy();
      if (onCompleteCallback) onCompleteCallback();
    }

    const followTimer = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (sourceObject && sourceObject.active && bubbleContainer && bubbleContainer.active) {
          bubbleContainer.setPosition(sourceObject.x, sourceObject.y - 90);
        } else {
          followTimer.destroy();
        }
      }
    });
  }
}
*/

// 7. SHRINE SCENE (LEVEL 3 - THE BOSS FIGHT)
export class ShrineScene extends Phaser.Scene {
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  boss!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  khweziSprite!: Phaser.GameObjects.Sprite;
  obstacles!: Phaser.Physics.Arcade.StaticGroup;
  guardsGroup!: Phaser.Physics.Arcade.Group;
  projectilesGroup!: Phaser.Physics.Arcade.Group;
  spearParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  impactParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  radialParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  darknessOverlay!: Phaser.GameObjects.Graphics;
  lightMaskImage!: Phaser.GameObjects.Image;
  lanternPool!: Phaser.GameObjects.Graphics;
  candles: Phaser.GameObjects.Graphics[] = [];
  poolsGroup!: Phaser.Physics.Arcade.StaticGroup;

  // Khwezi and Cage procedural rendering states
  khweziX!: number;
  khweziY!: number;
  khweziGraphics!: Phaser.GameObjects.Graphics;
  cageGraphics!: Phaser.GameObjects.Graphics;
  khweziDoubleSway!: boolean;
  khweziRecoilOffset!: number;
  khweziSwayActive!: boolean;
  khweziHeadDroopAmount!: number;
  khweziAlphaMin!: number;
  khweziAlphaTarget!: number;
  khweziColorValue!: number;
  cageActive!: boolean;
  cageBarsShattered!: boolean;
  cageGlowTint!: number | null;
  cageBars!: any[];
  cageFrame!: any;
  cageChain!: any[];
  cageLock!: any;
  cageFlashCircleBase!: any;
  khweziDistressTriggered!: boolean;

  nkanyambaStaggerX = 0;
  nkanyambaRot = 0;
  nkanyambaYOffset = 0;
  nkanyambaArmAngle = 0;
  nkanyambaStreaksColor = -1;
  nkanyambaLeftEyeAlpha = 1.0;
  nkanyambaRightEyeAlpha = 1.0;
  nkanyambaAlpha = 1.0;
  nkanyambaFlickerGrey = false;
  nkanyambaErraticEye = false;
  playerNearCage = false;
  rescueComplete = false;
  rescueSequenceActive = false;
  escapeSequenceActive = false;
  rumble: any = null;
  playerHistory: {x: number, y: number}[] = [];
  debrisParticles: any[] = [];
  debrisGraphics: Phaser.GameObjects.Graphics | null = null;
  debrisSpawnEvent: Phaser.Time.TimerEvent | null = null;
  collapseRedFlashEvent: Phaser.Time.TimerEvent | null = null;
  collapsePanel: Phaser.GameObjects.Container | null = null;

  upButton: any;
  downButton: any;
  leftButton: any;
  rightButton: any;
  moveUp = false;
  moveDown = false;
  moveLeft = false;
  moveRight = false;
  cutsceneComplete = false;
  cutsceneActive = false;
  blockActive = false;
  playerSpeed = 160;
  baseSpeed = 160;
  cursors!: any;
  wasd!: any;
  herbsGroup!: Phaser.Physics.Arcade.StaticGroup;
  playerInPool = false;
  lastPoolDamageTime = 0;
  lastRegenTime = 0;
  startTime = 0;

  bossHealth = 400;
  maxBossHealth = 400;
  bossPhase = 1; // 1 or 2
  
  difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  loadFromSaveActive = false;
  savedPlayerX?: number;
  savedPlayerY?: number;

  // New boss fight system properties (Part 2)
  lastTauntTime = 0;
  nextTauntCooldown = 30000;
  lastTauntUsed = '';
  bossIsTaunting = false;
  bossTauntEndTime = 0;

  lastDarknessWaveTime = 0;
  isChannelingDarknessWave = false;
  darknessWaveChannelEndTime = 0;
  channelingWarningText: any = null;

  lastRedPulseTime = 0;
  hasSpawnedDarkMist = false;
  darkMistEmitter: any = null;
  darknessOverlayRender!: Phaser.GameObjects.RenderTexture;
  lightMaskImageShrine!: Phaser.GameObjects.Image;
  
  inFinalBlowSequence = false;
  finalStrikeTriggered = false;
  finalStrikeCallback?: () => void;

  
  isAttacking = false;
  isDashing = false;
  lastDashTime = 0;
  dashCooldown = 2200; // 2.2 seconds as requested
  
  lastBossAttackTime = 0;
  bossTelegraphTick = 0;
  telegraphMark!: Phaser.GameObjects.Graphics;

  isBlocking = false;
  blockStartTime = 0;
  lastBlockTime = 0;
  blockCooldown = 3000;
  isShieldBashing = false;
  lastBashTime = 0;
  lastStrikeTime = 0;
  shieldFlashState: 'gold' | 'blue' | null = null;
  spearGraphics!: Phaser.GameObjects.Graphics;
  shieldGraphics!: Phaser.GameObjects.Graphics;
  jamaGoldenOutlineAlpha = 0;
  finalFightActive = false;
  jamaChanged = false;
  jamaWhiteGlowActive = false;
  lastGoldenPulseTime = 0;
  finalFightStartTime = 0;
  spearRaiseProgress = 0;
  jamaOutlineGraphics!: Phaser.GameObjects.Graphics;

  // New state tracking flags for Phase 2, final fight, and defeat
  bossDefeated = false;
  phase2Triggered = false;
  finalFightTriggered = false;
  nkanyambaAIActive = false;
  nkanyambaMode = 'idle';
  darknessWaveCount = 0;
  maxDarknessWaves = 2;
  nkanyambaFinalSpeed = 85;

  // Nkanyamba Specific Logic Properties
  gameplayStarted = false;
  isTransitioningPhase = false;
  isLaughing = false;
  bossAuraColor = 0x0a0005;
  sparkEmitterActive = false;
  lastSparkTick = 0;
  bossTrailHistory: { x: number; y: number }[] = [];
  lastBossFootstepTime = 0;
  lastTrailRecordTime = 0;
  lastHazardPoolSpawnTime = 0;
  hazardTelegraphX = 0;
  hazardTelegraphY = 0;
  hazardTelegraphEnd = 0;
  nkanyambaGraphics!: Phaser.GameObjects.Graphics;

  // New Minion Wave and Combat Safety properties
  nextSpawnSideLeft = true;
  pendingReplacementSpawns = 0;
  lastGuardDamageTime = 0;
  nkanyambaMinionsSpawned = false;
  hadMinionsAlive = false;
  bossPhaseActiveMinionsAlive = false;
  darknessWaveResolveEndTime = 0;
  finalStretchWaveCount = 0;
  hasSaidDieTaunt = false;
  bossIsStaggered = false;
  bossStaggerEndTime = 0;

  constructor() {
    super('ShrineScene');
  }

  init(data?: any) {
    this.gameplayStarted = false;
    this.playerInPool = false;
    this.isAttacking = false;
    this.isDashing = false;
    this.isBlocking = false;
    this.isShieldBashing = false;
    this.bossPhase = 1;
    this.nkanyambaMinionsSpawned = false;
    this.hadMinionsAlive = false;
    this.bossPhaseActiveMinionsAlive = false;

    this.blockActive = false;
    (this as any).dashActive = false;
    (this as any).crouching = false;
    (this as any).strikeCooldown = false;
    (this as any).blockCooldownPct = 0;
    (this as any).bashCooldown = false;
    (this as any).dashCooldown = false;

    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.playerSpeed = this.baseSpeed;

    GlobalCleanup.cleanScene(this);

    this.loadFromSaveActive = false;
    if (data) {
      if (data.loadFromSave) {
        this.loadFromSaveActive = true;
        this.savedPlayerX = data.playerX;
        this.savedPlayerY = data.playerY;
      }
      if (data.health !== undefined) {
        window.gameState.health = data.health;
      }
      if (data.lanternFuel !== undefined) {
        window.gameState.lanternFuel = data.lanternFuel;
      }
      if (data.score !== undefined) {
        window.gameState.score = data.score;
      }
    }
    
    const rawDiff = (window.gameState.difficulty || 'Medium').toLowerCase();
    this.difficulty = (rawDiff === 'easy' || rawDiff === 'medium' || rawDiff === 'hard') ? rawDiff : 'medium';

    updateReactState({ activeScene: 'ShrineScene', isGameOver: false, gameCompleted: false });
    (window as any).lastGameplaySceneKey = 'ShrineScene';
  }

  shutdown() {
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;
    if (this.player && this.player.active) {
      this.player.setVelocity(0, 0);
    }
    if (this.upButton) this.upButton.removeAllListeners();
    if (this.downButton) this.downButton.removeAllListeners();
    if (this.leftButton) this.leftButton.removeAllListeners();
    if (this.rightButton) this.rightButton.removeAllListeners();
    if (this.tweens) this.tweens.killAll();
    if (this.time) this.time.removeAllEvents();
    if (this.input && this.input.keyboard) {
      this.input.keyboard.removeAllKeys(true);
    }

    GlobalCleanup.cleanScene(this);
    this.shutdownShrineScene();
  }

  create() {
    this.events.on('shutdown', this.shutdown, this);
    this.events.on('destroy', this.shutdown, this);

    this.upButton = new Phaser.Events.EventEmitter();
    this.downButton = new Phaser.Events.EventEmitter();
    this.leftButton = new Phaser.Events.EventEmitter();
    this.rightButton = new Phaser.Events.EventEmitter();

    // ALWAYS clear listeners first
    this.upButton.removeAllListeners();
    this.downButton.removeAllListeners();
    this.leftButton.removeAllListeners();
    this.rightButton.removeAllListeners();

    // Track pressed state with simple flags
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;

    // Register fresh listeners
    this.upButton.on('pointerdown', () => { 
      this.moveUp = true; 
    });
    this.upButton.on('pointerup', () => { 
      this.moveUp = false; 
    });
    this.upButton.on('pointerout', () => { 
      this.moveUp = false; 
    });

    this.downButton.on('pointerdown', () => { 
      this.moveDown = true; 
    });
    this.downButton.on('pointerup', () => { 
      this.moveDown = false; 
    });
    this.downButton.on('pointerout', () => { 
      this.moveDown = false; 
    });

    this.leftButton.on('pointerdown', () => { 
      this.moveLeft = true; 
    });
    this.leftButton.on('pointerup', () => { 
      this.moveLeft = false; 
    });
    this.leftButton.on('pointerout', () => { 
      this.moveLeft = false; 
    });

    this.rightButton.on('pointerdown', () => { 
      this.moveRight = true; 
    });
    this.rightButton.on('pointerup', () => { 
      this.moveRight = false; 
    });
    this.rightButton.on('pointerout', () => { 
      this.moveRight = false; 
    });

    // Keyboard
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Reset all state flags
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.cutsceneComplete = false;
    this.blockActive = false;
    this.playerSpeed = this.baseSpeed || 160;

    updateReactState({ activeScene: 'ShrineScene', isGameOver: false, gameCompleted: false });
    (window as any).lastGameplaySceneKey = 'ShrineScene';
    
    // Play substantive subsonic dread drone upon entering level
    if (window.gameAudio) {
      window.gameAudio.setMusicTheme('boss');
      window.gameAudio.startBossDrone();
    }

    // Playtime tracker start trigger
    this.startTime = this.time.now;
    this.playerInPool = false;

    this.bossHealth = 600;
    this.maxBossHealth = 600;
    this.bossPhase = 1;
    this.nkanyambaMinionsSpawned = false;
    this.hadMinionsAlive = false;
    this.bossPhaseActiveMinionsAlive = false;
    this.darknessWaveResolveEndTime = 0;
    this.finalStretchWaveCount = 0;
    this.hasSaidDieTaunt = false;
    this.bossIsStaggered = false;
    this.bossStaggerEndTime = 0;

    this.bossDefeated = false;
    this.phase2Triggered = false;
    this.finalFightTriggered = false;
    this.nkanyambaAIActive = false;
    this.nkanyambaMode = 'idle';
    this.darknessWaveCount = 0;
    this.maxDarknessWaves = 2;

    updateReactState({ bossHealth: 600, maxBossHealth: 600, bossPhase: 1, health: 100 });

    // Canvas size limits are 1280x720px exactly (Single static arena!)
    this.physics.world.setBounds(0, 0, 1280, 720);
    this.cameras.main.setBackgroundColor('#0d0a0a');

    // 1. PROCEDURAL CAVE RUINS GROUND GENERATOR
    const caveGround = this.add.graphics();
    caveGround.setDepth(0.01);

    // Base dark stone ground color
    caveGround.fillStyle(0x0d0a0a, 1.0);
    caveGround.fillRect(0, 0, 1280, 720);

    // Stone tile grid with every 3rd tile lighter #1c1612
    for (let tx = 0; tx < 16; tx++) {
      for (let ty = 0; ty < 9; ty++) {
        if ((tx + ty) % 3 === 0) {
          caveGround.fillStyle(0x1c1612, 1.0);
          caveGround.fillRect(tx * 80 + 2, ty * 80 + 2, 76, 76);
        }

        // Moss creeping into cracks: thin irregular lines #1a3a1a alpha 0.5 at tile edges
        caveGround.lineStyle(1.5, 0x1a3a1a, 0.5);
        caveGround.beginPath();
        let bx = tx * 80;
        let by = ty * 80;
        caveGround.moveTo(bx + Phaser.Math.Between(-3, 3), by + Phaser.Math.Between(-3, 3));
        caveGround.lineTo(bx + 80 + Phaser.Math.Between(-3, 3), by + Phaser.Math.Between(-3, 3));
        caveGround.lineTo(bx + 80 + Phaser.Math.Between(-3, 3), by + 80 + Phaser.Math.Between(-3, 3));
        caveGround.lineTo(bx + Phaser.Math.Between(-3, 3), by + 80 + Phaser.Math.Between(-3, 3));
        caveGround.closePath();
        caveGround.strokePath();
      }
    }

    // Cracked stone texture: irregular polygon cracks drawn using lines color #1a1410
    caveGround.lineStyle(2, 0x1a1410, 1.0);
    for (let i = 0; i < 30; i++) {
      let cx = Phaser.Math.Between(60, 1220);
      let cy = Phaser.Math.Between(130, 685);
      caveGround.beginPath();
      caveGround.moveTo(cx, cy);
      for (let pt = 0; pt < 4; pt++) {
        cx += Phaser.Math.Between(-24, 24);
        cy += Phaser.Math.Between(-20, 20);
        caveGround.lineTo(cx, cy);
      }
      caveGround.strokePath();
    }

    // Scattered rubble: small irregular polygon clusters color #2a2018 alpha 0.8
    caveGround.fillStyle(0x2a2018, 0.8);
    for (let r = 0; r < 15; r++) {
      let rx = Phaser.Math.Between(80, 1200);
      let ry = Phaser.Math.Between(150, 650);
      let size = Phaser.Math.Between(5, 11);
      caveGround.beginPath();
      caveGround.moveTo(rx + Phaser.Math.Between(-size, size), ry + Phaser.Math.Between(-size, size));
      for (let pIdx = 0; pIdx < 5; pIdx++) {
        let ang = (pIdx / 5) * Math.PI * 2;
        let rSize = size + Phaser.Math.Between(-3, 3);
        caveGround.lineTo(rx + Math.cos(ang) * rSize, ry + Math.sin(ang) * rSize);
      }
      caveGround.closePath();
      caveGround.fillPath();
    }

    // 2. SCATTERED BONES & SKELETONS DECORATIONS
    const skeletonsGraphics = this.add.graphics();
    skeletonsGraphics.setDepth(0.08);

    const drawSkeletonAt = (sx: number, sy: number) => {
      skeletonsGraphics.fillStyle(0xdedde2, 0.85);
      skeletonsGraphics.lineStyle(2.0, 0xdedde2, 0.85);

      // Skull: circle 4px radius
      skeletonsGraphics.fillCircle(sx, sy, 4);

      // Ribcage: 3 parallel curved lines
      for (let r = 0; r < 3; r++) {
        let ry = sy + 6 + r * 4;
        skeletonsGraphics.lineBetween(sx - 5, ry, sx, ry + 2);
        skeletonsGraphics.lineBetween(sx, ry + 2, sx + 5, ry);
      }

      // Limbs: disjointed lines
      skeletonsGraphics.lineBetween(sx - 3, sy + 18, sx - 9, sy + 25);
      skeletonsGraphics.lineBetween(sx + 3, sy + 18, sx + 8, sy + 23);
      skeletonsGraphics.lineBetween(sx - 4, sy + 10, sx - 11, sy + 7);

      // Disjointed bone fragment scattered nearby
      skeletonsGraphics.lineBetween(sx + 15, sy + 6, sx + 22, sy + 11);
    };

    const skeletonPlacements = [
      { x: 180, y: 190 },
      { x: 380, y: 460 },
      { x: 190, y: 620 },
      { x: 1080, y: 190 },
      { x: 920, y: 520 },
      { x: 1110, y: 390 },
      { x: 500, y: 280 }
    ];
    skeletonPlacements.forEach(coord => drawSkeletonAt(coord.x, coord.y));

    // 2b. Wall and top cave boundary rendering
    const caveWalls = this.add.graphics();
    caveWalls.setDepth(1.2); // sits above character layer for realism with stalactites!

    // Rough cave wall: color #0a0805
    caveWalls.fillStyle(0x0a0805, 1.0);
    caveWalls.fillRect(0, 0, 1280, 110);

    // Stalactite suggestion at top boundary: downward pointing triangles of varying sizes color #1a1410 alpha 0.9
    for (let st = 0; st < 32; st++) {
      let stX = Phaser.Math.Between(15, 1265);
      let stWidth = Phaser.Math.Between(16, 48);
      let stHeight = Phaser.Math.Between(35, 76);
      caveWalls.fillStyle(0x1a1410, 0.9);
      caveWalls.beginPath();
      caveWalls.moveTo(stX - stWidth / 2, 110);
      caveWalls.lineTo(stX + stWidth / 2, 110);
      caveWalls.lineTo(stX, 110 + stHeight);
      caveWalls.closePath();
      caveWalls.fillPath();
    }

    // Ancient carved markings on walls scratched in faint white #ffffff alpha 0.15
    caveWalls.lineStyle(1.5, 0xffffff, 0.15);
    // Left warrior mark
    caveWalls.beginPath();
    caveWalls.arc(200, 50, 6, 0, Math.PI * 2);
    caveWalls.strokePath();
    caveWalls.lineBetween(200, 56, 200, 75);
    caveWalls.lineBetween(200, 62, 185, 54);
    caveWalls.lineBetween(200, 62, 215, 54);
    caveWalls.lineBetween(200, 75, 190, 92);
    caveWalls.lineBetween(200, 75, 210, 92);

    // Right warrior mark
    caveWalls.beginPath();
    caveWalls.arc(1080, 50, 6, 0, Math.PI * 2);
    caveWalls.strokePath();
    caveWalls.lineBetween(1080, 56, 1080, 75);
    caveWalls.lineBetween(1080, 62, 1065, 54);
    caveWalls.lineBetween(1080, 62, 1095, 54);
    caveWalls.lineBetween(1080, 75, 1070, 92);
    caveWalls.lineBetween(1080, 75, 1090, 92);

    // Ancient circular spiral mark
    caveWalls.beginPath();
    for (let theta = 0; theta < Math.PI * 4; theta += 0.12) {
      let rSp = theta * 1.9;
      let sx = 640 + Math.cos(theta) * rSp;
      let sy = 40 + Math.sin(theta) * rSp;
      if (theta === 0) caveWalls.moveTo(sx, sy);
      else caveWalls.lineTo(sx, sy);
    }
    caveWalls.strokePath();

    // Solid wall colliders
    this.obstacles = this.physics.add.staticGroup();
    const wallWall = this.obstacles.create(640, 55, 'forest-tree'); // hidden blocker
    wallWall.setVisible(false);
    wallWall.setBodySize(1280, 110);
    wallWall.refreshBody();

    // 3. Spawning Khwezi (Centered inside cage in the top right area)
    this.add.rectangle(640, 105, 140, 30, 0x111115); // stone block remains as altar ruin
    this.khweziX = 1050;
    this.khweziY = 180;
    
    // We create an invisible sprite at (1050, 180) to act as a placeholder for dialogue/cameras
    this.khweziSprite = this.add.sprite(this.khweziX, this.khweziY, 'khwezi').setScale(1.25);
    this.khweziSprite.setVisible(false);

    // Initialize procedural rendering graphics containers
    this.khweziGraphics = this.add.graphics();
    this.khweziGraphics.setDepth(2.5); // sit above shadows, below main UI overlays
    
    this.cageGraphics = this.add.graphics();
    this.cageGraphics.setDepth(2.6); // above Khwezi

    this.khweziDoubleSway = false;
    this.khweziRecoilOffset = 0;
    this.khweziSwayActive = true;
    this.khweziHeadDroopAmount = 4;
    this.khweziAlphaMin = 0.75;
    this.khweziAlphaTarget = 1.0;
    this.khweziColorValue = 0xaaccff; 
    this.khweziDistressTriggered = false;
    
    this.cageActive = true;
    this.cageBarsShattered = false;
    this.cageGlowTint = null;
    
    this.cageBars = [];
    for (let i = 0; i < 6; i++) {
      const bx = 1005 + i * 18;
      this.cageBars.push({
        origX: bx,
        origY: 180,
        x: bx,
        y: 180,
        rotation: 0,
        alpha: 1.0
      });
    }
    
    this.cageFrame = {
      top: { origX: 1050, origY: 135, x: 1050, y: 135, rotation: 0, alpha: 1.0 },
      bottom: { origX: 1050, origY: 225, x: 1050, y: 225, rotation: 0, alpha: 1.0 },
      left: { origX: 1005, origY: 180, x: 1005, y: 180, rotation: 0, alpha: 1.0 },
      right: { origX: 1095, origY: 180, x: 1095, y: 180, rotation: 0, alpha: 1.0 },
      corners: [
        { origX: 1005, origY: 135, x: 1005, y: 135, alpha: 1.0 },
        { origX: 1095, origY: 135, x: 1095, y: 135, alpha: 1.0 },
        { origX: 1005, origY: 225, x: 1005, y: 225, alpha: 1.0 },
        { origX: 1095, origY: 225, x: 1095, y: 225, alpha: 1.0 }
      ]
    };
    
    this.cageChain = [];
    for (let i = 0; i < 8; i++) {
      const ratio = i / 7;
      const lx = 1095 + (1160 - 1095) * ratio;
      const ly = 135 + (90 - 135) * ratio;
      this.cageChain.push({
        origX: lx,
        origY: ly,
        x: lx,
        y: ly,
        rotation: (i % 2 === 0) ? 0 : Math.PI / 2,
        alpha: 1.0
      });
    }
    
    this.cageLock = {
      origX: 1050,
      origY: 225,
      x: 1050,
      y: 225,
      alpha: 1.0
    };
    
    this.cageFlashCircleBase = {
      x: 1050,
      y: 180,
      radius: 0,
      alpha: 0
    };

    // Shimmering purple altar smoke rings
    this.add.particles(640, 110, 'part-violet', {
      scale: { start: 0.5, end: 1.2 },
      alpha: { start: 0.5, end: 0 },
      speedY: -25,
      speedX: { min: -10, max: 10 },
      lifespan: 1500,
      frequency: 250,
      blendMode: 'ADD',
    });

    // 4. Spawning Upgraded Spear Player
    const startX = (this.loadFromSaveActive && typeof this.savedPlayerX === 'number') ? this.savedPlayerX : 640;
    const startY = (this.loadFromSaveActive && typeof this.savedPlayerY === 'number') ? this.savedPlayerY : 580;
    this.player = this.physics.add.sprite(startX, startY, 'jama-light');
    this.player.setCollideWorldBounds(true);
    this.player.setBodySize(36, 36);
    this.player.setDepth(2);
    this.player.play('jama-light-idle');
    this.player.setTint(0x00FFA3);

    // Forces velocity to be 0 and resets physics body state
    if (this.player && this.player.body) {
      this.player.body.reset(startX, startY);
      this.player.setVelocity(0, 0);
      this.player.setAcceleration(0, 0);
      this.player.body.blocked.none = true;
    }

    // Create soft pulsing aura beneath player sprite in ShrineScene (radius 11 is approx 0.6x 36 width)
    const aura = this.add.graphics();
    aura.fillStyle(0x00FFA3, 1.0);
    aura.fillCircle(0, 0, 11);
    aura.setDepth(1.9); // Renders below player sprite (depth 2)
    (this as any).playerAura = aura;

    this.tweens.add({
      targets: aura,
      alpha: { from: 0.18, to: 0.08 },
      scaleX: { from: 1.15, to: 0.9 },
      scaleY: { from: 1.15, to: 0.9 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.physics.add.collider(this.player, this.obstacles);

    // Light spear magical electrical sparkle trail
    this.spearParticles = this.add.particles(0, 0, 'part-gold', {
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.7, end: 0 },
      speed: 25,
      frequency: 80,
      lifespan: 600,
      blendMode: 'ADD',
    });
    this.spearParticles.startFollow(this.player);

    // 5. Spawning Boss: Nkanyamba representor in code
    // He is significantly larger than regular enemies (scaled frame bounds and drawn meticulously)
    this.boss = this.physics.add.sprite(640, 330, 'boss') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.boss.setCollideWorldBounds(true);
    this.boss.setBodySize(80, 80);
    this.boss.setDepth(3);
    this.boss.setAlpha(0); // Invisible sprite texture, we draw him using custom Phaser Graphics!

    // Attach custom Nkanyamba rendering graphics object
    this.nkanyambaGraphics = this.add.graphics();
    this.nkanyambaGraphics.setDepth(3.1); // sits above background characters

    // 6. Spawn Elite guards
    this.guardsGroup = this.physics.add.group();
    this.projectilesGroup = this.physics.add.group();

    this.spawnGuard(300, 300);
    this.spawnGuard(980, 300);

    this.physics.add.collider(this.guardsGroup, this.obstacles);
    this.physics.add.collider(this.guardsGroup, this.guardsGroup);

    // Splatters groups
    this.impactParticles = this.add.particles(0, 0, 'part-blood', {
      scale: { start: 0.8, end: 0 },
      speed: 120,
      lifespan: 400,
      frequency: -1,
    });

    this.radialParticles = this.add.particles(0, 0, 'part-gold', {
      scale: { start: 1.2, end: 0 },
      speed: 160,
      lifespan: 600,
      frequency: -1,
      blendMode: 'ADD',
    });

    // Spiky shadow warning circle indicator
    this.telegraphMark = this.add.graphics();
    this.telegraphMark.setDepth(1);

    this.physics.add.overlap(this.player, this.projectilesGroup, (pl, pNode) => {
      const proj = pNode as Phaser.Physics.Arcade.Sprite;
      if (!proj || !proj.active) return;

      if (proj.getData('friendly')) return;

      if (this.isBlocking) {
        const elapsed = this.time.now - this.blockStartTime;
        if (elapsed <= 180) { // Parry-reflect
          this.shieldFlashState = 'gold';
          this.radialParticles.emitParticleAt(proj.x, proj.y, 16);
          this.showFloatingText(this.player.x, this.player.y - 45, 'PARRY REFLECT!', 0xffd700);

          let minD = Infinity;
          let target: Phaser.Physics.Arcade.Sprite | null = null;
          
          this.guardsGroup.getChildren().forEach((g) => {
            const guard = g as Phaser.Physics.Arcade.Sprite;
            if (guard.active) {
              const d = Phaser.Math.Distance.Between(proj.x, proj.y, guard.x, guard.y);
              if (d < minD) {
                minD = d;
                target = guard;
              }
            }
          });
          
          if (this.boss && this.boss.active) {
            const d = Phaser.Math.Distance.Between(proj.x, proj.y, this.boss.x, this.boss.y);
            if (d < minD) {
              minD = d;
              target = this.boss as any;
            }
          }

          if (target) {
            const angle = Math.atan2(target.y - proj.y, target.x - proj.x);
            proj.setVelocity(Math.cos(angle) * 380, Math.sin(angle) * 380);
            
            proj.setData('friendly', true);
            proj.setData('damageAmount', 50); // High-damage reflect
            proj.setTint(0xffd700);
            return;
          }
        } else { // Standard block
          this.shieldFlashState = 'blue';
          let baseMinionDmg = 12;
          if (this.difficulty === 'easy') baseMinionDmg = 8;
          else if (this.difficulty === 'hard') baseMinionDmg = 18;
          this.showFloatingText(this.player.x, this.player.y - 45, 'BLOCKED!', 0x4a9eff);
          proj.destroy();
          let finalDmg = Math.max(1, Math.round(baseMinionDmg * 0.12));
          if (this.bossPhase === 2 && this.bossPhaseActiveMinionsAlive) {
            finalDmg = Math.max(1, Math.round(finalDmg * 0.25));
          }
          this.damagePlayer(finalDmg); // 88% reduction
          return;
        }
      }

      proj.destroy();
      let baseMinionDmg = 12;
      if (this.difficulty === 'easy') baseMinionDmg = 8;
      else if (this.difficulty === 'hard') baseMinionDmg = 18;
      let finalDmg = baseMinionDmg;
      if (this.bossPhase === 2 && this.bossPhaseActiveMinionsAlive) {
        finalDmg = Math.max(1, Math.round(baseMinionDmg * 0.25));
      }
      this.damagePlayer(finalDmg); // Shadow projectile strike (difficulty scaled)
    });

    // Handle friendly reflected projectiles hitting guards
    this.physics.add.overlap(this.projectilesGroup, this.guardsGroup, (projNode, enemyNode) => {
      const proj = projNode as Phaser.Physics.Arcade.Sprite;
      const enemy = enemyNode as Phaser.Physics.Arcade.Sprite;
      if (proj.getData('friendly')) {
        proj.destroy();
        const dmg = proj.getData('damageAmount') || 30;
        this.hitGuard(enemy, dmg, proj.body ? proj.body.velocity.x * 0.05 : 0, proj.body ? proj.body.velocity.y * 0.05 : 0);
      }
    });

    // Handle friendly reflected projectiles hitting boss
    this.physics.add.overlap(this.projectilesGroup, this.boss, (projNode, bNode) => {
      const proj = projNode as Phaser.Physics.Arcade.Sprite;
      if (proj.getData('friendly') && this.boss && this.boss.active) {
        proj.destroy();
        const dmg = proj.getData('damageAmount') || 30;
        this.damageBoss(dmg, proj.body ? proj.body.velocity.x * 0.05 : 0, proj.body ? proj.body.velocity.y * 0.05 : 0);
      }
    });

    // 6b. Spawning Interactive Dark Pools
    this.poolsGroup = this.physics.add.staticGroup();
    const poolCoordinates = [
      { x: 320, y: 240 },
      { x: 960, y: 240 },
      { x: 320, y: 480 },
      { x: 960, y: 480 }
    ];
    poolCoordinates.forEach(coord => {
      const pool = this.poolsGroup.create(coord.x, coord.y, 'dark-pool').setScale(1.2);
      pool.setBodySize(68, 68);
      pool.refreshBody();
    });

    // Overlap checks for the dark pools with the player
    this.physics.add.overlap(this.player, this.poolsGroup, () => {
      this.playerInPool = true;
    });

    // 6c. Spawning Sutherlandia Healing Herbs around the boss battle arena edges (3 herbs)
    this.herbsGroup = this.physics.add.staticGroup();
    const herbCorners = [
      { x: 120, y: 360 }, // far left
      { x: 220, y: 620 }, // bottom-left
      { x: 1060, y: 620 } // bottom-right
    ];
    herbCorners.forEach(coord => {
      const herb = this.herbsGroup.create(coord.x, coord.y, 'sutherlandia-herb');
      herb.setTint(0x39E07A); // Bio moss/prop accent (bright popping prop)
      this.tweens.add({
        targets: herb,
        scale: 1.25,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // Overlap callback for gathering Sutherlandia healing herbs in Level 3
    this.physics.add.overlap(this.player, this.herbsGroup, (playerObj, herbObj) => {
      const herb = herbObj as Phaser.Physics.Arcade.Sprite;
      if (herb.active) {
        herb.destroy();
        
        // Heal player
        const healedAmt = 25;
        const nextHp = Math.min(100, window.gameState.health + healedAmt);
        updateReactState({ health: nextHp });
        
        // Effects
        this.showFloatingText(herb.x, herb.y, `+${healedAmt} HP Sutherlandia`, 0x10b981);
        if (window.gameAudio) {
          window.gameAudio.playSfx('collect');
        }
        
        // Green healing splash particles
        const healParticles = this.add.particles(herb.x, herb.y, 'part-gold', {
          scale: { start: 0.6, end: 0 },
          alpha: { start: 1, end: 0 },
          speed: 40,
          lifespan: 600,
          maxParticles: 12,
        });
        this.time.delayedCall(800, () => {
          healParticles.destroy();
        });
      }
    });

    this.spearGraphics = this.add.graphics();
    this.shieldGraphics = this.add.graphics();
    this.jamaOutlineGraphics = this.add.graphics();

    this.spearGraphics.disableInteractive();
    if (this.spearGraphics.input) this.spearGraphics.input.enabled = false;
    this.shieldGraphics.disableInteractive();
    if (this.shieldGraphics.input) this.shieldGraphics.input.enabled = false;
    this.jamaOutlineGraphics.disableInteractive();
    if (this.jamaOutlineGraphics.input) this.jamaOutlineGraphics.input.enabled = false;

    this.spearGraphics.setDepth(2.1);
    this.shieldGraphics.setDepth(2.2);
    this.jamaOutlineGraphics.setDepth(2.0); // Draw outer/glow lines just behind/around player body

    this.jamaGoldenOutlineAlpha = 0;
    this.finalFightActive = false;
    this.jamaChanged = false;
    this.jamaWhiteGlowActive = false;
    this.lastGoldenPulseTime = 0;
    this.finalFightStartTime = 0;
    this.spearRaiseProgress = 0;

    // Reactive hooks
    (window as any).triggerPhaserAttack = () => {
      if (this.scene.isActive() && this.player && this.player.active) {
        if (this.inFinalBlowSequence && typeof this.finalStrikeCallback === 'function') {
          this.finalStrikeCallback();
        } else {
          this.triggerLightAttack();
        }
      }
    };
    (window as any).triggerPhaserDash = () => {
      if (this.scene.isActive() && this.player && this.player.active) {
        this.triggerDash();
      }
    };
    (window as any).triggerPhaserPower = () => {
      if (this.scene.isActive() && this.player && this.player.active) {
        this.triggerRadialPowerBurst();
      }
    };
    (window as any).triggerPhaserBash = () => {
      if (this.scene.isActive() && this.player && this.player.active) {
        this.triggerShieldBash();
      }
    };
    (window as any).triggerPhaserCollect = () => {
      // In shrine, no relics to collect, keep stubbed
    };

    // Create custom light-mask-shrine canvas texture for Phase 2 Vignette tight bounds
    if (!this.textures.exists('light-mask-shrine')) {
      const canvasTexture = this.textures.createCanvas('light-mask-shrine', 380, 380);
      const ctx = canvasTexture.getContext();
      ctx.clearRect(0, 0, 380, 380);
      const grad = ctx.createRadialGradient(190, 190, 0, 190, 190, 190);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(190, 190, 190, 0, Math.PI * 2);
      ctx.fill();
      canvasTexture.refresh();
    }

    this.darknessOverlayRender = this.add.renderTexture(0, 0, 1280, 720);
    this.darknessOverlayRender.setScrollFactor(0);
    this.darknessOverlayRender.setDepth(3.5); // sit above regular combat sprites (depth 2 and 3)
    this.darknessOverlayRender.setVisible(false);

    this.lightMaskImageShrine = this.add.image(0, 0, 'light-mask-shrine');
    this.lightMaskImageShrine.setVisible(false);

    // Initialize 4 candles around the shrine arena
    this.candles = [];
    const candleCoords = [
      { x: 120, y: 120 },
      { x: 1165, y: 120 },
      { x: 120, y: 600 },
      { x: 1165, y: 600 }
    ];
    candleCoords.forEach((c) => {
      const candleG = this.add.graphics();
      candleG.setDepth(2.0);
      this.candles.push(candleG);
      candleG.setData('burning', true);
      candleG.setData('x', c.x);
      candleG.setData('y', c.y);
    });

    // Initial taunt timers setup
    this.lastTauntTime = 0;
    this.nextTauntCooldown = 15000 + Math.random() * 5000; // First taunt comes quicker!

    // Initial darkness wave timers setup
    this.lastDarknessWaveTime = 4000; // 4s after entry is first wave!

    // Trigger Comic speech bubbles cutscene on level entry
    if (this.loadFromSaveActive) {
      this.gameplayStarted = true;
    } else {
      this.time.delayedCall(120, () => {
        this.runCutsceneSequence();
      });
    }
  }

  createSpeechBubble(sourceObject: Phaser.GameObjects.Sprite | Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, textString: string, speakerName: 'nkanyamba' | 'jama' | 'sister' | 'khwezi', onComplete: () => void, isBelowForce?: boolean) {
    const gameWidth = 1280;
    const gameHeight = 720;
    const bubbleWidth = 300;
    const bubbleHeight = 90;

    const speakerIsJama = (speakerName === 'jama');
    let isBelow = (isBelowForce !== undefined) ? isBelowForce : false;

    // Initial position calculations
    let bubbleX = sourceObject ? sourceObject.x : gameWidth / 2;
    let bubbleY = isBelow ? (sourceObject ? sourceObject.y + 60 : gameHeight / 2) : (sourceObject ? sourceObject.y - 100 : gameHeight / 2);

    // If bubbleY would go off screen bottom or top:
    if (isBelow) {
      if (sourceObject) {
        bubbleY = sourceObject.y + 60;
        // Clamp bubbleY so that the bottom of the bubble (bubbleY + bubbleHeight) is within the screen bounds
        if (bubbleY + bubbleHeight > gameHeight - 20) {
          bubbleY = gameHeight - bubbleHeight - 20;
        }
      }
    } else {
      if (bubbleY - bubbleHeight < 20) {
        isBelow = true; // Fall back to below if it goes offscreen above
        bubbleY = sourceObject ? sourceObject.y + 60 : gameHeight / 2;
      }
    }

    // Bounds checking X
    if (bubbleX + bubbleWidth / 2 > gameWidth - 20) {
      bubbleX = gameWidth - bubbleWidth / 2 - 20;
    }
    if (bubbleX - bubbleWidth / 2 < 20) {
      bubbleX = bubbleWidth / 2 + 20;
    }

    const bubbleContainer = this.add.container(bubbleX, bubbleY);
    bubbleContainer.setDepth(100); // Sit above absolutely everything else

    const graphics = this.add.graphics();
    bubbleContainer.add(graphics);

    const isNkanyamba = (speakerName === 'nkanyamba');
    const isSister = (speakerName === 'sister' || speakerName === 'khwezi');
    const bgColor = isNkanyamba ? 0x0d0005 : (isSister ? 0x000508 : 0x000d05);
    const strokeColor = isNkanyamba ? 0xff0000 : (isSister ? 0xaaccff : 0x00ffa3);
    const plateColor = isNkanyamba ? '#ff0000' : (isSister ? '#aaccff' : '#00ffa3');
    const textColor = isNkanyamba ? '#ff4ffc' : (isSister ? '#aaccff' : '#00ffa3');
    const plateText = isNkanyamba ? "N K A N Y A M B A" : (isSister ? "K H W E Z I" : "J A M A");

    // 1. Draw soft outer glow shadow layers
    for (let g = 1; g <= 5; g++) {
      graphics.lineStyle(g * 3, strokeColor, (isNkanyamba ? 0.08 : (isSister ? 0.09 : 0.07)) / g);
      if (isBelow) {
        graphics.strokeRoundedRect(-bubbleWidth / 2 - g * 1.5, -g * 1.5, bubbleWidth + g * 3, bubbleHeight + g * 3, 8);
      } else {
        graphics.strokeRoundedRect(-bubbleWidth / 2 - g * 1.5, -bubbleHeight - g * 1.5, bubbleWidth + g * 3, bubbleHeight + g * 3, 8);
      }
    }

    // 2. Draw solid background rounded rect & sharp border
    graphics.fillStyle(bgColor, 1.0);
    graphics.lineStyle(2, strokeColor, 1.0);
    if (isBelow) {
      graphics.fillRoundedRect(-bubbleWidth / 2, 0, bubbleWidth, bubbleHeight, 8);
      graphics.strokeRoundedRect(-bubbleWidth / 2, 0, bubbleWidth, bubbleHeight, 8);
    } else {
      graphics.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);
      graphics.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);
    }

    // 3. Draw spiky tail pointing towards speaker body
    graphics.fillStyle(bgColor, 1.0);
    graphics.beginPath();
    if (isBelow) {
      // points UPWARD
      graphics.moveTo(-10, 0);
      graphics.lineTo(10, 0);
      graphics.lineTo(0, -18);
    } else {
      // points DOWNWARD
      graphics.moveTo(-10, 0);
      graphics.lineTo(10, 0);
      graphics.lineTo(0, 18);
    }
    graphics.closePath();
    graphics.fillPath();

    graphics.lineStyle(2, strokeColor, 1.0);
    graphics.beginPath();
    if (isBelow) {
      graphics.moveTo(-10, 0);
      graphics.lineTo(0, -18);
      graphics.lineTo(10, 0);
    } else {
      graphics.moveTo(-10, 0);
      graphics.lineTo(0, 18);
      graphics.lineTo(10, 0);
    }
    graphics.strokePath();

    // Mask to erase line inside border margin of tail base
    graphics.lineStyle(3.5, bgColor, 1.0);
    if (isBelow) {
      graphics.lineBetween(-8, 1, 8, 1);
    } else {
      graphics.lineBetween(-8, -1, 8, -1);
    }

    // 4. Draw thin boundary separator line below name plate
    graphics.lineStyle(1, strokeColor, 0.7);
    if (isBelow) {
      graphics.lineBetween(-bubbleWidth / 2 + 18, 22, bubbleWidth / 2 - 18, 22);
    } else {
      graphics.lineBetween(-bubbleWidth / 2 + 18, -bubbleHeight + 22, bubbleWidth / 2 - 18, -bubbleHeight + 22);
    }

    // 5. Speaker Name Plate Accent inside bubble
    const namePlateY = isBelow ? 7 : -bubbleHeight + 7;
    const namePlate = this.add.text(-bubbleWidth / 2 + 18, namePlateY, plateText, {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '11px',
      color: plateColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    bubbleContainer.add(namePlate);

    // 6. Create the dialogue text (typewriter styled)
    const dialogueTextY = isBelow ? 28 : -bubbleHeight + 28;
    const txt = this.add.text(-bubbleWidth / 2 + 18, dialogueTextY, "", {
      fontFamily: '"Space Grotesk", "Courier New", Courier, monospace',
      fontSize: '13px',
      color: textColor,
      wordWrap: { width: bubbleWidth - 36 },
      fontStyle: 'bold',
    });
    bubbleContainer.add(txt);

    // Sound alert on new text
    if (window.gameAudio) {
       window.gameAudio.playSfx('click');
    }

    // Typewriter effect (40ms per character as specified)
    let charIndex = 0;
    const timer = this.time.addEvent({
      delay: 40,
      repeat: textString.length - 1,
      callback: () => {
        charIndex++;
        if (txt && txt.active) {
          txt.setText(textString.substring(0, charIndex));
        }
        if (charIndex === textString.length) {
          // Wait 1200ms after text finishes typing, then fade out bubble over 300ms
          this.time.delayedCall(1200, () => {
             if (this.tweens) {
               this.tweens.add({
                 targets: bubbleContainer,
                 alpha: 0,
                 duration: 300,
                 onComplete: () => {
                     bubbleContainer.destroy();
                     onComplete();
                 }
               });
             } else {
               bubbleContainer.destroy();
               onComplete();
             }
          });
        }
      }
    });

    // Constantly follow source object position as they move or sway
    const followTimer = this.time.addEvent({
       delay: 16,
       loop: true,
       callback: () => {
          if (sourceObject && sourceObject.active && bubbleContainer && bubbleContainer.active) {
             let curX = sourceObject.x;
             let curY = isBelow ? (sourceObject.y + 60) : (sourceObject.y - 100);

             // Double check boundaries dynamically
             if (isBelow) {
                curY = sourceObject.y + 60;
                if (curY + bubbleHeight > gameHeight - 20) {
                   curY = gameHeight - bubbleHeight - 20;
                }
             } else {
                if (curY - bubbleHeight < 20) {
                   curY = sourceObject.y + 60;
                }
             }

             if (curX + bubbleWidth / 2 > gameWidth - 20) {
                curX = gameWidth - bubbleWidth / 2 - 20;
             }
             if (curX - bubbleWidth / 2 < 20) {
                curX = bubbleWidth / 2 + 20;
             }

             bubbleContainer.setPosition(curX, curY);
          } else {
             followTimer.destroy();
          }
       }
    });
  }

  createInstantTauntBubble(textString: string) {
    const bubbleContainer = this.add.container(this.boss.x, this.boss.y - 100);
    bubbleContainer.setDepth(100); // Sit above absolutely everything else

    const graphics = this.add.graphics();
    bubbleContainer.add(graphics);

    // Padding & dimensions
    const bubbleWidth = 280;
    const bubbleHeight = 70;

    let bgColor = 0x14041d; // Dark violet for Nkanyamba
    let strokeColor = 0xb122ff; // Bright purple stroke for Nkanyamba
    let textColor = '#ffcccc'; // Demonic red text for Nkanyamba
    let plateColor = '#ff2255'; // Crimson
    let plateText = "NKANYAMBA";

    // Draw the bubble shadow
    graphics.fillStyle(0x000000, 0.45);
    graphics.fillRoundedRect(-bubbleWidth / 2 + 4, -bubbleHeight + 4, bubbleWidth, bubbleHeight, 14);

    // Draw main bubble background
    graphics.fillStyle(bgColor, 0.96);
    graphics.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 14);

    // Draw bubble outline
    graphics.lineStyle(2.5, strokeColor, 1.0);
    graphics.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 14);

    // 3. Draw speech tail (downward pointing pointer indicator triangle)
    graphics.fillStyle(bgColor, 1.0);
    graphics.lineStyle(2.5, strokeColor, 1.0);
    graphics.beginPath();
    graphics.moveTo(-10, 0);
    graphics.lineTo(0, 18);
    graphics.lineTo(10, 0);
    graphics.strokePath();

    // Mask to erase line inside top of tail
    graphics.lineStyle(3.5, bgColor, 1.0);
    graphics.lineBetween(-8, -1, 8, -1);

    // Draw thin boundary separator line below name plate
    graphics.lineStyle(1, strokeColor, 0.7);
    graphics.lineBetween(-bubbleWidth / 2 + 18, -bubbleHeight + 22, bubbleWidth / 2 - 18, -bubbleHeight + 22);

    // Speaker Name Plate Accent inside bubble
    const namePlate = this.add.text(-bubbleWidth / 2 + 18, -bubbleHeight + 7, plateText, {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '11px',
      color: plateColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    bubbleContainer.add(namePlate);

    // Dialogue text (instant, no typewriter)
    const txt = this.add.text(-bubbleWidth / 2 + 18, -bubbleHeight + 28, textString, {
      fontFamily: '"Space Grotesk", "Courier New", Courier, monospace',
      fontSize: '13px',
      color: textColor,
      wordWrap: { width: bubbleWidth - 36 },
      fontStyle: 'bold',
    });
    bubbleContainer.add(txt);

    // Sound alert on new text
    if (window.gameAudio) {
       window.gameAudio.playSfx('click');
    }

    // Fade out after 1200ms
    this.tweens.add({
      targets: bubbleContainer,
      alpha: 0,
      delay: 1200,
      duration: 300,
      onComplete: () => {
        bubbleContainer.destroy();
      }
    });

    // Constantly follow source object position as they move or sway
    const followTimer = this.time.addEvent({
       delay: 16,
       loop: true,
       callback: () => {
          if (this.boss && this.boss.active && bubbleContainer && bubbleContainer.active) {
             bubbleContainer.setPosition(this.boss.x, this.boss.y - 90);
          } else {
             followTimer.destroy();
          }
       }
    });
  }

  getBossDamage(amount: number) {
    let scalar = 1.0;
    if (this.difficulty === 'easy') scalar = 0.65;
    else if (this.difficulty === 'hard') scalar = 1.5;
    return Math.round(amount * scalar);
  }

  runCutsceneSequence() {
     this.gameplayStarted = false; // Freeze everything!
     this.player.setVelocity(0, 0);
     this.boss.setVelocity(0, 0);

     // Smooth camera pan to show the altar & Nkanyamba center
     this.cameras.main.pan(640, 260, 1000, 'Quad.easeOut');

     this.time.delayedCall(1200, () => {
       // Step 1: Nkanyamba speaks
       this.createSpeechBubble(this.boss, "Foolish human! You dare enter my sanctuary?", 'nkanyamba', () => {
          // Step 2: Jama replies
          this.createSpeechBubble(this.player, "Release her, Nkanyamba! This fight ends here.", 'jama', () => {
             // Step 3: Nkanyamba counters
             this.isLaughing = true; // Trigger fast eyes pulsing
             // accompany with a deep echoing sound effect!
             if (window.gameAudio) {
                window.gameAudio.playSfx('ambient'); 
             }
             this.createSpeechBubble(this.boss, "Is that a threat? How amusing but darkness cannot be snuffed out by such a mere being!", 'nkanyamba', () => {
                this.isLaughing = false;
                
                // Camera pans back to reveal the fighting arena
                this.cameras.main.pan(640, 360, 800, 'Quad.easeInOut');

                this.time.delayedCall(905, () => {
                   if (window.gameAudio) {
                      window.gameAudio.playSfx('hurt'); 
                   }
                   this.showFloatingText(this.boss.x, this.boss.y - 30, "*MESSENGER LAUGHTER*", 0xbf4ffc);

                   // Start gameplay!
                   this.gameplayStarted = true;
                });
             });
          });
       });
     });
  }

  triggerPhase2Transition() {
    this.isTransitioningPhase = true;
    this.gameplayStarted = false; // Freeze gameplay!
    this.player.setVelocity(0, 0);
    this.boss.setVelocity(0, 0);
    
    // Stop and disintegrate all active guards on target
    this.guardsGroup.getChildren().forEach(g => {
       const guard = g as Phaser.Physics.Arcade.Sprite;
       if (guard.active) {
          guard.setVelocity(0, 0);
          // Disintegration particles
          const pExplode = this.add.particles(guard.x, guard.y, 'part-blood', {
             scale: { start: 1.0, end: 0 },
             speed: 160,
             lifespan: 600,
             maxParticles: 35
          });
          this.time.delayedCall(1000, () => pExplode.destroy());
          
          const shadowG = guard.getData('glow') as Phaser.GameObjects.Graphics;
          if (shadowG) shadowG.destroy();
          guard.disableBody(true, true);
       }
    });

    // Screen shakes: intensity 0.015 for 1500ms
    this.cameras.main.shake(1500, 0.015);

    // Dramatic black and white full screen inverse flash
    const inverseOverlay = this.add.graphics();
    inverseOverlay.setDepth(250);
    inverseOverlay.fillStyle(0xffffff, 1.0); // white flash start
    inverseOverlay.fillRect(0, 0, 1280, 720);
    
    this.tweens.add({
       targets: inverseOverlay,
       alpha: 0,
       duration: 350,
       onComplete: () => {
          inverseOverlay.fillStyle(0x000000, 1.0); // black inverse next
          inverseOverlay.alpha = 1.0;
          this.tweens.add({
             targets: inverseOverlay,
             alpha: 0,
             duration: 350,
             onComplete: () => {
                inverseOverlay.destroy();
             }
          });
       }
    });

    // Phase transition audio begins
    if (window.gameAudio) {
      window.gameAudio.setBossPhase2();
    }

    // 100% HEALTH & LANTERN RESTORATION FOR THE PLAYER
    window.gameState.health = window.gameState.maxHealth;
    window.gameState.lanternFuel = 100;
    updateReactState({ health: window.gameState.maxHealth, lanternFuel: 100 });

    // Play restorative chime and splash health recovery floating text
    if (window.gameAudio) {
      window.gameAudio.playSfx('relic');
    }
    this.showFloatingText(this.player.x, this.player.y - 45, "HEALTH & LIGHT RESTORED!", 0x00FFA3);

    // Dynamic player light-pulse flash overlay effect
    const flashG = this.add.graphics();
    flashG.setDepth(99);
    flashG.fillStyle(0x00ffa3, 0.4);
    flashG.fillCircle(this.player.x, this.player.y, 160);
    this.tweens.add({
       targets: flashG,
       alpha: 0,
       duration: 800,
       onComplete: () => flashG.destroy()
    });

    // Visual aura shift: Deep red aura turns into electric violet-blue
    this.bossAuraColor = 0x8a2be2; // Electric violet-blue
    this.sparkEmitterActive = true;

    // Dialogue block dialogue over Nkanyamba's head
    this.createSpeechBubble(this.boss, "...You're more resilient than I expected. Enought of this. MINIONS SPAWN.", 'nkanyamba', () => {
       // Retreat to far corner
       this.tweens.add({
         targets: this.boss,
         x: 1100,
         y: 150,
         duration: 1500,
         ease: 'Quad.easeInOut',
         onComplete: () => {
           // Boss has reached the corner
           this.gameplayStarted = true;
           this.isTransitioningPhase = false;
           this.bossPhase = 2;
           updateReactState({ bossPhase: 2 });
           
           // Exactly 4 minions spawn for the booster fight
           this.time.delayedCall(1000, () => {
              if (this.boss && this.boss.active) {
                 this.spawnGuard(300, 250);
                 this.spawnGuard(450, 450);
                 this.spawnGuard(830, 450);
                 this.spawnGuard(980, 250);
                 this.nkanyambaMinionsSpawned = true;
                 this.hadMinionsAlive = true;
                 this.bossPhaseActiveMinionsAlive = true;
                 
                 // Extinguish candles one by one
                 this.extinguishCandles();
              }
           });
         }
       });
    });
  }

  drawNkanyamba(time: number) {
    if (!this.boss || !this.boss.active) {
      if (this.nkanyambaGraphics) this.nkanyambaGraphics.clear();
      return;
    }

    this.nkanyambaGraphics.clear();

    const bx = this.boss.x + (this.nkanyambaStaggerX || 0);
    const by = this.boss.y + (this.nkanyambaYOffset || 0);

    // 1. Hover/Float Sway math
    const floatY = (this.bossDefeated) ? 0 : Math.sin(time * 0.003) * 8;

    const rotAngle = this.nkanyambaRot || 0;

    const rotatePt = (px: number, py: number) => {
      if (!rotAngle) return { x: px, y: py };
      const rad = rotAngle * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = px - bx;
      const dy = py - (by + floatY);
      return {
        x: bx + dx * cos - dy * sin,
        y: (by + floatY) + dx * sin + dy * cos
      };
    };

    // 2. Draw Faint Shadow Trail first if Phase 2 (only if not defeated)
    if (!this.bossDefeated && this.bossPhase === 2 && this.bossTrailHistory) {
      this.bossTrailHistory.forEach((pt, idx) => {
        let alpha = 0.02 * (idx + 1); // fade out older ones
        // Draw path shadow silhouette
        this.nkanyambaGraphics.fillStyle(0x0a000d, alpha);
        this.nkanyambaGraphics.fillCircle(pt.x, pt.y + floatY - 33, 18);
        this.nkanyambaGraphics.lineStyle(4, 0x0a000d, alpha);
        this.nkanyambaGraphics.lineBetween(pt.x, pt.y + floatY - 15, pt.x, pt.y + floatY + 25);
      });
    }

    // 3. Draw outer shadow/aura beneath him
    let shadowPulse = (this.bossDefeated) ? 1.0 : (1.0 + 0.15 * Math.sin(time * 0.003));
    this.nkanyambaGraphics.fillStyle(0x000000, 0.65 * (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1));
    this.nkanyambaGraphics.fillEllipse(bx, by + 75, 60 * shadowPulse, 18 * shadowPulse);

    // Body aura: deep shadow #0d010d vs electric violet-blue glow
    let auraColor = (this.bossPhase === 1) ? 0x0d010d : 0x8616e8;
    let auraAlpha = (this.bossPhase === 1) ? 0.45 : 0.4;
    
    this.nkanyambaGraphics.fillStyle(auraColor, auraAlpha * (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1));
    const pTorsoAura = rotatePt(bx, by + floatY + 5);
    const pHeadAura = rotatePt(bx, by + floatY - 33);
    this.nkanyambaGraphics.fillCircle(pTorsoAura.x, pTorsoAura.y, 52); // Torso aura
    this.nkanyambaGraphics.fillCircle(pHeadAura.x, pHeadAura.y, 38); // Head aura

    // Helper to draw black limbs overlayed with flowing diagonal red/blue streaks
    const drawStreakLine = (x1: number, y1: number, x2: number, y2: number) => {
      const p1 = rotatePt(x1, y1);
      const p2 = rotatePt(x2, y2);
      
      const px1 = p1.x;
      const py1 = p1.y;
      const px2 = p2.x;
      const py2 = p2.y;

      // Draw background thick black line base (6px)
      this.nkanyambaGraphics.lineStyle(6, 0x010002, (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1.0));
      this.nkanyambaGraphics.lineBetween(px1, py1, px2, py2);

      // Now overlay diagonal stripes alternating red and blue/violet
      let len = Phaser.Math.Distance.Between(px1, py1, px2, py2);
      if (len < 5) return;
      let steps = Math.floor(len / 8);
      let flickerInterval = 250;
      if (this.finalFightActive) {
        flickerInterval = 120;
      }
      if (this.nkanyambaFlickerGrey) {
        flickerInterval = 80;
      }
      let shiftOffset = (Math.floor(time / flickerInterval) * 2) % 8;
      
      for (let s = 0; s < steps; s++) {
        let frac = (s * 8 + shiftOffset) / len;
        if (frac > 1.0) continue;
        let p_streak_x = px1 + (px2 - px1) * frac;
        let p_streak_y = py1 + (py2 - py1) * frac;
        
        let color = (s % 2 === 0) ? 0xff002b : 0x671de0;
        let streakAlpha = 0.85;

        if (this.nkanyambaStreaksColor !== undefined && this.nkanyambaStreaksColor !== -1) {
          color = this.nkanyambaStreaksColor;
          streakAlpha = 0.6;
        } else if (this.nkanyambaFlickerGrey) {
          color = (Math.floor(time / 80) % 2 === 0) ? 0xff002b : 0x671de0;
        }

        const finalAlpha = (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1.0) * streakAlpha;
        this.nkanyambaGraphics.lineStyle(3, color, finalAlpha);
        this.nkanyambaGraphics.lineBetween(p_streak_x - 3, p_streak_y - 3, p_streak_x + 3, p_streak_y + 3);
      }
    };

    // 4. Draw Torso back-bones
    drawStreakLine(bx, by + floatY - 15, bx, by + floatY + 25);

    // 5. Draw Waving Obsidian Mantle (Spline visual)
    this.nkanyambaGraphics.lineStyle(3, 0x5a0d8c, 0.45 * (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1.0));
    for (let side = -1; side <= 1; side += 2) {
      let capeSway = (this.bossDefeated) ? 0 : Math.sin(time * 0.003 + side) * 8;
      const pt1 = rotatePt(bx + side * 4, by + floatY - 15);
      const pt2 = rotatePt(bx + side * 24 + capeSway, by + floatY + 15);
      const pt3 = rotatePt(bx + side * 36 + capeSway * 1.5, by + floatY + 50);

      this.nkanyambaGraphics.beginPath();
      this.nkanyambaGraphics.moveTo(pt1.x, pt1.y);
      this.nkanyambaGraphics.lineTo(pt2.x, pt2.y);
      this.nkanyambaGraphics.lineTo(pt3.x, pt3.y);
      this.nkanyambaGraphics.strokePath();
    }

    // Determine hands droops
    let armDroopAngle = this.nkanyambaArmAngle || 0;
    let armRad = armDroopAngle * Math.PI / 180;

    // 6. Right Hand - Massive Shadow Spear
    let isCasting = !this.bossDefeated && (time < this.bossTelegraphTick);
    let rHandX = bx + 32;
    let rHandY = by - 5 + floatY;

    if (this.bossDefeated) {
      const rx = 32 * Math.cos(armRad) - 10 * Math.sin(armRad);
      const ry = 32 * Math.sin(armRad) + 10 * Math.cos(armRad);
      rHandX = bx + rx;
      rHandY = (by + floatY - 15) + ry;
    } else {
      rHandX = bx + 32 + Math.sin(time * 0.003) * 3;
      if (isCasting) rHandY -= 20;
    }

    // Spear shaft lines (thick jet black)
    const shaftP1 = rotatePt(rHandX - 30, rHandY + 45);
    const shaftP2 = rotatePt(rHandX + 30, rHandY - 55);
    this.nkanyambaGraphics.lineStyle(4, 0x050505, (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1.0));
    this.nkanyambaGraphics.lineBetween(shaftP1.x, shaftP1.y, shaftP2.x, shaftP2.y);

    let tipX = rHandX + 30;
    let tipY = rHandY - 55;
    const tipRot = rotatePt(tipX, tipY);
    const tipRotCore = rotatePt(tipX + 8, tipY - 16);

    // Deep burning red spear tip point
    this.nkanyambaGraphics.lineStyle(7, 0xff003c, 0.85 * (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1));
    this.nkanyambaGraphics.lineBetween(tipRot.x, tipRot.y, tipRotCore.x, tipRotCore.y);
    this.nkanyambaGraphics.lineStyle(2, 0xffffff, 1.0 * (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1)); // white core line
    this.nkanyambaGraphics.lineBetween(tipRot.x, tipRot.y, tipRotCore.x, tipRotCore.y);

    // Floating circular weapon energy spark stars around weapon tip
    let tipPulse = (this.bossDefeated) ? 0 : (4 + 2 * Math.sin(time * 0.01));
    if (tipPulse > 0) {
      const pTipSpark = rotatePt(tipX + 4, tipY - 8);
      this.nkanyambaGraphics.fillStyle(0xff003c, 0.35 * (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1));
      this.nkanyambaGraphics.fillCircle(pTipSpark.x, pTipSpark.y, tipPulse);
    }

    // Draw arm to right hand holding weapon
    drawStreakLine(bx, by + floatY - 15, rHandX, rHandY);

    // 7. Left Hand - Swirling Energy Portal & Arm
    let lHandX = bx - 32;
    let lHandY = by - 5 + floatY;
    if (this.bossDefeated) {
      const lx = -32 * Math.cos(armRad) + 10 * Math.sin(armRad);
      const ly = 32 * Math.sin(armRad) + 10 * Math.cos(armRad);
      lHandX = bx + lx;
      lHandY = (by + floatY - 15) + ly;
    } else {
      lHandX = bx - 32 + Math.sin(time * 0.003 + Math.PI) * 3;
    }

    // Draw arm to left hand
    drawStreakLine(bx, by + floatY - 15, lHandX, lHandY);

    if (!this.bossDefeated) {
      // Swirling portal graphics
      let rotSpeed = time * 0.005;
      const pLHand = rotatePt(lHandX, lHandY);
      this.nkanyambaGraphics.lineStyle(2.0, 0xff0055, 0.7);
      this.nkanyambaGraphics.strokeCircle(pLHand.x, pLHand.y, 14);
      this.nkanyambaGraphics.lineStyle(1.5, 0x8a2be2, 0.45);
      this.nkanyambaGraphics.strokeCircle(pLHand.x, pLHand.y, 20);

      // Dynamic glowing orbit dashes
      for (let d = 0; d < 4; d++) {
        let ang = rotSpeed + (d * Math.PI) / 2;
        const pOrbStart = rotatePt(lHandX + Math.cos(ang) * 9, lHandY + Math.sin(ang) * 9);
        const pOrbEnd = rotatePt(lHandX + Math.cos(ang) * 14, lHandY + Math.sin(ang) * 14);
        this.nkanyambaGraphics.lineStyle(2, (d % 2 === 0 ? 0xff0055 : 0x00e1ff), 0.9);
        this.nkanyambaGraphics.lineBetween(pOrbStart.x, pOrbStart.y, pOrbEnd.x, pOrbEnd.y);
      }
    }

    // 8. Legs drawing with active strides (disabled on defeat)
    let isWalking = !this.bossDefeated && (Math.abs(this.boss.body.velocity.x) > 5 || Math.abs(this.boss.body.velocity.y) > 5);
    let walkPhase = isWalking ? Math.sin(time * 0.008) * 12 : 0;

    // Left Leg
    let lKneeX = bx - 16 + walkPhase;
    let lFootX = bx - 22 + walkPhase * 1.3;
    drawStreakLine(bx, by + floatY + 25, lKneeX, by + floatY + 50);
    drawStreakLine(lKneeX, by + floatY + 50, lFootX, by + floatY + 75);

    // Right Leg
    let rKneeX = bx + 16 - walkPhase;
    let rFootX = bx + 22 - walkPhase * 1.3;
    drawStreakLine(bx, by + floatY + 25, rKneeX, by + floatY + 50);
    drawStreakLine(rKneeX, by + floatY + 50, rFootX, by + floatY + 75);

    // 9. Draw head circle (18px radius)
    const hx_org = bx;
    const hy_org = by + floatY - 33;
    const pHead = rotatePt(hx_org, hy_org);
    const hx = pHead.x;
    const hy = pHead.y;
    this.nkanyambaGraphics.fillStyle(0x010002, (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1));
    this.nkanyambaGraphics.fillCircle(hx, hy, 18);

    // 10. Draw Jagged Glowing Obsidian Crown Floating above head
    let cx_org = hx_org;
    let cy_org = hy_org - 11;
    const cp1 = rotatePt(cx_org - 15, cy_org + 2);
    const cp2 = rotatePt(cx_org - 10, cy_org - 8);
    const cp3 = rotatePt(cx_org - 4, cy_org);
    const cp4 = rotatePt(cx_org, cy_org - 14);
    const cp5 = rotatePt(cx_org + 4, cy_org);
    const cp6 = rotatePt(cx_org + 10, cy_org - 8);
    const cp7 = rotatePt(cx_org + 15, cy_org + 2);

    this.nkanyambaGraphics.lineStyle(2, 0x8a2be2, 1.0 * (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1));
    this.nkanyambaGraphics.fillStyle(0x010002, (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1));
    this.nkanyambaGraphics.beginPath();
    this.nkanyambaGraphics.moveTo(cp1.x, cp1.y);
    this.nkanyambaGraphics.lineTo(cp2.x, cp2.y);
    this.nkanyambaGraphics.lineTo(cp3.x, cp3.y);
    this.nkanyambaGraphics.lineTo(cp4.x, cp4.y);
    this.nkanyambaGraphics.lineTo(cp5.x, cp5.y);
    this.nkanyambaGraphics.lineTo(cp6.x, cp6.y);
    this.nkanyambaGraphics.lineTo(cp7.x, cp7.y);
    this.nkanyambaGraphics.closePath();
    this.nkanyambaGraphics.fillPath();
    this.nkanyambaGraphics.strokePath();

    // White crown-tip embers
    const cpEm1 = rotatePt(cx_org - 10, cy_org - 8);
    const cpEm2 = rotatePt(cx_org, cy_org - 14);
    const cpEm3 = rotatePt(cx_org + 10, cy_org - 8);

    this.nkanyambaGraphics.fillStyle(0xffffff, 1.0 * (this.nkanyambaAlpha !== undefined ? this.nkanyambaAlpha : 1));
    this.nkanyambaGraphics.fillCircle(cpEm1.x, cpEm1.y, 1.5);
    this.nkanyambaGraphics.fillCircle(cpEm2.x, cpEm2.y, 2);
    this.nkanyambaGraphics.fillCircle(cpEm3.x, cpEm3.y, 1.5);

    // 11. Draw Custom Eyes (single when active, dual dying eyes on collapse)
    if (!this.bossDefeated) {
      let eyePulse = (this.nkanyambaErraticEye) ? (0.6 + 0.5 * Math.sin(time * 0.12)) : (0.8 + 0.2 * Math.sin(time * 0.005));
      let eyeAlphaMultiplier = 1.0;
      if (this.finalFightActive && this.finalFightStartTime) {
        const elapsedSeconds = (time - this.finalFightStartTime) / 1000;
        const reductionSteps = Math.floor(elapsedSeconds / 30);
        eyeAlphaMultiplier = Math.max(0, 1.0 - (reductionSteps * 0.05));
      }

      // Outer red glow aura
      this.nkanyambaGraphics.fillStyle(0xff003c, 0.25 * eyePulse * eyeAlphaMultiplier);
      this.nkanyambaGraphics.fillCircle(hx, hy + 2, 12);
      this.nkanyambaGraphics.fillStyle(0xff003c, 0.5 * eyePulse * eyeAlphaMultiplier);
      this.nkanyambaGraphics.fillCircle(hx, hy + 2, 6);
      // White/Neon-pink vertical slit pupil
      this.nkanyambaGraphics.fillStyle(0xffffff, 1.0 * eyeAlphaMultiplier);
      this.nkanyambaGraphics.fillEllipse(hx, hy + 2, 2.0, 5.5 * eyePulse);
    } else {
      // Draw left eye (red) at hx_org - 6, hy_org + 2
      const el_pt = rotatePt(hx_org - 6, hy_org + 2);
      const lEyeAlpha = (this.nkanyambaLeftEyeAlpha !== undefined) ? this.nkanyambaLeftEyeAlpha : 1.0;
      if (lEyeAlpha > 0.02) {
        this.nkanyambaGraphics.fillStyle(0xff003c, 0.4 * lEyeAlpha * (0.8 + 0.2 * Math.sin(time * 0.06)));
        this.nkanyambaGraphics.fillCircle(el_pt.x, el_pt.y, 4);
        this.nkanyambaGraphics.fillStyle(0xffffff, 0.8 * lEyeAlpha);
        this.nkanyambaGraphics.fillCircle(el_pt.x, el_pt.y, 1.5);
      }

      // Draw right eye (blue) at hx_org + 6, hy_org + 2
      const er_pt = rotatePt(hx_org + 6, hy_org + 2);
      const rEyeAlpha = (this.nkanyambaRightEyeAlpha !== undefined) ? this.nkanyambaRightEyeAlpha : 1.0;
      if (rEyeAlpha > 0.02) {
        this.nkanyambaGraphics.fillStyle(0x00e1ff, 0.4 * rEyeAlpha * (0.8 + 0.2 * Math.sin(time * 0.06 + Math.PI)));
        this.nkanyambaGraphics.fillCircle(er_pt.x, er_pt.y, 4);
        this.nkanyambaGraphics.fillStyle(0xffffff, 0.8 * rEyeAlpha);
        this.nkanyambaGraphics.fillCircle(er_pt.x, er_pt.y, 1.5);
      }
    }
  }

  endCutscene() {
    this.cutsceneActive = false;
    this.cutsceneComplete = true;
    if (this.input) this.input.enabled = true;
    if (this.physics && this.physics.world) this.physics.world.resume();
    if (this.time) this.time.timeScale = 1;
    if (this.player && this.player.active) this.player.setVelocity(0, 0);
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;
  }

  update(time: number, delta: number) {
    if (window.gameState.isGameOver || window.gameState.gameCompleted) return;

    if (this.escapeSequenceActive) {
      // Debris falling update
      if (this.debrisParticles && this.debrisGraphics) {
        this.debrisGraphics.clear();
        for (let i = this.debrisParticles.length - 1; i >= 0; i--) {
          const p = this.debrisParticles[i];
          p.y += p.vy * (delta / 1000);
          this.debrisGraphics.fillStyle(p.color, 0.7);
          this.debrisGraphics.fillCircle(p.x, p.y, p.radius);
          if (p.y > 750) {
            this.debrisParticles.splice(i, 1);
          }
        }
      }

      // Check exit threshold
      if (this.player && this.player.active && this.player.y >= 570) {
        this.escapeSequenceActive = false;
        if (this.player.body) {
          this.player.setVelocity(0, 0);
        }
        if (this.rumble) {
          this.rumble.stop();
        }
        if (this.debrisSpawnEvent) {
          this.debrisSpawnEvent.destroy();
        }
        if (this.collapseRedFlashEvent) {
          this.collapseRedFlashEvent.destroy();
        }
        if (this.collapsePanel) {
          this.collapsePanel.destroy();
        }

        this.cameras.main.fade(1000, 0, 0, 0, false, (camera: any, progress: number) => {
          if (progress >= 1.0) {
            this.shutdownShrineScene();
            this.scene.stop('ShrineScene');
            this.scene.start('EscapeScene');
          }
        });
        return;
      }

      // Run follow logic
      if (!this.playerHistory) {
        this.playerHistory = [];
      }
      this.playerHistory.push({ x: this.player.x, y: this.player.y });
      if (this.playerHistory.length > 25) {
        this.playerHistory.shift();
      }

      const targetPos = this.playerHistory[this.playerHistory.length - 18];
      if (targetPos) {
        this.khweziX = targetPos.x;
        this.khweziY = targetPos.y;
        if (this.khweziSprite && this.khweziSprite.active) {
          this.khweziSprite.setPosition(targetPos.x, targetPos.y);
        }
      }

      // Read keyboard inputs directly block combat keys
      if (window.gameInput) {
        this.moveUp = !!window.gameInput.up;
        this.moveDown = !!window.gameInput.down;
        this.moveLeft = !!window.gameInput.left;
        this.moveRight = !!window.gameInput.right;
      }

      let vx = 0;
      let vy = 0;
      const speed = 180; // running speed during escape

      if (this.moveUp || this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
      if (this.moveDown || this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;
      if (this.moveLeft || this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
      if (this.moveRight || this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;

      if (vx !== 0 && vy !== 0) {
        vx *= 0.707;
        vy *= 0.707;
      }

      if (this.player && this.player.active) {
        this.player.setVelocity(vx, vy);
        if (vx < 0) this.player.setFlipX(true);
        if (vx > 0) this.player.setFlipX(false);

        if (vx !== 0 || vy !== 0) {
          this.player.play('jama-light-run', true);
        } else {
          this.player.play('jama-light-idle', true);
        }
      }

      if (this.khweziSprite && this.khweziSprite.active) {
        if (vx < 0) this.khweziSprite.setFlipX(true);
        if (vx > 0) this.khweziSprite.setFlipX(false);
      }

      // Draw custom renders
      this.drawCandles(time);
      this.drawKhwezi(time);
      return; // Early return to bypass all normal boss battle update ticks!
    }

    if (!this.gameplayStarted) {
      if (this.player && this.player.active) {
        this.player.setVelocity(0, 0);
        this.player.play('jama-light-idle', true);
      }
      if (this.boss && this.boss.active) {
        this.boss.setVelocity(0, 0);
      }
      const guards = this.guardsGroup?.getChildren() as Phaser.Physics.Arcade.Sprite[];
      if (guards) {
        guards.forEach(g => {
          if (g.active) g.setVelocity(0, 0);
        });
      }
      this.drawNkanyamba(time);
      return;
    }

    if (window.gameState.isPaused) {
      if (this.physics && this.physics.world && !this.physics.world.isPaused) {
        this.physics.pause();
        this.anims.pauseAll();
        this.tweens.pauseAll();
        if (this.player && this.player.active) {
          this.player.setVelocity(0, 0);
        }
        const guards = this.guardsGroup?.getChildren() as Phaser.Physics.Arcade.Sprite[];
        if (guards) {
          guards.forEach(g => {
            if (g.active) g.setVelocity(0, 0);
          });
        }
        if (this.boss && this.boss.active) {
          this.boss.setVelocity(0, 0);
        }
      }
      return;
    } else {
      if (this.physics && this.physics.world && this.physics.world.isPaused) {
        this.physics.resume();
        this.anims.resumeAll();
        this.tweens.resumeAll();
      }
    }

    if (this.finalFightActive && this.player && this.player.active) {
      if (time > this.lastGoldenPulseTime + 5000) {
        this.lastGoldenPulseTime = time;
        const chestX = this.player.x;
        const chestY = this.player.y;
        
        const pulseCircle = this.add.graphics();
        pulseCircle.setDepth(2.5); // sit nicely around character depth
        this.tweens.addCounter({
          from: 0,
          to: 40,
          duration: 200,
          onUpdate: (tw) => {
            pulseCircle.clear();
            const val = tw.getValue();
            const alpha = 0.3 * (1 - (val / 40));
            pulseCircle.lineStyle(2, 0xf5c842, alpha);
            pulseCircle.strokeCircle(chestX, chestY, val);
          },
          onComplete: () => {
            pulseCircle.destroy();
          }
        });
      }
    }

    // Set blocking state based on gameInput block key hold or D-Pad action hold, but only if not dashing or bashing
    const wasBlocking = this.isBlocking;
    const isBlockHeld = !!(window.gameInput && window.gameInput.block);
    
    if (isBlockHeld && !this.isDashing && !this.isShieldBashing) {
      const now = this.time.now;
      const blockCooldownRemaining = Math.max(0, 3000 - (now - this.lastBlockTime));
      
      if (blockCooldownRemaining <= 0) {
        if (!wasBlocking) {
          this.isBlocking = true;
          this.blockStartTime = now;
        } else if (now - this.blockStartTime > 2500) {
          // Automatic shield block fatigue / reset after 2.5 seconds hold
          this.isBlocking = false;
          this.lastBlockTime = now;
        }
      } else {
        this.isBlocking = false;
      }
    } else {
      if (wasBlocking) {
        this.isBlocking = false;
        this.lastBlockTime = this.time.now;
      }
    }

    // Sync cooldowns back to React State!
    const strikeCooldownPct = Math.max(0, 800 - (time - this.lastStrikeTime)) / 800;
    const blockCooldownPct = Math.max(0, 3000 - (time - this.lastBlockTime)) / 3000;
    const bashCooldownPct = Math.max(0, 4000 - (time - this.lastBashTime)) / 4000;
    const dashCooldownPct = Math.max(0, 2200 - (time - this.lastDashTime)) / 2200;
    
    if (Math.floor(time) % 4 === 0) { // Throttled updates to prevent lag
      updateReactState({ 
        strikeCooldownPct, 
        blockCooldownPct, 
        bashCooldownPct, 
        dashCooldownPct
      });
    }

    // Redraw spear and shield weapons
    this.drawWeapons();

    if (this.player && this.player.active && (this as any).playerAura) {
      (this as any).playerAura.setPosition(this.player.x, this.player.y);
    }

    this.playerInPool = false; // Reset for overlap checks in the current frame

    // Low HP check for "The forest is with you, Jama"
    if (window.gameState.health < 10 && !this.player.getData('triggeredForestEncouragement')) {
      this.player.setData('triggeredForestEncouragement', true);
      const textObj = this.add.text(this.player.x, this.player.y - 50, "The forest is with you, Jama", {
        fontFamily: '"Space Grotesk", "Courier New", monospace',
        fontSize: '16px',
        color: '#00FFA3',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(200);

      this.tweens.add({
        targets: textObj,
        y: this.player.y - 120,
        alpha: 0,
        duration: 2000,
        onComplete: () => { textObj.destroy(); }
      });
    }

    const isCrouching = !!(window.gameInput as any).crouch;
    if (isCrouching) {
      this.player.setScale(1.0, 0.65);
      this.player.setAlpha(0.65);

      // Crouch Healing Tick inside Shrine level
      let lastCrouchHeal = this.player.getData('lastCrouchHealTime') || 0;
      if (time > lastCrouchHeal + 1000) {
        this.player.setData('lastCrouchHealTime', time);
        if (window.gameState.health < 100) {
          let healRate = 4;
          if (this.difficulty === 'easy') healRate = 5;
          else if (this.difficulty === 'hard') healRate = 2.5;

          const nextHp = Math.min(100, window.gameState.health + healRate);
          updateReactState({ health: nextHp });
          this.showFloatingText(this.player.x, this.player.y - 35, `+${healRate} HP Spirit Mend`, 0x10b981);
        }
      }
    } else {
      this.player.setScale(1.0, 1.0);
      this.player.setAlpha(1.0);
    }

    // Passive regeneration tick logic (runs every 1000ms)
    let lastPassiveRegen = this.player.getData('lastPassiveRegenTime') || 0;
    if (time > lastPassiveRegen + 1000) {
      this.player.setData('lastPassiveRegenTime', time);
      if (window.gameState.health < 100) {
        if (this.finalFightActive) {
          // Constant 4 HP/second with no spacing/proximity checks. No floating text.
          const nextHp = Math.min(100, window.gameState.health + 4);
          updateReactState({ health: nextHp });
        } else if (this.bossPhase === 2 && this.bossPhaseActiveMinionsAlive) {
          // Constant 3 HP/second during wave. No floating text.
          const nextHp = Math.min(100, window.gameState.health + 3);
          updateReactState({ health: nextHp });
        } else {
          // Determine if no enemy exists within 180px
          let noEnemyNearby = true;
          const playerVec = new Phaser.Math.Vector2(this.player.x, this.player.y);
          
          if (this.boss && this.boss.active) {
            if (Phaser.Math.Distance.Between(playerVec.x, playerVec.y, this.boss.x, this.boss.y) < 180) {
              noEnemyNearby = false;
            }
          }
          if (noEnemyNearby && this.guardsGroup) {
            const activeGuards = this.guardsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
            for (const g of activeGuards) {
              if (g.active) {
                if (Phaser.Math.Distance.Between(playerVec.x, playerVec.y, g.x, g.y) < 180) {
                  noEnemyNearby = false;
                  break;
                }
              }
            }
          }

          let rate = 0;
          // Low HP protective double regen (3 HP/sec until HP reaches 25% once triggered)
          if (window.gameState.health < 25 && this.player.getData('triggeredForestEncouragement')) {
            rate = 3;
          } else if (noEnemyNearby) {
            rate = 1.5;
          }

          if (rate > 0) {
            const nextHp = Math.min(100, window.gameState.health + rate);
            updateReactState({ health: nextHp });
            if (rate === 3) {
              this.showFloatingText(this.player.x, this.player.y - 35, `+3 HP Forest Protection`, 0x00FFA3);
            }
          }
        }
      }
    }

    // Mid-fight taunt checks
    const gameplayIntroFinished = this.gameplayStarted;
    if (gameplayIntroFinished && !this.bossIsTaunting && time > this.lastTauntTime + this.nextTauntCooldown) {
      this.bossIsTaunting = true;
      this.bossTauntEndTime = time + 1200; // paused for 1200ms
      this.lastTauntTime = time;
      this.nextTauntCooldown = 30000 + Math.random() * 10000;
      
      const ph1Taunts = [
        "Is that all, little human?",
        "Your sister watches you fail.",
        "The forest abandoned you the moment you stepped in here.",
        "Fight harder. This is boring.",
        "You came all this way... for this?"
      ];
      const ph2Taunts = [
        "ENOUGH.",
        "I will finish this myself.",
        "You should have stayed in your forest.",
        "DIE."
      ];
      const pool = (this.bossPhase === 1) ? ph1Taunts : ph2Taunts;
      let validTaunts = pool.filter(t => t !== this.lastTauntUsed);
      if (validTaunts.length === 0) validTaunts = pool;
      const selected = Phaser.Utils.Array.GetRandom(validTaunts);
      this.lastTauntUsed = selected;

      this.createInstantTauntBubble(selected);
    }

    if (this.bossIsTaunting && time > this.bossTauntEndTime) {
      this.bossIsTaunting = false;
    }

    // Darkness Wave channeling check (Phase 1, and Phase 2 when minions are alive and active / limited in final stretch)
    const canUseWaveInPh1 = (this.bossPhase === 1);
    const canUseWaveInPh2 = (this.bossPhase === 2 && this.bossPhaseActiveMinionsAlive);
    const canUseWaveInFinalStretch = (this.bossPhase === 2 && !this.bossPhaseActiveMinionsAlive && (this.hasOwnProperty('finalStretchWaveCount') ? (this as any).finalStretchWaveCount : 0) < 2);

    const waveCooldown = (this.bossPhase === 1 || !this.bossPhaseActiveMinionsAlive) ? 45000 : 18000;

    if (this.gameplayStarted && (canUseWaveInPh1 || canUseWaveInPh2 || canUseWaveInFinalStretch) && !this.isChannelingDarknessWave && time > this.lastDarknessWaveTime + waveCooldown) {
      // "When a minion is mid-attack telegraph (arm wind-up 600ms): Nkanyamba cannot start a darkness wave during that window. Wait until telegraph resolves first"
      const isAnyMinionTelegraphing = this.guardsGroup.getChildren().some((g: any) => {
        if (!g.active) return false;
        const telEnd = g.getData('telegraphEndTime') || 0;
        return telEnd > 0 && time < telEnd;
      });

      if (!isAnyMinionTelegraphing) {
        this.isChannelingDarknessWave = true;

        // Khwezi recoils away from Nkanyamba
        try {
          const dx = 1050 - this.boss.x;
          const dy = 180 - this.boss.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const recoilDirX = dx / dist;

          // Shifting 6px away over 200ms
          this.tweens.add({
            targets: this,
            khweziRecoilOffset: recoilDirX * 6,
            duration: 200,
            onComplete: () => {
              // Returns over 400ms
              this.tweens.add({
                targets: this,
                khweziRecoilOffset: 0,
                duration: 400
              });
            }
          });

          // Her glow pulses brighter momentarily
          const origMin = this.khweziAlphaMin;
          const origMax = this.khweziAlphaTarget;
          this.khweziAlphaMin = 0.95;
          this.khweziAlphaTarget = 1.35;
          this.time.delayedCall(1500, () => {
            this.khweziAlphaMin = origMin;
            this.khweziAlphaTarget = origMax;
          });
        } catch (e) {
          console.error("Recoil trigger error:", e);
        }
        // 1500ms telegraph for Phase 2, 3500ms for Phase 1
        const warningDuration = (this.bossPhase === 2) ? 1500 : 3500;
        this.darknessWaveChannelEndTime = time + warningDuration;
        this.lastDarknessWaveTime = time;

        if (this.bossPhase === 2 && !this.bossPhaseActiveMinionsAlive) {
          (this as any).finalStretchWaveCount = ((this as any).finalStretchWaveCount || 0) + 1;
        }

        this.channelingWarningText = this.add.text(640, 300, "NKANYAMBA IS CHANNELING... BLOCK!", {
          fontFamily: '"Space Grotesk", "Courier New", monospace',
          fontSize: '14px',
          color: '#FF3B3B',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5).setDepth(200);

        if (window.gameAudio) {
          window.gameAudio.playSfx('boss_phase');
        }
      }
    }

    if (this.isChannelingDarknessWave) {
      this.boss.setVelocity(0, 0);
      this.cameras.main.shake(16, 0.003);
      
      if (time > this.darknessWaveChannelEndTime) {
        this.isChannelingDarknessWave = false;
        if (this.channelingWarningText) {
          this.channelingWarningText.destroy();
        }

        // Setup the 800ms wave duration end time (only for Phase 2, but let's set it for any phase to be safe)
        this.darknessWaveResolveEndTime = time + 800;

        const flashOverlay = this.add.graphics();
        flashOverlay.fillStyle(0xae20ff, 0.6);
        flashOverlay.fillRect(0, 0, 1280, 720);
        flashOverlay.setDepth(200);
        this.tweens.add({
          targets: flashOverlay,
          alpha: 0,
          duration: 400,
          onComplete: () => { flashOverlay.destroy(); }
        });

        if (window.gameAudio) {
          window.gameAudio.playSfx('boss_slam');
        }
        this.cameras.main.shake(400, 0.03);

        let baseDmg = 12;
        if (this.isBlocking) {
          const dmgVal = Math.round(baseDmg * 0.12); // 88% reduction
          this.damagePlayer(dmgVal);
          this.showFloatingText(this.player.x, this.player.y - 45, "DARKNESS CONQUERED! -1HP", 0x00FFA3);
        } else {
          this.damagePlayer(baseDmg);
          this.showFloatingText(this.player.x, this.player.y - 45, "SHADED STRIKE! -12HP", 0xFF3B3B);
        }
      }
    }

    // Sync cutscene/gameplay start state automatically
    if (!this.bossDefeated) {
      this.cutsceneActive = !this.gameplayStarted;
      if (this.gameplayStarted) {
        this.cutsceneComplete = true;
      } else {
        this.cutsceneComplete = false;
      }
    }

    // Gate ALL movement behind cutscene flag
    if (!this.cutsceneComplete || this.cutsceneActive) {
      this.player.setVelocity(0, 0);
      return;
    }

    // Bridge window.gameInput values to the scene's movement flags
    if (window.gameInput) {
      this.moveUp = !!window.gameInput.up;
      this.moveDown = !!window.gameInput.down;
      this.moveLeft = !!window.gameInput.left;
      this.moveRight = !!window.gameInput.right;
    }

    // Read input speed dynamically based on crouching and dashing state
    let baseSpd = this.isDashing ? 450 : (isCrouching ? 75 : 180);
    this.playerSpeed = baseSpd;

    // Read input
    const speed = this.blockActive 
      ? this.playerSpeed * 0.4 
      : this.playerSpeed;

    let vx = 0;
    let vy = 0;

    if (this.moveUp || 
        this.cursors.up.isDown || 
        this.wasd.up.isDown) vy = -speed;
        
    if (this.moveDown || 
        this.cursors.down.isDown || 
        this.wasd.down.isDown) vy = speed;
        
    if (this.moveLeft || 
        this.cursors.left.isDown || 
        this.wasd.left.isDown) vx = -speed;
        
    if (this.moveRight || 
        this.cursors.right.isDown || 
        this.wasd.right.isDown) vx = speed;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    // Apply velocity inside movement flag check block
    if (!this.cutsceneActive && this.cutsceneComplete) {
      this.player.setVelocity(vx, vy);
    } else {
      this.player.setVelocity(0, 0);
    }

    // Face direction
    if (vx < 0) this.player.setFlipX(true);
    if (vx > 0) this.player.setFlipX(false);

    // Dynamic animations and flipping based on movement
    if (vx !== 0 || vy !== 0) {
      const angle = Math.atan2(vy, vx);
      this.player.setData('facingAngle', angle);

      // Lean slightly into movement
      this.player.setRotation((vx / speed) * 0.12);

      if (!this.isAttacking) {
        this.player.play('jama-light-run', true);
      }
    } else {
      if (!this.isAttacking) {
        this.player.play('jama-light-idle', true);
        this.player.setRotation(0);
      }
    }

    // Capture direct Action clicks bound from React Buttons
    if (window.gameInput.attack) {
      window.gameInput.attack = false;
      this.triggerLightAttack();
    }
    if (window.gameInput.dash) {
      window.gameInput.dash = false;
      this.triggerDash();
    }
    if (window.gameInput.power) {
      window.gameInput.power = false;
      this.triggerRadialPowerBurst();
    }

    if (this.bossDefeated) {
      if (this.boss) {
        if (this.boss.active) {
          this.boss.setVelocity(0, 0);
          if (this.boss.body) this.boss.body.enable = false;
        }
      }
      this.telegraphMark.clear();
      this.hazardTelegraphEnd = 0;
      this.isChannelingDarknessWave = false;
      if (this.channelingWarningText) {
        try { this.channelingWarningText.destroy(); } catch (e) {}
      }

      // Hide core darkness vignette in peaceful setup
      if (this.darknessOverlayRender) {
        this.darknessOverlayRender.setVisible(false);
      }

      // Stop dark mist particles
      if (this.darkMistEmitter) {
        try { this.darkMistEmitter.stop(); } catch (e) {}
      }

      // Re-crumple any minions that might have survived or re-enabled
      const guards = this.guardsGroup?.getChildren() as Phaser.Physics.Arcade.Sprite[];
      if (guards) {
        guards.forEach(g => {
          if (g.active) {
            g.setVelocity(0, 0);
            if (g.body) g.body.enable = false;
          }
        });
      }

      // Auto clear and terminate any rogue skull projectiles still floating around
      if (this.projectilesGroup) {
        this.projectilesGroup.clear(true, true);
      }

      // Redraw peaceful elements and neutral boss graphics
      this.drawWeapons();
      this.drawNkanyamba(time);
      this.drawCandles(time);
      this.drawKhwezi(time);
      this.drawCage(time);
      return;
    }

    // 2. Process elite guards coordinates
    const playerC = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const activeMinionsCount = this.guardsGroup.getChildren().filter(g => g.active).length;
    this.bossPhaseActiveMinionsAlive = (this.bossPhase === 2 && activeMinionsCount > 0);

    if (this.bossPhase === 2 && this.nkanyambaMinionsSpawned) {
       if (activeMinionsCount === 0 && this.hadMinionsAlive) {
          this.hadMinionsAlive = false;
          this.lastDarknessWaveTime = 0; // reset wave cooldown
          
          if (window.gameAudio) {
             window.gameAudio.playSfx('boss_phase');
          }

          this.createSpeechBubble(this.boss, "Useless. I will finish this myself.", 'nkanyamba', () => {
             this.time.delayedCall(400, () => {
                this.triggerJamaComebackDialogue();
             });
          });
       }
    }

    const guards = this.guardsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    guards.forEach((g) => {
      if (!g.active) return;

      // Freeze minions during darkness wave telegraph and wave resolution
      const isDarknessWaveActive = this.isChannelingDarknessWave || (this.darknessWaveResolveEndTime && time < this.darknessWaveResolveEndTime);
      if (isDarknessWaveActive) {
         g.setVelocity(0, 0);
         g.setData('telegraphEndTime', 0); // clear casting
         return;
      }

      // Sync static red under-glow with guard sprite position
      const glow = g.getData('glow') as Phaser.GameObjects.Graphics;
      if (glow) {
        glow.setPosition(g.x, g.y);
      }

      const gDist = Phaser.Math.Distance.Between(playerC.x, playerC.y, g.x, g.y);
      const angle = Math.atan2(playerC.y - g.y, playerC.x - g.x);
      
      let speedMultiplier = 1.0;

      if (gDist < 400) {
        // Pursuit movement velocity speed
        g.setVelocity(Math.cos(angle) * 115 * speedMultiplier, Math.sin(angle) * 115 * speedMultiplier);

        // A. Handle melee proximity / contact with 2200ms cooldown (reduced damage based on difficulty and blocks)
        if (gDist < 48) {
          let now = time;
          let lastDmg = g.getData('lastDamageTime') || 0;
          if (now > lastDmg + 2200) {
            g.setData('lastDamageTime', now);
            let baseMinionDmg = 12;
            if (this.difficulty === 'easy') baseMinionDmg = 8;
            else if (this.difficulty === 'hard') baseMinionDmg = 18;

            let dmgVal = this.isBlocking ? Math.max(1, Math.round(baseMinionDmg * 0.12)) : baseMinionDmg;
            let finalDmg = dmgVal;
            if (this.bossPhase === 2 && this.bossPhaseActiveMinionsAlive) {
              finalDmg = Math.max(1, Math.round(dmgVal * 0.25));
            }
            this.damagePlayer(finalDmg);
            this.showFloatingText(this.player.x, this.player.y - 20, this.isBlocking ? `BLOCKED! -${finalDmg}HP` : `MINION HIT -${finalDmg}HP`, 0xff3333);
          }
          g.setVelocity(Math.cos(angle) * -125, Math.sin(angle) * -125); // push away on contact
        }

        // B. Elite guards long-range fire (once every 4.0s with telegraph warning)
        let lastShoot = g.getData('lastShootTime') || 0;
        let telegraphEnd = g.getData('telegraphEndTime') || 0;

        if (gDist >= 110 && gDist <= 380) {
          if (time > lastShoot + 4000) {
            g.setData('telegraphEndTime', time + 600); // 600ms target lock
            g.setData('lastShootTime', time);
            
            // Pulse the wraith white so player knows it is casting
            this.tweens.add({
              targets: g,
              alpha: 0.35,
              yoyo: true,
              duration: 100,
              repeat: 4
            });
          }
        }

        // Fire the projectile skull if telegraph reaches target
        if (telegraphEnd > 0 && time > telegraphEnd) {
          g.setData('telegraphEndTime', 0);
          if (g.active) {
            const proj = this.physics.add.sprite(g.x, g.y, 'projectile');
            this.projectilesGroup.add(proj);
            const fireAngle = Math.atan2(playerC.y - g.y, playerC.x - g.x);
            proj.setVelocity(Math.cos(fireAngle) * 190, Math.sin(fireAngle) * 190);
            
            if (window.gameAudio) {
              window.gameAudio.playSfx('boss_phase');
            }

            this.time.delayedCall(2500, () => {
              if (proj.active) proj.destroy();
            });
          }
        }
      } else {
        g.setVelocity(0, 0);
      }
    });

    // 3. NKANYAMBA COMBAT AI & STATE MACHINE
    const bossDist = Phaser.Math.Distance.Between(playerC.x, playerC.y, this.boss.x, this.boss.y);
    const angleToPlayer = Math.atan2(playerC.y - this.boss.y, playerC.x - this.boss.x);

    // Constant slow float hover tween
    this.boss.y += Math.sin(time * 0.003) * 0.3;

    // Trigger footstep sounds at intervals while moving
    const isMoving = (Math.abs(this.boss.body.velocity.x) > 5 || Math.abs(this.boss.body.velocity.y) > 5);
    if (isMoving) {
      const stepInterval = (this.bossPhase === 1) ? 800 : 450;
      if (time > (this.lastBossFootstepTime || 0) + stepInterval) {
        this.lastBossFootstepTime = time;
        if (window.gameAudio) {
          window.gameAudio.playNkanyambaFootstep();
        }
      }
    }

    if (this.bossIsStaggered) {
      this.boss.setVelocity(0, 0);
      if (time > this.bossStaggerEndTime) {
        this.bossIsStaggered = false;
      }
    } else if (this.bossPhase === 1) {
      // Phase 1: Slow, lumbering movement (speed 45) toward player
      this.boss.setVelocity(Math.cos(angleToPlayer) * 45, Math.sin(angleToPlayer) * 45);

      if (time > this.lastBossAttackTime + 3500) {
        if (Math.random() > 0.5) {
          this.executeBossSlamAttack(playerC);
        } else {
          this.executeBossScatterProjectiles(angleToPlayer);
        }
      }
    } else {
      // Phase 2: Stay static in far corner if minions are alive, otherwise pursue at speed 85
      if (this.bossPhaseActiveMinionsAlive) {
        this.boss.setVelocity(0, 0);
        this.boss.setPosition(1100, 150);
      } else {
        const currentSpeed = 85;
        this.boss.setVelocity(Math.cos(angleToPlayer) * currentSpeed, Math.sin(angleToPlayer) * currentSpeed);
      }

      // Attack selections in Phase 2 - only if no Phase 2 minions are alive!
      if (!this.bossPhaseActiveMinionsAlive) {
         if (time > this.lastBossAttackTime + 2800) {
           const rng = Math.random();
           if (rng > 0.7 && !this.finalFightActive) {
             this.executeBossTeleportShroud();
           } else if (rng > 0.4) {
             this.executeBossScatterProjectiles(angleToPlayer);
           } else {
             this.executeBossSlamAttack(playerC);
           }
         }
      }

      // Melee Contact Damage & Step Back checks
      if (this.boss && this.boss.active) {
         if (bossDist < 55) {
            if (this.bossPhase === 2 && this.bossPhaseActiveMinionsAlive) {
               // Rule: If Jama walks directly into him: no damage is dealt — he steps back 5px (he is directing, not fighting)
               const pushAngle = Math.atan2(this.boss.y - this.player.y, this.boss.x - this.player.x);
               this.boss.x += Math.cos(pushAngle) * 5;
               this.boss.y += Math.sin(pushAngle) * 5;
            } else {
               // Melee hits enabled (Phase 1, or Phase 2 when minions are dead)
               let now = time;
               let lastBossMeleeDmg = this.boss.getData('lastMeleeDamageTime') || 0;
               if (now > lastBossMeleeDmg + 1500) {
                  this.boss.setData('lastMeleeDamageTime', now);
                  let baseBossMeleeDmg = 15;
                  if (this.difficulty === 'easy') baseBossMeleeDmg = 10;
                  else if (this.difficulty === 'hard') baseBossMeleeDmg = 22;

                  const dmgVal = this.isBlocking ? Math.max(1, Math.round(baseBossMeleeDmg * 0.12)) : baseBossMeleeDmg;
                  this.damagePlayer(dmgVal);
                  this.showFloatingText(this.player.x, this.player.y - 20, this.isBlocking ? `BLOCKED! -${dmgVal}HP` : `NKANYAMBA HIT -${dmgVal}HP`, 0xff3333);
               }
               const pushAngle = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x);
               this.player.x += Math.cos(pushAngle) * 10;
               this.player.y += Math.sin(pushAngle) * 10;
            }
         }
      }

      // Phase 2 New attack: Summoning hazard pools dynamically under player's feet (every 6000ms: places active dark pool, telegraph warning of 1500ms)
      if (time > (this.lastHazardPoolSpawnTime || 0) + 6000) {
        this.lastHazardPoolSpawnTime = time;
        this.hazardTelegraphX = this.player.x;
        this.hazardTelegraphY = this.player.y;
        this.hazardTelegraphEnd = time + 1500;

        // Animate arms raise
        this.bossTelegraphTick = time + 1500;

        this.time.delayedCall(1500, () => {
          if (this.poolsGroup && this.poolsGroup.active) {
            const pool = this.poolsGroup.create(this.hazardTelegraphX, this.hazardTelegraphY, 'dark-pool').setScale(1.2);
            pool.setBodySize(68, 68);
            pool.refreshBody();

            // Emit violent portal particles
            const portalSplat = this.add.particles(this.hazardTelegraphX, this.hazardTelegraphY, 'part-violet', {
              scale: { start: 0.8, end: 0 },
              alpha: { start: 0.7, end: 0 },
              speed: 100,
              lifespan: 500,
              maxParticles: 15,
            });
            this.time.delayedCall(1000, () => { portalSplat.destroy(); });
          }
          this.hazardTelegraphEnd = 0;
        });
      }
    }

    // Record trail history for faint shadow trail behind him (visual trail in Phase 2)
    if (this.bossPhase === 2 && time > (this.lastTrailRecordTime || 0) + 120) {
      this.lastTrailRecordTime = time;
      this.bossTrailHistory.push({ x: this.boss.x, y: this.boss.y });
      if (this.bossTrailHistory.length > 5) {
        this.bossTrailHistory.shift();
      }
    }

    // Process telegraph graphics fading
    this.telegraphMark.clear();
    
    // 1. Basic slam telegraph warning
    if (time < this.bossTelegraphTick) {
      const remaining = this.bossTelegraphTick - time;
      this.telegraphMark.lineStyle(2.5, 0xff0000, 0.45);
      this.telegraphMark.fillStyle(0xcc0000, 0.12 + (1 - remaining/1200) * 0.2);
      this.telegraphMark.fillCircle(this.boss.x, this.boss.y, 140);
      this.telegraphMark.strokeCircle(this.boss.x, this.boss.y, 140);
    }

    // 2. Custom hazard pool telegraph warning (pulsing violet circle)
    if (this.hazardTelegraphEnd && time < this.hazardTelegraphEnd) {
      const remainingPool = this.hazardTelegraphEnd - time;
      let ratio = 1.0 - (remainingPool / 1500);
      this.telegraphMark.lineStyle(2.0, 0x8a2be2, 0.65);
      this.telegraphMark.fillStyle(0x4b0082, 0.15 + ratio * 0.25);
      this.telegraphMark.fillCircle(this.hazardTelegraphX, this.hazardTelegraphY, 60 * ratio);
      this.telegraphMark.strokeCircle(this.hazardTelegraphX, this.hazardTelegraphY, 60);
    }

    // Emit golden sparks when active
    if (this.sparkEmitterActive && time > this.lastSparkTick) {
      this.lastSparkTick = time + 22; // approx 45 sparks / sec
      this.radialParticles.emitParticleAt(this.boss.x + Phaser.Math.Between(-28, 28), this.boss.y + Phaser.Math.Between(-35, 35), 1);
    }

    // Phase 2 Darkness overlay vignette, red pulse, and sluggish mist
    if (this.bossPhase === 2 && this.darknessOverlayRender) {
      this.darknessOverlayRender.setVisible(true);
      this.darknessOverlayRender.clear();
      this.darknessOverlayRender.fill(0x000000, 1.0); // Pitch-black
      
      // Punch a hole around player
      this.darknessOverlayRender.draw(this.lightMaskImageShrine, this.player.x, this.player.y);

      // Red pulse check
      if (time > (this.lastRedPulseTime || 0) + 3500) {
        this.lastRedPulseTime = time;
        
        const pulseG = this.add.graphics();
        pulseG.setDepth(3.4); // sit just below the pitch black vignette
        pulseG.lineStyle(4, 0xff0000, 0.6);
        pulseG.strokeCircle(this.boss.x, this.boss.y, 10);
        
        this.tweens.add({
          targets: pulseG,
          scaleX: 15,
          scaleY: 15,
          alpha: 0,
          duration: 1500,
          onComplete: () => { pulseG.destroy(); }
        });
      }

      // Sluggish mist check
      if (!this.hasSpawnedDarkMist) {
        this.hasSpawnedDarkMist = true;
        this.darkMistEmitter = this.add.particles(640, 680, 'part-violet', {
          scale: { start: 1.2, end: 2.5 },
          alpha: { start: 0.05, end: 0 },
          speedX: { min: -40, max: 40 },
          speedY: { min: -10, max: -5 },
          lifespan: 4000,
          frequency: 200,
          blendMode: 'NORMAL',
          emitZone: {
            type: 'random',
            source: new Phaser.Geom.Rectangle(-640, -10, 1280, 20)
          }
        });
        this.darkMistEmitter.setDepth(1.8); // below player sprite
      }
    } else if (this.darknessOverlayRender) {
      this.darknessOverlayRender.setVisible(false);
    }

    // Redraw the gorgeous custom modular stickman and shadow elements in real-time
    this.drawNkanyamba(time);
    this.drawCandles(time);
    this.drawKhwezi(time);
    this.drawCage(time);
  }

  triggerLightAttack() {
    if (this.isAttacking) return;
    const now = this.time.now;
    if (now - this.lastStrikeTime < 800) return; // Attack cooldown boundary
    this.isAttacking = true;
    this.lastStrikeTime = now;

    if (window.gameAudio) window.gameAudio.playSfx('attack');

    const originalRot = this.player.getData('facingAngle') ?? 0;
    const lungeX = Math.cos(originalRot) * 55;
    const lungeY = Math.sin(originalRot) * 55;

    // Play attack spritesheet frame flow
    this.player.play('jama-light-attack', true);
    
    // Rotate character fully in line with attack direction momentarily
    this.player.setRotation(originalRot);

    // Rapid electrical thrust tween
    this.tweens.add({
      targets: this.player,
      x: this.player.x + lungeX,
      y: this.player.y + lungeY,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.isAttacking = false;
        if (this.player && this.player.active) {
          this.player.setRotation(0);
        }
      },
    });

    // Extended melee range (85px)
    const reach = 100;
    const dmg = 35;

    // Attack Boss
    const bDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
    if (bDist < reach) {
      const angle = Math.atan2(this.boss.y - this.player.y, this.boss.x - this.player.x);
      const diff = Phaser.Math.Angle.ShortestBetween(originalRot, angle);
      if (Math.abs(diff) < 1.4) {
        this.damageBoss(dmg, lungeX * 0.3, lungeY * 0.3);
      }
    }

    // Attack elite guards
    this.guardsGroup.getChildren().forEach((node) => {
      const guard = node as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, guard.x, guard.y);
      if (dist < reach) {
        const angle = Math.atan2(guard.y - this.player.y, guard.x - this.player.x);
        const diff = Phaser.Math.Angle.ShortestBetween(originalRot, angle);
        if (Math.abs(diff) < 1.4) {
          this.hitGuard(guard, dmg, lungeX * 0.4, lungeY * 0.4);
        }
      }
    });
  }

  triggerRadialPowerBurst() {
    // POWER Action button has an 8-second cooldown (handled in React display, checked here)
    if (window.gameAudio) {
      window.gameAudio.playSfx('power');
    }

    // Golden magic shockwave flash
    this.cameras.main.flash(200, 255, 230, 100);

    // Emit blast particles
    this.radialParticles.emitParticleAt(this.player.x, this.player.y, 45);

    // Damage all entities inside 175px radius
    const burstDmg = 90;

    // Boss damage
    const bDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
    if (bDist < 190) {
      this.damageBoss(burstDmg, 0, 0);
    }

    // Elite guards
    this.guardsGroup.getChildren().forEach((node) => {
      const guard = node as Phaser.Physics.Arcade.Sprite;
      const gDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, guard.x, guard.y);
      if (gDist < 190) {
        this.hitGuard(guard, burstDmg, (guard.x - this.player.x)*0.3, (guard.y - this.player.y)*0.3);
      }
    });

    // Gold shockwave glowing rings
    const blastCirc = this.add.graphics();
    this.tweens.addCounter({
      from: 10,
      to: 180,
      duration: 500,
      onUpdate: (twValue) => {
        blastCirc.clear();
        blastCirc.lineStyle(6, 0xffea60, 1 - (twValue.getValue() / 180));
        blastCirc.strokeCircle(this.player.x, this.player.y, twValue.getValue());
      },
      onComplete: () => {
        blastCirc.destroy();
      },
    });
  }

  triggerDash() {
    const now = this.time.now;
    this.dashCooldown = 2200; // 2.2s as specified
    if (now - this.lastDashTime < this.dashCooldown) return;
    this.lastDashTime = now;
    this.isDashing = true;

    if (window.gameAudio) window.gameAudio.playSfx('dash');

    this.tweens.add({
      targets: this.player,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
      repeat: 1,
    });

    // 3 translucent ghost copies at 40ms, 80ms, 120ms
    [40, 80, 120].forEach((delay) => {
      this.time.delayedCall(delay, () => {
        if (this.player && this.player.active) {
          const ghost = this.add.sprite(this.player.x, this.player.y, this.player.texture.key, this.player.frame.name);
          ghost.setFlipX(this.player.flipX);
          ghost.setAlpha(0.35);
          ghost.setDepth(1.85);
          ghost.setRotation(this.player.rotation);
          ghost.setTint(0x00FFA3);
          this.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 250,
            onComplete: () => ghost.destroy()
          });
        }
      });
    });

    this.time.delayedCall(220, () => { // 220ms duration as requested
      this.isDashing = false;
    });

    // Notify React of cooldown overlay ticks
    updateReactState({ lastDashTime: now, dashCooldown: this.dashCooldown });
  }

  executeBossSlamAttack(playerCoord: Phaser.Math.Vector2) {
    this.lastBossAttackTime = this.time.now;
    this.bossTelegraphTick = this.time.now + 1200; // 1.2s warning

    // Anchor boss velocity during tell
    this.boss.setVelocity(0, 0);

    this.time.delayedCall(1200, () => {
      if (!this.boss.active) return;
      this.telegraphMark.clear();

      if (window.gameAudio) window.gameAudio.playSfx('boss_slam');
      this.cameras.main.shake(300, 0.025);

      // Radial shock purple particles
      this.add.particles(this.boss.x, this.boss.y, 'part-violet', {
        scale: { start: 1.2, end: 0 },
        speed: 210,
        lifespan: 500,
        maxParticles: 35,
      });

      // Confirm hit on player within 140px radius slam
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
      if (dist < 142) {
        this.damagePlayer(25);
      }
    });
  }

  executeBossScatterProjectiles(angleToPlayer: number) {
    this.lastBossAttackTime = this.time.now;
    
    if (window.gameAudio) window.gameAudio.playSfx('boss_phase');

    // Scatter 3 projectle skull orbs in a spread pattern
    const angles = [angleToPlayer - 0.26, angleToPlayer, angleToPlayer + 0.26];
    angles.forEach((ang) => {
      const proj = this.physics.add.sprite(this.boss.x, this.boss.y, 'projectile');
      this.projectilesGroup.add(proj);
      proj.setVelocity(Math.cos(ang) * 220, Math.sin(ang) * 220);

      this.time.delayedCall(3000, () => {
        if (proj.active) proj.destroy();
      });
    });
  }

  executeBossTeleportShroud() {
    this.lastBossAttackTime = this.time.now;
    this.boss.setVelocity(0, 0);

    // Become translucent shroud
    this.tweens.add({
      targets: this.boss,
      alpha: 0.1,
      duration: 350,
      onComplete: () => {
        if (!this.boss.active) return;
        // Shift to a random coordinates far from player spacing
        let randomX = 200 + Math.random() * 880;
        let randomY = 150 + Math.random() * 400;

        while (Phaser.Math.Distance.Between(randomX, randomY, this.player.x, this.player.y) < 220) {
          randomX = 200 + Math.random() * 880;
          randomY = 150 + Math.random() * 400;
        }

        this.boss.setPosition(randomX, randomY);

        // materialise
        this.tweens.add({
          targets: this.boss,
          alpha: 1.0,
          duration: 350,
        });
      },
    });
  }

  damageBoss(amount: number, pushX: number, pushY: number) {
    if (this.bossDefeated || window.gameState.isGameOver || window.gameState.gameCompleted) return;

    if (window.gameAudio) window.gameAudio.playSfx('hit');

    // Embezzle dark blood splash particles
    this.impactParticles.emitParticleAt(this.boss.x, this.boss.y, 8);

    this.boss.x += pushX;
    this.boss.y += pushY;

    // Apply flash red to boss sprite
    this.tweens.add({
      targets: this.boss,
      tint: 0xff0000,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        if (this.boss.active) {
          this.boss.setTint(0x8B1A1A); // Restore base enemy tint
        }
      },
    });

    const nextHp = Math.max(0, this.bossHealth - amount);
    this.bossHealth = nextHp;
    updateReactState({ bossHealth: nextHp });

    if (this.bossPhase === 2 && !this.bossPhaseActiveMinionsAlive && !this.hasSaidDieTaunt) {
      this.hasSaidDieTaunt = true;
      this.createSpeechBubble(this.boss, "Why won't you just... die.", 'nkanyamba', () => {});
    }

    // Nkanyamba Phase Transition: Dropping below 50% HP (300 / 600)
    if (this.bossPhase === 1 && nextHp <= 300) {
      this.triggerPhase2Transition();
    } else if (nextHp <= 0 && !this.bossDefeated) {
      this.triggerVictory();
    }
  }

  hitGuard(guard: Phaser.Physics.Arcade.Sprite, damage: number, pushX: number, pushY: number) {
    if (window.gameAudio) window.gameAudio.playSfx('hit');

    // Trigger physical red sparks on guard hit/damage!
    this.impactParticles.emitParticleAt(guard.x, guard.y, 15);

    guard.x += pushX;
    guard.y += pushY;

    let hp = guard.getData('hp') - damage;
    guard.setData('hp', hp);

    // Standard white tint flash on receiving hit
    this.tweens.add({
      targets: guard,
      tint: 0xffffff,
      duration: 120,
      yoyo: true,
      onComplete: () => {
        if (guard.active) {
          guard.setTint(0x8B1A1A); // Restore base enemy tint
        }
      },
    });

    if (hp <= 0) {
      // 1. Immediately disable his body to prevent further collisions or damage ticks
      guard.disableBody(true, false);

      // 2. Perform gorgeous visual dissolving scale-down and fade over exactly 350ms
      this.tweens.add({
        targets: guard,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        angle: 180,
        duration: 350,
        onComplete: () => {
          guard.destroy();

          // 3. Spawns alternating replacement from queue
          if (this.pendingReplacementSpawns > 0) {
            this.pendingReplacementSpawns--;
            let spawnX = this.nextSpawnSideLeft ? 250 : 1030;
            this.nextSpawnSideLeft = !this.nextSpawnSideLeft;
            this.spawnGuard(spawnX, 480);
          }
        },
      });

      if ((window as any).incrementEnemiesDefeated) {
        (window as any).incrementEnemiesDefeated(1);
      }
      updateReactState({ score: window.gameState.score + 150 });
    }
  }

  damagePlayer(amount: number) {
    if ((this as any).jamaInvulnerable) return;
    if (window.gameState.isGameOver || window.gameState.gameCompleted) return;

    // Dash 150ms invincibility iframe check
    if (this.isDashing && (this.time.now - this.lastDashTime < 150)) {
      return;
    }

    if (window.gameAudio) window.gameAudio.playSfx('hurt');

    this.cameras.main.shake(200, 0.018);
    this.impactParticles.emitParticleAt(this.player.x, this.player.y, 6);

    this.tweens.add({
      targets: this.player,
      tint: 0xff0000,
      duration: 150,
      yoyo: true,
      onComplete: () => { this.player.clearTint(); },
    });

    // Apply difficulty modifiers for boss fight too
    const diff = (window.gameState.difficulty || 'medium').toLowerCase();
    let finalAmt = Math.round(amount * (diff === 'hard' ? 1.35 : (diff === 'medium' ? 1.0 : 0.72)));
    if (this.finalFightActive) {
      finalAmt = Math.max(1, Math.round(finalAmt * 0.8));
    }

    const nextHp = Math.max(0, window.gameState.health - finalAmt);
    updateReactState({ health: nextHp });

    if (nextHp <= 20 && !this.khweziDistressTriggered) {
      this.khweziDistressTriggered = true;
      this.khweziDoubleSway = true;
      this.khweziAlphaMin = 0.5;
      this.showFloatingText(1050, 150, "Hold on, Jama...", 0xaaccff);
    }

    if (nextHp <= 0) {
      this.triggerPlayerDeath();
    }
  }

  playSound(freq: number, duration: number, startGain: number, type: 'linear' | 'exponential' = 'linear') {
    try {
      if (window.gameAudio && (window.gameAudio as any).ctx) {
        const ctx: AudioContext = (window.gameAudio as any).ctx;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        
        gainNode.gain.setValueAtTime(startGain, now);
        if (type === 'linear') {
          gainNode.gain.linearRampToValueAtTime(0.001, now + (duration / 1000));
        } else {
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + (duration / 1000));
        }
        
        osc.connect(gainNode);
        if ((window.gameAudio as any).sfxVolume) {
          gainNode.connect((window.gameAudio as any).sfxVolume);
        } else {
          gainNode.connect(ctx.destination);
        }
        osc.start(now);
        osc.stop(now + (duration / 1000));
      }
    } catch(e) {
      console.warn("playSound error:", e);
    }
  }

  playLockRattleSound() {
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 100, () => {
        this.playSound(820, 80, 0.1, 'linear');
      });
    }
  }

  playChainSnapSound() {
    try {
      if (window.gameAudio && (window.gameAudio as any).ctx) {
        const ctx: AudioContext = (window.gameAudio as any).ctx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.2);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 0.4);
        
        osc.connect(gainNode);
        if ((window.gameAudio as any).sfxVolume) gainNode.connect((window.gameAudio as any).sfxVolume);
        else gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch(e) {}
  }

  playWarmResolutionSound() {
    try {
      if (window.gameAudio && (window.gameAudio as any).ctx) {
        const ctx: AudioContext = (window.gameAudio as any).ctx;
        const now = ctx.currentTime;
        const freqs = [440, 528];
        freqs.forEach(f => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          
          gainNode.gain.setValueAtTime(0.001, now);
          gainNode.gain.linearRampToValueAtTime(0.06, now + 0.8);
          gainNode.gain.setValueAtTime(0.06, now + 2.8);
          gainNode.gain.linearRampToValueAtTime(0.001, now + 4.3);
          
          osc.connect(gainNode);
          if ((window.gameAudio as any).sfxVolume) gainNode.connect((window.gameAudio as any).sfxVolume);
          else gainNode.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 4.5);
        });
      }
    } catch(e) {}
  }

  myCustomBossDefeatedSequence() {
    try {
      this.bossDefeated = true;
      this.gameplayStarted = false; // Freeze gameplay ticks

      // Stop boss ambient drone immediately
      if (window.gameAudio) {
        try { window.gameAudio.stopBossDrone(); } catch(e) {}
      }

      // 1. Immediately:
      this.nkanyambaAIActive = false;
      if (this.boss) {
        this.boss.setVelocity(0, 0);
        this.tweens.killTweensOf(this.boss);
      }
      
      // Disable minion spawning permanently
      (this as any).minionsSpawnTimerEnabled = false;
      if ((this as any).minionSpawnEvent) {
        try { (this as any).minionSpawnEvent.destroy(); } catch(e) {}
      }

      // Freeze and crumple minions
      if (this.guardsGroup) {
        this.guardsGroup.getChildren().forEach((g: any) => {
          if (g.active) {
            g.setVelocity(0, 0);
            if (g.body) g.body.enable = false;
            this.tweens.add({
              targets: g,
              scaleY: 0.25,
              alpha: 0.4,
              duration: 500,
              ease: 'Quad.easeOut'
            });
          }
        });
      }

      // Slow motion beat (cinematic weight)
      this.time.timeScale = 0.25;
      if (this.physics && this.physics.world) {
        this.physics.world.timeScale = 4.0;
      }
      
      this.time.delayedCall(600, () => {
        this.time.timeScale = 1.0;
        if (this.physics && this.physics.world) {
          this.physics.world.timeScale = 1.0;
        }
      });

      // Nkanyamba stagger (600ms)
      this.nkanyambaFlickerGrey = true;
      this.nkanyambaErraticEye = true;
      
      this.tweens.add({
        targets: this,
        nkanyambaStaggerX: 8,
        duration: 80,
        yoyo: true,
        repeat: 7, // ~640ms stagger
        onComplete: () => {
          this.nkanyambaStaggerX = 0;
          this.nkanyambaFlickerGrey = false;
          this.nkanyambaErraticEye = false;

          // Start Nkanyamba collapse animation (1500ms)
          this.playSound(30, 2500, 0.15, 'linear');
          
          // Particles: dark smoke particles (6) rise from collapsed form
          this.time.delayedCall(200, () => {
            try {
              for (let i = 0; i < 6; i++) {
                this.time.delayedCall(i * 150, () => {
                  if (!this.boss) return;
                  const smoke = this.add.graphics();
                  smoke.fillStyle(0x0a0005, 0.6);
                  smoke.fillCircle(this.boss.x + Phaser.Math.Between(-30, 30), this.boss.y + 40, Phaser.Math.Between(8, 15));
                  smoke.setDepth(1.9);
                  this.tweens.add({
                    targets: smoke,
                    y: smoke.y - 50,
                    alpha: 0,
                    scale: 1.5,
                    duration: 1500,
                    onComplete: () => smoke.destroy()
                  });
                });
              }
            } catch(e) {}
          });

          // Streaks drain to grey #555555
          this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 1200,
            onUpdate: () => {
              this.nkanyambaStreaksColor = 0x555555;
            }
          });

          // Tilt 0 to 90
          this.tweens.add({
            targets: this,
            nkanyambaRot: 90,
            duration: 1000,
            ease: 'Cubic.easeIn'
          });

          // Move downward 15px
          this.tweens.add({
            targets: this,
            nkanyambaYOffset: 15,
            duration: 1000,
            ease: 'Cubic.easeIn'
          });

          // Arms droop: 0 to 90 degrees
          this.tweens.add({
            targets: this,
            nkanyambaArmAngle: 90,
            duration: 800,
            ease: 'Quad.easeOut'
          });

          // Left eye flickering 1 -> 0 over 600ms
          this.tweens.add({
            targets: this,
            nkanyambaLeftEyeAlpha: 0,
            duration: 600,
            ease: (v: number) => {
              const flicker = Math.random() > 0.4 ? 1 : 0;
              return (1 - v) * flicker;
            }
          });

          // Right eye flickering 1 -> 0 over 900ms
          this.tweens.add({
            targets: this,
            nkanyambaRightEyeAlpha: 0,
            duration: 900,
            ease: (v: number) => {
              const flicker = Math.random() > 0.3 ? 1 : 0;
              return (1 - v) * flicker;
            }
          });

          // Final alpha entire figure fades to 0.25 over 1500ms
          this.tweens.add({
            targets: this,
            nkanyambaAlpha: 0.25,
            duration: 1500,
            onComplete: () => {
              this.time.delayedCall(500, () => {
                // Show floating text center screen: "THE SPIRIT HAS FALLEN"
                const fallenText = this.add.text(640, 360, "THE SPIRIT HAS FALLEN", {
                  fontFamily: '"Space Grotesk", "Courier New", Courier, monospace',
                  fontSize: '16px',
                  color: '#00FFA3',
                  stroke: '#000000',
                  strokeThickness: 3,
                  fontStyle: 'bold'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

                this.tweens.add({
                  targets: fallenText,
                  y: 310,
                  alpha: 0,
                  duration: 2000,
                  onComplete: () => {
                    fallenText.destroy();
                    this.returnPlayerControlAndSanctuaryContext();
                  }
                });
              });
            }
          });
        }
      });
      
    } catch (e) {
      console.error("Collapse sequence error:", e);
      this.forceVictoryScreen();
    }
  }

  returnPlayerControlAndSanctuaryContext() {
    try {
      this.cutsceneActive = false;
      this.cutsceneComplete = true;
      this.gameplayStarted = true;
      if (this.input) this.input.enabled = true;

      const disabledButton = {
        alpha: 0.3,
        input: { enabled: false },
        setAlpha: function(a: number) { this.alpha = a; }
      };
      (this as any).strikeButton = disabledButton;
      (this as any).blockButton = disabledButton;
      (this as any).bashButton = disabledButton;
      (this as any).powerButton = disabledButton;
      (this as any).dashButton = disabledButton;

      this.moveUp = false;
      this.moveDown = false;
      this.moveLeft = false;
      this.moveRight = false;
      
      if (this.player && this.player.body) {
        this.player.body.enable = true;
        this.player.setVelocity(0, 0);
      }

      // Re-register NAV button listeners freshly
      const navButtons = [
        { btn: this.upButton, flag: 'moveUp' },
        { btn: this.downButton, flag: 'moveDown' },
        { btn: this.leftButton, flag: 'moveLeft' },
        { btn: this.rightButton, flag: 'moveRight' }
      ];

      navButtons.forEach(item => {
        if (item.btn) {
          try {
            item.btn.removeAllListeners();
            item.btn.on('pointerdown', () => { (this as any)[item.flag] = true; });
            item.btn.on('pointerup', () => { (this as any)[item.flag] = false; });
            item.btn.on('pointerout', () => { (this as any)[item.flag] = false; });
            if (item.btn.setAlpha) item.btn.setAlpha(1.0);
          } catch(e) {}
        }
      });

      updateReactState({
        bossDefeated: true,
        combatDisabled: true,
        playerNearCage: false,
        rescueComplete: false
      });

    } catch (e) {
      console.error("Error in returnPlayerControlAndSanctuaryContext:", e);
    }
  }

  triggerBreakLockSequence() {
    try {
      this.rescueSequenceActive = true;
      this.gameplayStarted = false;
      if (this.player && this.player.body) {
        this.player.setVelocity(0, 0);
        this.player.play('jama-light-idle', true);
      }
      this.input.enabled = false;

      // Phase A: Lock rattle (300ms)
      this.playLockRattleSound();
      
      this.tweens.add({
        targets: this.cageLock,
        x: '+=4',
        duration: 50,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          if (this.cageLock) this.cageLock.x = 1050; // restore
          
          // Phase B: Chain snaps (400ms)
          this.playChainSnapSound();
          if (this.cageChain) {
            this.cageChain.forEach((ch: any) => {
              ch.color = 0xff3a3a;
            });
          }

          this.tweens.add({
            targets: this.cageChain,
            x: '+=6',
            duration: 60,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
              if (this.cageChain) {
                this.cageChain.forEach((ch: any) => {
                  ch.x = ch.origX || ch.x;
                });
              }

              // Phase C: Barriers fracture (700ms)
              this.tweens.addCounter({
                from: 500,
                to: 100,
                duration: 400,
                onUpdate: (tw) => {
                  this.playSound(tw.getValue(), 50, 0.05, 'linear');
                }
              });

              this.cageGlowTint = 0xFF7700;

              if (this.cageBars) {
                this.cageBars.forEach((bar: any) => {
                  bar.alpha = 0.8;
                  this.tweens.add({
                    targets: bar,
                    alpha: 0.2,
                    duration: 80,
                    yoyo: true,
                    repeat: 8
                  });
                });
              }

              this.time.delayedCall(700, () => {
                // Phase D: White liberation wave (1000ms)
                this.cameras.main.flash(350, 255, 255, 255);
                this.playWarmResolutionSound();

                this.triggerCageDestruction();

                this.time.delayedCall(1000, () => {
                  this.rescueComplete = true;
                  updateReactState({ rescueComplete: true });
                  this.runReunionAndEndingSequence();
                });
              });
            }
          });
        }
      });
    } catch (e) {
      console.error("Lock break sequence failure:", e);
      this.forceVictoryScreen();
    }
  }

  createCustomDialogueBubble(
    character: any,
    fullText: string,
    speakerKey: 'jama' | 'khwezi',
    onComplete: () => void
  ) {
    const gameWidth = 1280;
    const gameHeight = 720;
    const bubbleWidth = 300;
    const bubbleHeight = 90;

    let bx = character.x;
    let by = character.y + 70;

    if (bx + bubbleWidth / 2 > gameWidth - 10) {
      bx = gameWidth - bubbleWidth / 2 - 10;
    }
    if (bx - bubbleWidth / 2 < 10) {
      bx = bubbleWidth / 2 + 10;
    }
    if (by + bubbleHeight > gameHeight - 10) {
      by = character.y - bubbleHeight - 30;
    }

    const bubbleContainer = this.add.container(bx, by);
    bubbleContainer.setDepth(200); // Sit above absolutely everything else

    const graphics = this.add.graphics();
    bubbleContainer.add(graphics);

    const isJama = (speakerKey === 'jama');
    const bgColor = isJama ? 0x000d05 : 0x000508;
    const strokeColor = isJama ? 0x00ffa3 : 0xaaccff;
    const plateColor = isJama ? '#00ffa3' : '#aaccff';
    const textColor = isJama ? '#00ffa3' : '#aaccff';
    const plateText = isJama ? "JAMA" : "KHWEZI";

    const actualIsBelow = by > character.y;

    // 1. Draw soft outer glow shadow layers
    for (let g = 1; g <= 5; g++) {
      graphics.lineStyle(g * 3, strokeColor, 0.08 / g);
      if (actualIsBelow) {
        graphics.strokeRoundedRect(-bubbleWidth / 2 - g * 1.5, -g * 1.5, bubbleWidth + g * 3, bubbleHeight + g * 3, 8);
      } else {
        graphics.strokeRoundedRect(-bubbleWidth / 2 - g * 1.5, -bubbleHeight - g * 1.5, bubbleWidth + g * 3, bubbleHeight + g * 3, 8);
      }
    }

    // 2. Draw solid background rounded rect & sharp border
    graphics.fillStyle(bgColor, 1.0);
    graphics.lineStyle(2, strokeColor, 1.0);
    if (actualIsBelow) {
      graphics.fillRoundedRect(-bubbleWidth / 2, 0, bubbleWidth, bubbleHeight, 8);
      graphics.strokeRoundedRect(-bubbleWidth / 2, 0, bubbleWidth, bubbleHeight, 8);
    } else {
      graphics.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);
      graphics.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);
    }

    // 3. Draw speech tail
    graphics.fillStyle(bgColor, 1.0);
    graphics.beginPath();
    if (actualIsBelow) {
      // points UPWARD toward character
      graphics.moveTo(-10, 0);
      graphics.lineTo(10, 0);
      graphics.lineTo(0, -18);
    } else {
      // points DOWNWARD
      graphics.moveTo(-10, 0);
      graphics.lineTo(10, 0);
      graphics.lineTo(0, 18);
    }
    graphics.closePath();
    graphics.fillPath();

    graphics.lineStyle(2, strokeColor, 1.0);
    graphics.beginPath();
    if (actualIsBelow) {
      graphics.moveTo(-10, 0);
      graphics.lineTo(0, -18);
      graphics.lineTo(10, 0);
    } else {
      graphics.moveTo(-10, 0);
      graphics.lineTo(0, 18);
      graphics.lineTo(10, 0);
    }
    graphics.strokePath();

    // Mask to erase line inside border margin of tail base
    graphics.lineStyle(3.5, bgColor, 1.0);
    if (actualIsBelow) {
      graphics.lineBetween(-8, 1, 8, 1);
    } else {
      graphics.lineBetween(-8, -1, 8, -1);
    }

    // 4. Draw thin boundary separator line below name plate
    graphics.lineStyle(1, strokeColor, 0.7);
    if (actualIsBelow) {
      graphics.lineBetween(-bubbleWidth / 2 + 18, 22, bubbleWidth / 2 - 18, 22);
    } else {
      graphics.lineBetween(-bubbleWidth / 2 + 18, -bubbleHeight + 22, bubbleWidth / 2 - 18, -bubbleHeight + 22);
    }

    // 5. Speaker Name Plate Accent inside bubble
    const namePlateY = actualIsBelow ? 7 : -bubbleHeight + 7;
    const namePlate = this.add.text(-bubbleWidth / 2 + 18, namePlateY, plateText, {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '11px',
      color: plateColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    bubbleContainer.add(namePlate);

    // 6. Create the dialogue text text element
    const dialogueTextY = actualIsBelow ? 28 : -bubbleHeight + 28;
    const txt = this.add.text(-bubbleWidth / 2 + 18, dialogueTextY, "", {
      fontFamily: '"Space Grotesk", "Courier New", Courier, monospace',
      fontSize: '13px',
      color: textColor,
      wordWrap: { width: bubbleWidth - 36 },
      fontStyle: 'bold',
    });
    bubbleContainer.add(txt);

    // Sound alert on new text
    if (window.gameAudio) {
      window.gameAudio.playSfx('click');
    }

    // Typewriter effect or instant
    if (speakerKey === 'khwezi') {
      let charIndex = 0;
      const totalChars = fullText.length;
      txt.setText("");
      const timer = this.time.addEvent({
        delay: 35,
        repeat: totalChars - 1,
        callback: () => {
          charIndex++;
          if (txt && txt.active) {
            txt.setText(fullText.substring(0, charIndex));
          }
          if (charIndex === totalChars) {
            this.time.delayedCall(2800, () => {
              if (this.tweens) {
                this.tweens.add({
                  targets: bubbleContainer,
                  alpha: 0,
                  duration: 300,
                  onComplete: () => {
                    bubbleContainer.destroy();
                    onComplete();
                  }
                });
              } else {
                bubbleContainer.destroy();
                onComplete();
              }
            });
          }
        }
      });
    } else {
      // Instant text for Jama
      txt.setText(fullText);
      this.time.delayedCall(2800, () => {
        if (this.tweens) {
          this.tweens.add({
            targets: bubbleContainer,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              bubbleContainer.destroy();
              onComplete();
            }
          });
        } else {
          bubbleContainer.destroy();
          onComplete();
        }
      });
    }

    // Constantly follow source object position as they move or sway
    const followTimer = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (character && character.active && bubbleContainer && bubbleContainer.active) {
          let curX = character.x;
          let curY = actualIsBelow ? (character.y + 70) : (character.y - bubbleHeight - 30);

          if (curY + bubbleHeight > gameHeight - 10) {
            curY = gameHeight - bubbleHeight - 10;
          }

          if (curX + bubbleWidth / 2 > gameWidth - 10) {
            curX = gameWidth - bubbleWidth / 2 - 10;
          }
          if (curX - bubbleWidth / 2 < 10) {
            curX = bubbleWidth / 2 + 10;
          }

          bubbleContainer.setPosition(curX, curY);
        } else {
          followTimer.destroy();
        }
      }
    });
  }

  runReunionAndEndingSequence() {
    try {
      this.rescueSequenceActive = true;
      this.gameplayStarted = false;
      if (this.player && this.player.body) {
        this.player.setVelocity(0, 0);
      }

      this.cameras.main.zoomTo(1.65, 1800, 'Cubic.easeInOut', true);
      this.cameras.main.pan(1005, 180, 1800, 'Cubic.easeInOut', true);

      this.tweens.add({
        targets: this.player,
        x: 960,
        y: 180,
        duration: 1200,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          if (this.player) {
            this.player.setVelocity(0, 0);
            this.player.play('jama-light-idle', true);
            this.player.setData('facingAngle', 0); // facing east
          }

          this.time.delayedCall(400, () => {
            // Dialogue 1 (Jama speaks)
            this.createCustomDialogueBubble(this.player, "Mtaka Mah.\nAre you okay?", 'jama', () => {
              this.time.delayedCall(400, () => {
                // Dialogue 2 (Jama speaks)
                this.createCustomDialogueBubble(this.player, "Phephisa sis wam.\nAll is well now.", 'jama', () => {
                  this.time.delayedCall(400, () => {
                    // Dialogue 3 (Jama speaks)
                    this.createCustomDialogueBubble(this.player, "I'm gonna take you home.", 'jama', () => {
                      this.time.delayedCall(400, () => {
                        // Dialogue 4 (Khwezi speaks)
                        this.createCustomDialogueBubble(this.khweziSprite, "You came.\n...I knew you would.", 'khwezi', () => {
                          this.time.delayedCall(400, () => {
                            // Dialogue 5 (Jama speaks, final)
                            this.createCustomDialogueBubble(this.player, "Always.", 'jama', () => {
                              this.time.delayedCall(1200, () => {
                                this.startCollapseEscapeSequence();
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        }
      });
      
    } catch (e) {
      console.error("Reunion sequence failure:", e);
      this.forceVictoryScreen();
    }
  }

  startCollapseEscapeSequence() {
    this.rescueSequenceActive = false;
    this.escapeSequenceActive = true;
    this.gameplayStarted = false;

    // Restore camera zoom and target back to following the player
    this.cameras.main.zoomTo(1.0, 1500, 'Cubic.easeInOut', true);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Give Jama control back:
    this.cutsceneActive = false;
    this.cutsceneComplete = true;
    this.input.enabled = true;
    if (this.player) {
      this.player.setVelocity(0, 0);
    }
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;

    // Re-register NAV dpad listeners freshly (removeAllListeners first, then re-add)
    if (this.upButton) this.upButton.removeAllListeners();
    if (this.downButton) this.downButton.removeAllListeners();
    if (this.leftButton) this.leftButton.removeAllListeners();
    if (this.rightButton) this.rightButton.removeAllListeners();

    if (this.upButton) {
      this.upButton.on('pointerdown', () => { this.moveUp = true; });
      this.upButton.on('pointerup', () => { this.moveUp = false; });
      this.upButton.on('pointerout', () => { this.moveUp = false; });
    }

    if (this.downButton) {
      this.downButton.on('pointerdown', () => { this.moveDown = true; });
      this.downButton.on('pointerup', () => { this.moveDown = false; });
      this.downButton.on('pointerout', () => { this.moveDown = false; });
    }

    if (this.leftButton) {
      this.leftButton.on('pointerdown', () => { this.moveLeft = true; });
      this.leftButton.on('pointerup', () => { this.moveLeft = false; });
      this.leftButton.on('pointerout', () => { this.moveLeft = false; });
    }

    if (this.rightButton) {
      this.rightButton.on('pointerdown', () => { this.moveRight = true; });
      this.rightButton.on('pointerup', () => { this.moveRight = false; });
      this.rightButton.on('pointerout', () => { this.moveRight = false; });
    }

    // Shrine collapse atmospheric elements:
    
    // 1. Red subtle flashing every 2000ms
    const redOverlay = this.add.graphics();
    redOverlay.setScrollFactor(0);
    redOverlay.setDepth(140);
    this.collapseRedFlashEvent = this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        redOverlay.clear();
        redOverlay.fillStyle(0xff0000, 0.082); // #ff000015
        redOverlay.fillRect(0, 0, 1280, 720);
        this.time.delayedCall(200, () => {
          redOverlay.clear();
        });
      }
    });

    // 2. Low rumble sine 30Hz gain 0.06
    try {
      const actx = (window.gameAudio && (window.gameAudio as any).ctx);
      if (actx) {
        if (window.gameAudio) {
          try { window.gameAudio.setMusicTheme('none'); } catch(e) {}
        }
        
        const osc = actx.createOscillator();
        const gainNode = actx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 30; // 30Hz
        gainNode.gain.setValueAtTime(0.06, actx.currentTime);
        osc.connect(gainNode);
        gainNode.connect(actx.destination);
        osc.start();
        
        this.rumble = {
          stop: () => {
            try {
              osc.stop();
              osc.disconnect();
              gainNode.disconnect();
            } catch(e) {}
          }
        };
      }
    } catch(err) {
      console.warn("Could not play low rumble synth:", err);
    }

    // 3. Falling dust/debris particles (3 per second)
    this.debrisParticles = [];
    this.debrisGraphics = this.add.graphics().setDepth(130).setScrollFactor(0);
    this.debrisSpawnEvent = this.time.addEvent({
      delay: 333,
      loop: true,
      callback: () => {
        this.debrisParticles.push({
          x: Math.random() * 1280,
          y: -10,
          vy: 200 + Math.random() * 180,
          radius: 2 + Math.random() * 1.5,
          color: 0x2a1a10
        });
      }
    });

    // 4. Center instruction panel below HUD
    const panelX = 640;
    const panelY = 90;
    const pw = 340;
    const ph = 65;

    const panelContainer = this.add.container(panelX, panelY);
    panelContainer.setScrollFactor(0);
    panelContainer.setDepth(150);

    const bgG = this.add.graphics();
    bgG.fillStyle(0x0a0f14, 0.85);
    bgG.lineStyle(1, 0xff3a3a, 1);
    bgG.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 6);
    bgG.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 6);
    panelContainer.add(bgG);

    const txt1 = this.add.text(0, -22, "THE SHRINE IS COLLAPSING", {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '14px',
      color: '#ff3a3a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const txt2 = this.add.text(0, -2, "Escape before it falls.", {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '12px',
      color: '#f5c842',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const txt3 = this.add.text(0, 16, "Move Jama to the exit — Khwezi follows.", {
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: '11px',
      color: '#2D7A4F',
    }).setOrigin(0.5);

    panelContainer.add(txt1);
    panelContainer.add(txt2);
    panelContainer.add(txt3);

    this.tweens.add({
      targets: panelContainer,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.collapsePanel = panelContainer;

    // Trigger Screen shake (duration 150000 / very high, intensity 0.005) represent rumbling
    this.cameras.main.shake(150000, 0.005);
  }

  triggerBossDefeated() {
    this.triggerVictory();
  }

  triggerVictory() {
    // Map the scene-specific object references to expected sequence names
    (this as any).nkanyamba = this.boss;
    (this as any).khwezi = this.khweziSprite;
    (this as any).khweziCage = this.cageGraphics;

    if (this.bossDefeated) return;
    
    // Play celebratory victory sound effect utilizing the existing audio system
    if (window.gameAudio) {
      try {
        window.gameAudio.playSfx('chime');
        window.gameAudio.playSfx('power');
      } catch(e) {}
    }
    
    this.bossDefeated = true;
    this.nkanyambaAIActive = false;
    this.cutsceneActive = true;
    
    // Stop everything
    this.player.setVelocity(0, 0);
    if (this.boss && this.boss.body) {
      this.boss.setVelocity(0, 0);
      this.boss.body.enable = false;
    }
    
    // Kill all enemies
    [(this as any).guardsGroup, (this as any).enemyGroup, (this as any).shrineMinions,
     (this as any).minionGroup, (this as any).enemies]
      .forEach(group => {
        if (group && group.getChildren) {
          group.getChildren().forEach((e: any) => {
            if (e && e.active) {
              e.active = false;
              if (e.body) e.body.enable = false;
              if (e.destroy) e.destroy();
            }
          });
        }
      });
    
    // Kill skull/second form if exists
    ['skull', 'bossSkull', 'deathForm',
     'phase2Form', 'finalForm', 'bossHead',
     'nkanyambaSkull', 'deathSprite',
     'bossPhase2', 'skullForm', 'skullBoss']
      .forEach(n => {
        if ((this as any)[n]) {
          if ((this as any)[n].body) 
            (this as any)[n].body.enable = false;
          if ((this as any)[n].destroy) 
            (this as any)[n].destroy();
          (this as any)[n] = null;
        }
      });
    
    // Remove all timers
    this.time.removeAllEvents();
    
    // Jama cannot take damage anymore
    (this as any).jamaInvulnerable = true;
    
    // Begin sequence
    this.time.timeScale = 1;
    if (this.physics && this.physics.world) {
      this.physics.world.timeScale = 1;
    }
    this.runPostBossSequence();
  }

  runPostBossSequence() {
    // 2a — Nkanyamba collapse (1500ms)
    try {
      if ((this as any).nkanyamba) {
        this.tweens.add({
          targets: (this as any).nkanyamba,
          angle: 90,
          alpha: 0.15,
          y: (this as any).nkanyamba.y + 20,
          duration: 1200,
          ease: 'Power2'
        });
      }
    } catch(e) { console.error(e); }
    
    // 2b — Cage opens automatically
    // runs simultaneously with collapse
    this.time.delayedCall(800, () => {
      try { this.openCageAutomatically(); } 
      catch(e) { console.error(e); }
    });
    
    // 2c — "THE SPIRIT HAS FALLEN" text
    this.time.delayedCall(1400, () => {
      try {
        const txt = this.add.text(
          this.scale.width / 2,
          this.scale.height / 2,
          'THE SPIRIT HAS FALLEN',
          {
            fontSize: '18px',
            color: '#00FFA3',
            fontFamily: 'monospace',
            backgroundColor: '#0a0f14cc',
            padding: { x: 16, y: 10 }
          }
        ).setOrigin(0.5)
         .setScrollFactor(0)
         .setDepth(400)
         .setAlpha(0);
        
        this.tweens.add({
          targets: txt,
          alpha: 1,
          y: txt.y - 30,
          duration: 700
        });
        
        this.time.delayedCall(2000, () => {
          try {
            this.tweens.add({
              targets: txt,
              alpha: 0,
              duration: 500,
              onComplete: () => {
                txt.destroy();
              }
            });
          } catch(e) {}
        });
      } catch(e) { console.error(e); }
    });
    
    // 2d — Jama runs to Khwezi (3000ms)
    this.time.delayedCall(3000, () => {
      try { this.jamaRunsToKhwezi(); }
      catch(e) { 
        console.error(e);
        this.startDialogue();
      }
    });
  }

  openCageAutomatically() {
    this.cageActive = false; // Sister's arms free

    // Flash cage gold
    this.cameras.main.flash(
      200, 245, 192, 66);
    
    // Destroy all cage parts
    const cageParts = [
      'khweziCage', 'cageBars', 
      'cageLock', 'cageChain',
      'cageFrame', 'cageDoor',
      'cageGraphics', 'cage'
    ];
    
    cageParts.forEach(part => {
      if ((this as any)[part]) {
        try {
          // Try to scatter bars first
          if ((this as any)[part].getChildren) {
            (this as any)[part].getChildren()
              .forEach((bar: any) => {
                this.tweens.add({
                  targets: bar,
                  x: bar.x + 
                    Phaser.Math.Between(
                      -50, 50),
                  y: bar.y - 
                    Phaser.Math.Between(
                      20, 60),
                  alpha: 0,
                  duration: 500
                });
              });
          } else {
            this.tweens.add({
              targets: (this as any)[part],
              alpha: 0,
              scaleX: 1.3,
              scaleY: 1.3,
              duration: 400,
              onComplete: () => {
                if ((this as any)[part] && 
                    (this as any)[part].destroy) {
                  (this as any)[part].destroy();
                  (this as any)[part] = null;
                }
              }
            });
          }
        } catch(e) {
          if ((this as any)[part] && 
              (this as any)[part].destroy) {
            (this as any)[part].destroy();
            (this as any)[part] = null;
          }
        }
      }
    });
    
    // White liberation flash
    this.time.delayedCall(400, () => {
      this.cameras.main.flash(
        150, 255, 255, 255);
    });
    
    // Khwezi stands upright
    this.time.delayedCall(600, () => {
      try {
        if ((this as any).khwezi) {
          this.tweens.add({
            targets: (this as any).khwezi,
            y: (this as any).khwezi.y - 8,
            alpha: 1,
            duration: 600,
            ease: 'Sine.easeOut'
          });
        }
      } catch(e) {}
    });
  }

  jamaRunsToKhwezi() {
    // Find Khwezi position
    const targetX = (this as any).khwezi 
      ? (this as any).khwezi.x - 45
      : (this.scale.width - 200);
    const targetY = (this as any).khwezi 
      ? (this as any).khwezi.y + 10
      : 250;
    
    // Camera zooms in
    this.cameras.main.zoomTo(
      1.2, 1000, 'Sine.easeInOut');
    
    // Jama runs to Khwezi
    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 1200,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Small pause then dialogue
        this.time.delayedCall(600, () => {
          try { this.startDialogue(); }
          catch(e) {
            console.error(e);
            this.endShrineScene();
          }
        });
      }
    });
  }

  startDialogue() {
    this.showBubble(
      'JAMA',
      'Mtaka Mah.\nAre you okay?',
      '#000d05', '#00FFA3', '#00FFA3',
      this.player, 2800,
    () => {
      this.showBubble(
        'JAMA',
        'Phephisa sis wam.\nAll is well now.',
        '#000d05', '#00FFA3', '#00FFA3',
        this.player, 2800,
      () => {
        this.showBubble(
          'JAMA',
          "I'm gonna take you home.",
          '#000d05', '#00FFA3', '#00FFA3',
          this.player, 2500,
        () => {
          this.showBubble(
            'KHWEZI',
            'You came.Oh Bhut wam.\n...I knew you would.',
            '#000508', '#aaccff', '#aaccff',
            (this as any).khwezi, 3000,
          () => {
            this.showBubble(
              'JAMA',
              'Always.',
              '#000d05', '#00FFA3', 
              '#ffffff',
              this.player, 2000,
            () => {
              // After Always — 
              // shrine collapse begins
              this.time.delayedCall(
                1200, () => {
                this.startShrineCollapse();
              });
            });
          });
        });
      });
    });
  }

  showBubble(speaker: string, text: string, bg: string, 
             border: string, color: string, 
             character: any, duration: number, 
             onComplete: () => void) {
    // Destroy previous bubble
    if ((this as any).currentBubble) {
      try {
        (this as any).currentBubble.destroy();
      } catch(e) {}
      (this as any).currentBubble = null;
    }
    
    const sw = this.scale.width;
    const sh = this.scale.height;
    
    const charX = character 
      ? character.x : sw / 2;
    const charY = character 
      ? character.y : sh / 2;
    
    const bw = 260;
    const bh = 85;
    
    // Position below character
    let bx = charX;
    let by = charY + 65;
    
    // Screen bounds check
    bx = Phaser.Math.Clamp(
      bx, bw/2 + 10, sw - bw/2 - 10);
    by = Phaser.Math.Clamp(
      by, 10, sh - bh - 10);
    
    // Build bubble
    const container = this.add
      .container(bx, by)
      .setDepth(500)
      .setScrollFactor(0);
    
    const bgInt = parseInt(
      bg.replace('#','0x'));
    const borderInt = parseInt(
      border.replace('#','0x'));
    
    const rect = this.add.rectangle(
      0, 0, bw, bh, bgInt)
      .setStrokeStyle(2, borderInt);
    
    const lbl = this.add.text(
      -bw/2 + 8, -bh/2 + 6,
      speaker,
      { fontSize: '10px', 
        color: border,
        fontFamily: 'monospace' }
    );
    
    const txt = this.add.text(
      -bw/2 + 8, -bh/2 + 22,
      text,
      { fontSize: '13px',
        color: color,
        fontFamily: 'monospace',
        wordWrap: { width: bw - 16 } }
    );
    
    container.add([rect, lbl, txt]);
    (this as any).currentBubble = container;
    
    // Auto dismiss
    this.time.delayedCall(duration, () => {
      try {
        if (container && (container as any).scene) {
          this.tweens.add({
            targets: container,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              try {
                container.destroy();
              } catch(e) {}
              (this as any).currentBubble = null;
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

  startShrineCollapse() {
    // Screen shake — shrine breaking
    this.cameras.main.shake(300, 0.012);
    
    // Play initial ambient wind and crumbling sound layers
    if (window.gameAudio) {
      try {
        window.gameAudio.playSfx('collapse');   // Low rumbling crumble sound
        window.gameAudio.playSfx('boss_phase'); // Screeching dark wind howl
        window.gameAudio.startAmbience();       // Sustained atmospheric wind ambience
      } catch(e) {}
    }
    
    // Debris falls
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 200, () => {
        try {
          // Play additional crumbling layer matching debris falling
          if (window.gameAudio && i % 2 === 0) {
            window.gameAudio.playSfx('collapse');
          }
          
          const debris = this.add.rectangle(
            Phaser.Math.Between(
              100, this.scale.width - 100),
            0,
            Phaser.Math.Between(15, 45),
            Phaser.Math.Between(10, 30),
            0x1a1208
          ).setDepth(100);
          
          this.tweens.add({
            targets: debris,
            y: this.scale.height + 50,
            duration: Phaser.Math.Between(
              600, 1200),
            onComplete: () => {
              debris.destroy();
            }
          });
        } catch(e) {}
      });
    }
    
    // Warning text
    const warn = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 40,
      'THE SHRINE IS COLLAPSING',
      {
        fontSize: '16px',
        color: '#ff3a3a',
        fontFamily: 'monospace',
        backgroundColor: '#0a000acc',
        padding: { x: 14, y: 8 }
      }
    ).setOrigin(0.5)
     .setScrollFactor(0)
     .setDepth(400);
    
    this.tweens.add({
      targets: warn,
      alpha: 0,
      duration: 400,
      delay: 2000,
      onComplete: () => warn.destroy()
    });
    
    // Fade to black and transition
    this.time.delayedCall(2500, () => {
      this.cameras.main.fadeOut(
        1000, 0, 0, 0);
      
      this.cameras.main.once(
        'camerafadeoutcomplete', () => {
        this.endShrineScene();
      });
    });
  }
  
  endShrineScene() {
    try {
      if (this.scene.get('EscapeScene')) {
        this.scene.start('EscapeScene', {
          difficulty: 
            (this as any).currentDifficulty || 
            (this as any).difficulty ||
            'medium',
          enemiesDefeated: 
            (this as any).enemiesDefeated || 0,
          artifactsCollected: 
            (this as any).artifactsCollected || [],
          elapsedTime: 
            (this as any).elapsedTime || 0
        });
      } else if (
        this.scene.get('EndingCreditsScene')) {
        this.scene.start('EndingCreditsScene', {});
      } else {
        this.forceVictoryScreen();
      }
    } catch(e) {
      console.error(e);
      this.forceVictoryScreen();
    }
  }


  // Deprecated helper placeholders to avoid breaking references on other parts of old code:
  runCollapseAnimation() {}
  
  skipToPlayerControl() {
    console.log('Player control restored');
    
    // Ensure time scales are normal
    this.time.timeScale = 1;
    if (this.physics && this.physics.world) {
      this.physics.world.timeScale = 1;
    }
    
    // Re-enable player input
    this.cutsceneActive = false;
    this.cutsceneComplete = true;
    if (this.input) this.input.enabled = true;
    (this as any).jamaInvulnerable = true;
    
    // Reset velocity
    this.player.setVelocity(0, 0);
    this.moveUp = false;
    this.moveDown = false;
    this.moveLeft = false;
    this.moveRight = false;
    
    // Re-register NAV buttons fresh
    [this.upButton, this.downButton,
     this.leftButton, this.rightButton]
      .forEach(btn => {
        if (btn) btn.removeAllListeners();
      });
    
    if (this.upButton) {
      this.upButton.on('pointerdown', 
        () => { this.moveUp = true; });
      this.upButton.on('pointerup', 
        () => { this.moveUp = false; });
      this.upButton.on('pointerout', 
        () => { this.moveUp = false; });
    }
    if (this.downButton) {
      this.downButton.on('pointerdown', 
        () => { this.moveDown = true; });
      this.downButton.on('pointerup', 
        () => { this.moveDown = false; });
      this.downButton.on('pointerout', 
        () => { this.moveDown = false; });
    }
    if (this.leftButton) {
      this.leftButton.on('pointerdown', 
        () => { this.moveLeft = true; });
      this.leftButton.on('pointerup', 
        () => { this.moveLeft = false; });
      this.leftButton.on('pointerout', 
        () => { this.moveLeft = false; });
    }
    if (this.rightButton) {
      this.rightButton.on('pointerdown', 
        () => { this.moveRight = true; });
      this.rightButton.on('pointerup', 
        () => { this.moveRight = false; });
      this.rightButton.on('pointerout', 
        () => { this.moveRight = false; });
    }
    
    // Disable combat buttons
    [(this as any).strikeButton, (this as any).blockButton,
     (this as any).bashButton, (this as any).dashButton,
     (this as any).crouchButton]
      .forEach(btn => {
        if (btn) {
          btn.setAlpha(0.3);
          if (btn.input) {
            btn.input.enabled = false;
          }
        }
      });
    
    // Show hint text near Khwezi
    (this as any).showKhweziHint();
    
    // Start BREAK THE LOCK proximity check
    (this as any).breakLockActive = true;
  }
  
  showKhweziHint() {
    // Floating hint above cage
    if ((this as any).khweziHint) {
      (this as any).khweziHint.destroy();
    }
    
    const cageX = (this as any).khweziCage 
      ? (this as any).khweziCage.x 
      : (this as any).khweziX || 
        (this.cameras.main.width - 150);
    const cageY = (this as any).khweziCage 
      ? (this as any).khweziCage.y 
      : (this as any).khweziY || 200;
    
    (this as any).khweziHint = this.add.text(
      cageX, cageY - 60,
      '↓ Go to her',
      {
        fontSize: '12px',
        color: '#f5c842',
        fontFamily: 'monospace'
      }
    ).setOrigin(0.5)
     .setDepth(200)
     .setAlpha(0.7);
    
    // Pulse the hint
    this.tweens.add({
      targets: (this as any).khweziHint,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
    
    // Create BREAK THE LOCK button 
    // (hidden initially)
    (this as any).createBreakLockButton(
      cageX, cageY + 70);
  }
  
  createBreakLockButton(x: number, y: number) {
    if ((this as any).breakLockBtn) {
      (this as any).breakLockBtn.destroy();
    }
    
    (this as any).breakLockBtn = this.add.text(
      x, y,
      '🔓  BREAK THE LOCK',
      {
        fontSize: '14px',
        color: '#f5c842',
        fontFamily: 'monospace',
        backgroundColor: '#0a1a0a',
        padding: { x: 14, y: 10 }
      }
    ).setOrigin(0.5)
     .setDepth(200)
     .setAlpha(0)
     .setInteractive()
     .on('pointerdown', () => {
       (this as any).onBreakLock();
     });
    
    // Pulse border effect using camera
    this.tweens.add({
      targets: (this as any).breakLockBtn,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  onBreakLock() {
    if ((this as any).lockBroken) return;
    (this as any).lockBroken = true;
    (this as any).breakLockActive = false;
    
    console.log('Breaking lock');
    
    // Remove button and hint
    if ((this as any).breakLockBtn) {
      (this as any).breakLockBtn.destroy();
      (this as any).breakLockBtn = null;
    }
    if ((this as any).khweziHint) {
      (this as any).khweziHint.destroy();
      (this as any).khweziHint = null;
    }
    
    // Disable player input
    this.cutsceneActive = true;
    this.player.setVelocity(0, 0);
    
    // Flash the cage
    this.time.delayedCall(0, () => {
      try {
        (this as any).breakCageAnimation();
      } catch(e) {
        console.error(e);
        (this as any).startReunion();
      }
    });
  }
  
  breakCageAnimation() {
    // Simple cage break:
    // Find cage Graphics and destroy
    if ((this as any).khweziCage) {
      // Flash red first
      this.cameras.main.flash(
        300, 255, 200, 100);
      
      this.time.delayedCall(300, () => {
        // Destroy cage
        if ((this as any).khweziCage) {
          (this as any).khweziCage.destroy();
          (this as any).khweziCage = null;
        }
        if ((this as any).cageBars) {
          (this as any).cageBars.destroy();
          (this as any).cageBars = null;
        }
        if ((this as any).cageLock) {
          (this as any).cageLock.destroy();
          (this as any).cageLock = null;
        }
        if ((this as any).cageChain) {
          (this as any).cageChain.destroy();
          (this as any).cageChain = null;
        }
        
        // White liberation flash
        this.cameras.main.flash(
          200, 255, 255, 255);
        
        // Khwezi stands up
        this.time.delayedCall(400, () => {
          (this as any).freeKhwezi();
        });
      });
    } else {
      // No cage object found,
      // skip straight to reunion
      this.cameras.main.flash(
        300, 255, 255, 255);
      this.time.delayedCall(400, () => {
        (this as any).freeKhwezi();
      });
    }
  }
  
  freeKhwezi() {
    console.log('Khwezi freed');
    
    if ((this as any).khwezi) {
      // Khwezi stands upright
      this.tweens.add({
        targets: (this as any).khwezi,
        y: (this as any).khwezi.y - 10,
        alpha: 1,
        duration: 600,
        onComplete: () => {
          (this as any).startReunion();
        }
      });
    } else {
      (this as any).startReunion();
    }
  }
  
  startReunion() {
    console.log('Reunion starting');
    
    // Camera zoom in
    this.cameras.main.zoomTo(
      1.25, 1200, 'Sine.easeInOut');
    
    // Move Jama to Khwezi
    const targetX = (this as any).khwezi 
      ? (this as any).khwezi.x - 40 
      : this.player.x;
    const targetY = (this as any).khwezi 
      ? (this as any).khwezi.y 
      : this.player.y;
    
    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 1000,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.time.delayedCall(500, () => {
          (this as any).startJamaDialogue();
        });
      }
    });
  }
  
  startJamaDialogue() {
    console.log('Dialogue starting');
    (this as any).showDialogueBubble(
      'JAMA',
      ['Mtaka Mah.', 'Are you okay?'],
      '#000d05', '#00FFA3', '#00FFA3',
      this.player,
      () => {
        this.time.delayedCall(400, () => {
          (this as any).showDialogueBubble(
            'JAMA',
            ['Phephisa sis wam.', 
             'All is well now.'],
            '#000d05', '#00FFA3', '#00FFA3',
            this.player,
            () => {
              this.time.delayedCall(400, 
                () => {
                (this as any).showDialogueBubble(
                  'JAMA',
                  ["I'm gonna take you home."],
                  '#000d05','#00FFA3',
                  '#00FFA3',
                  this.player,
                  () => {
                    this.time.delayedCall(
                      400, () => {
                      (this as any).showKhweziResponse();
                    });
                  }
                );
              });
            }
          );
        });
      }
    );
  }
  
  showKhweziResponse() {
    (this as any).showDialogueBubble(
      'KHWEZI',
      ['You came.Oh Bhut wam', '...I knew you would.'],
      '#000508', '#aaccff', '#aaccff',
      (this as any).khwezi,
      () => {
        this.time.delayedCall(400, () => {
          (this as any).showDialogueBubble(
            'JAMA',
            ['Always.'],
            '#000d05', '#00FFA3', '#ffffff',
            this.player,
            () => {
              this.time.delayedCall(
                1500, () => {
                (this as any).endShrineScene();
              });
            }
          );
        });
      }
    );
  }
  
  showDialogueBubble(
    speaker: string, lines: string[], bg: string, border: string, 
    textColor: string, character: any, onComplete: () => void) {
    
    // Clean up previous bubble
    if ((this as any).activeBubble) {
      (this as any).activeBubble.destroy();
      (this as any).activeBubble = null;
    }
    
    const charX = character 
      ? character.x : 400;
    const charY = character 
      ? character.y : 300;
    
    // Position below character
    let bx = charX;
    let by = charY + 70;
    
    const bubbleW = 280;
    const bubbleH = 90;
    
    // Bounds check
    if (bx + bubbleW/2 > 
        this.cameras.main.width - 10) {
      bx = this.cameras.main.width 
           - bubbleW/2 - 10;
    }
    if (bx - bubbleW/2 < 10) {
      bx = bubbleW/2 + 10;
    }
    if (by + bubbleH > 
        this.cameras.main.height - 10) {
      by = charY - bubbleH - 30;
    }
    
    // Create bubble container
    const bubble = this.add.container(
      bx, by);
    bubble.setDepth(500);
    bubble.setScrollFactor(0);
    
    // Background
    const bg_rect = this.add.rectangle(
      0, 0, bubbleW, bubbleH, 
      parseInt(bg.replace('#',''), 16), 1
    ).setStrokeStyle(2, 
      parseInt(border.replace('#',''), 16)
    );
    
    // Speaker label
    const label = this.add.text(
      -bubbleW/2 + 10, -bubbleH/2 + 5,
      speaker,
      { fontSize: '10px', 
        color: border,
        fontFamily: 'monospace' }
    );
    
    // Dialogue text
    const text = this.add.text(
      -bubbleW/2 + 10, -bubbleH/2 + 22,
      lines.join('\n'),
      { fontSize: '13px',
        color: textColor,
        fontFamily: 'monospace',
        wordWrap: { width: bubbleW - 20 } }
    );
    
    bubble.add([bg_rect, label, text]);
    (this as any).activeBubble = bubble;
    
    // Auto dismiss after reading time
    const readTime = lines.join(' ')
      .length * 60 + 1500;
    
    this.time.delayedCall(readTime, () => {
      if (bubble && (bubble as any).scene) {
        this.tweens.add({
          targets: bubble,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            bubble.destroy();
            (this as any).activeBubble = null;
            if (onComplete) onComplete();
          }
        });
      } else {
        if (onComplete) onComplete();
      }
    });
  }
  
  legacyEndShrineScene() {
    console.log('Ending shrine scene');
    
    // Clean up bubble
    if ((this as any).activeBubble) {
      (this as any).activeBubble.destroy();
    }
    
    // Fade to black
    this.cameras.main.fadeOut(
      1500, 0, 0, 0);
    
    this.cameras.main.once(
      'camerafadeoutcomplete', () => {
      // Transition to escape/ending
      // Use EndingScene or EscapeScene
      // if implemented, else stats screen
      if (this.scene.get('EscapeScene')) {
        this.scene.start('EscapeScene', {
          difficulty: this.difficulty || 'medium',
          enemiesDefeated: 
            (this as any).enemiesDefeated || 0,
          artifactsCollected: 
            (this as any).artifactsCollected || [],
          elapsedTime: 
            (this as any).elapsedTime || 0
        });
      } else if (
        this.scene.get('EndingCreditsScene')) {
        this.scene.start('EndingCreditsScene', {});
      } else {
        (this as any).forceVictoryScreen();
      }
    });
  }

  // Fallback / legacy handler bypassed cleanly
  triggerBossDefeated_disabled() {
    try {
      this.myCustomBossDefeatedSequence();
      return;
    } catch (e) {
      console.error("triggerBossDefeated fallback error:", e);
    }
    try {
      this.gameplayStarted = false; // Freeze gameplay ticks!
      this.inFinalBlowSequence = true;

      // 1. Game speed drops to 0.15 speed coefficient (represented as scale = 1 / 0.15)
      if (this.physics && this.physics.world) {
        this.physics.world.timeScale = 1 / 0.15;
      }

      // 2. All enemy sprites freeze entirely
      if (this.player) this.player.setVelocity(0, 0);
      if (this.boss) this.boss.setVelocity(0, 0);
      if (this.guardsGroup) {
        this.guardsGroup.getChildren().forEach((g: any) => {
          if (g.active) g.setVelocity(0, 0);
        });
      }

      // Stop boss ambient drone immediately
      if (window.gameAudio) {
        try { window.gameAudio.stopBossDrone(); } catch(e) {}
      }

      // 3. Cameras main zoom in 1.4x scale over 2000ms centering on midpoint of Nkanyamba & Jama
      const midX = (this.player.x + this.boss.x) / 2;
      const midY = (this.player.y + this.boss.y) / 2;
      this.cameras.main.pan(midX, midY, 2000, 'Quad.easeInOut');
      this.cameras.main.zoomTo(1.4, 2000, 'Quad.easeInOut');

      // 4. Clean speech bubble displays from Khwezi: "Now, Jama! Strike him down!"
      this.time.delayedCall(1600, () => {
        try {
          this.createSpeechBubble(this.player, "Now, Jama! Strike him down!", 'sister', () => {
            // Speech bubble completes typing! Show a gorgeous pulsing helper prompt
            const promptText = this.add.text(640, 520, "TAP [STRIKE] TO DELIVER THE FINAL BLOW", {
              fontFamily: '"Space Grotesk", "Courier New", Courier, monospace',
              fontSize: '18px',
              color: '#00ffa3',
              fontStyle: 'bold',
              stroke: '#000000',
              strokeThickness: 3
            }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

            this.tweens.add({
              targets: promptText,
              alpha: 0.3,
              duration: 500,
              yoyo: true,
              repeat: -1
            });

            // Make sure promptText is cleaned up when the final blow occurs
            const originalCallback = this.finalStrikeCallback;
            this.finalStrikeCallback = () => {
              try { promptText.destroy(); } catch(e) {}
              if (originalCallback) originalCallback();
            };
          });
        } catch(e) {
          console.error("Speech bubble error in triggerBossDefeated", e);
        }
      });

      // 5. Input is locked except SPACE (and pointerdown for mobile friendliness)
      this.finalStrikeTriggered = false;
      this.finalStrikeCallback = () => { triggerFinalStrike(); };
      const triggerFinalStrike = () => {
        try {
          if (this.finalStrikeTriggered) return;
          this.finalStrikeTriggered = true;

          // Our pristine cinematic sequence
          this.triggerCageDestruction();
          this.playWarmEndingTone();
          this.gameplayStarted = false;

          // Gold explosive burst flash
          this.cameras.main.flash(500, 255, 234, 48);
          if (window.gameAudio) {
            try { window.gameAudio.playSfx('relic'); } catch(e) {}
          }
          try {
            if (this.boss) this.boss.destroy();
            if (this.guardsGroup) this.guardsGroup.clear(true, true);
            updateReactState({ gameCompleted: true });
            if ((window as any).incrementEnemiesDefeated) {
              (window as any).incrementEnemiesDefeated(1);
            }
            if ((window as any).incrementCompletion) {
              (window as any).incrementCompletion(window.gameState.difficulty);
            }
          } catch(e) {}

          // Move Jama directly in front of Khwezi at (1015, 180)
          this.tweens.add({
            targets: this.player,
            x: 1015,
            y: 180,
            duration: 1200,
            onComplete: () => {
              try {
                this.player.setData('facingAngle', 0);
                this.player.setVelocity(0, 0);

                // Slower, dramatic cinematic pan & zoom of 2000ms onto the siblings
                this.cameras.main.pan(1032, 175, 2000, 'Cubic.easeInOut', false);
                this.cameras.main.zoomTo(2.5, 2000, 'Cubic.easeInOut', false);

                this.time.delayedCall(2200, () => {
                  this.createSisterDialogueSpeechBubble(this.khweziSprite, "You came.", 'sister', () => {
                    this.time.delayedCall(400, () => {
                      this.createSisterDialogueSpeechBubble(this.player, "Always.", 'jama', () => {
                        this.time.delayedCall(400, () => {
                          this.createSisterDialogueSpeechBubble(this.player, "Let's go home, sister.", 'jama', () => {
                            this.time.delayedCall(600, () => {
                              this.createSisterDialogueSpeechBubble(this.khweziSprite, "Yes... let's go.", 'sister', () => {
                                this.time.delayedCall(1200, () => {
                                  this.startCollapseEscapeSequence();
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              } catch (e) {
                this.forceVictoryScreen();
              }
            }
          });

          return; // Bypass original nested block content entirely
        } catch (e) {
          console.error("Custom final strike error:", e);
        }

        try {
          if (this.finalStrikeTriggered) return;
          this.finalStrikeTriggered = true;

          // Restore scale, camera zoom/pan
          this.cameras.main.zoomTo(1.0, 500, 'Quad.easeOut');
          if (this.physics && this.physics.world) {
            this.physics.world.timeScale = 1.0;
          }
          this.inFinalBlowSequence = false;

          // - Full screen brilliant gold burst flash
          this.cameras.main.flash(500, 255, 234, 48);

          if (window.gameAudio) {
            try { window.gameAudio.playSfx('relic'); } catch(e) {}
          }

          // - Explosive gold particle ring (300 count)
          let ring: any = null;
          try {
            ring = this.add.particles(this.boss.x, this.boss.y, 'part-gold', {
              scale: { start: 1.5, end: 0 },
              alpha: { start: 1.0, end: 0 },
              speed: { min: 100, max: 400 },
              lifespan: 1200,
              maxParticles: 300,
              blendMode: 'ADD'
            });
            this.time.delayedCall(1500, () => { if (ring) ring.destroy(); });
          } catch(e) {
            console.error("Gold particle ring error:", e);
          }

          // - Nkanyamba disintegrates to dust & guards vanish
          try {
            if (this.boss) this.boss.destroy();
          } catch(e) {
            console.error("Boss destroy error:", e);
          }
          try {
            if (this.guardsGroup) this.guardsGroup.clear(true, true);
          } catch(e) {
            console.error("Guards clear error:", e);
          }

          // Restore completions & tracks statistics
          try {
            updateReactState({ gameCompleted: true });
            if ((window as any).incrementEnemiesDefeated) {
              (window as any).incrementEnemiesDefeated(1);
            }
            if ((window as any).incrementCompletion) {
              (window as any).incrementCompletion(window.gameState.difficulty);
            }
          } catch(e) {
            console.error("React state update error:", e);
          }

          // Chains dissolvment around sister
          if (this.khweziSprite) this.khweziSprite.clearTint();

          // Move Jama to Altar
          this.tweens.add({
            targets: this.player,
            x: 640,
            y: 190,
            duration: 1200,
            onComplete: () => {
              try {
                // Start dialogue sequence
                this.time.delayedCall(500, () => {
                  try {
                    this.createSpeechBubble(this.khweziSprite, "You came.", 'sister', () => {
                      try {
                        this.time.delayedCall(400, () => {
                          try {
                            this.createSpeechBubble(this.player, "Always.", 'jama', () => {
                              try {
                                this.time.delayedCall(500, () => {
                                  try {
                                    // Close-up cinematic starts!
                                    
                                    // Shaky body tremble
                                    const shakeTween = this.tweens.add({
                                      targets: this.khweziSprite,
                                      x: '+=1.5',
                                      duration: 50,
                                      yoyo: true,
                                      repeat: -1
                                    });

                                    // Set camera pan & zoom
                                    this.cameras.main.pan(640, 105 - 16, 3000, 'Quad.easeInOut');
                                    this.cameras.main.zoomTo(4.0, 3000, 'Quad.easeInOut');

                                    // Face overlay graphics for dynamic crisp rendering of eyes
                                    const faceOverlayG = this.add.graphics();
                                    faceOverlayG.setDepth(20);

                                    this.time.delayedCall(3200, () => {
                                      try {
                                        // Stop tremble, restore center
                                        shakeTween.stop();
                                        this.khweziSprite.x = 640;

                                        // Cover closed eyes with head blue skin
                                        faceOverlayG.fillStyle(0x0091ff, 1.0);
                                        faceOverlayG.fillCircle(640, 105 - 16.25, 8.125);

                                        // Draw eyes half open (slits)
                                        faceOverlayG.fillStyle(0xffffff, 1.0);
                                        faceOverlayG.fillRect(640 - 5.0, 105 - 17.5, 3, 1.5);
                                        faceOverlayG.fillRect(640 + 2.0, 105 - 17.5, 3, 1.5);

                                        if (window.gameAudio) window.gameAudio.playSfx('click');

                                        this.time.delayedCall(250, () => {
                                          try {
                                            // Fully open eyes (white circles) with purple pupil speck
                                            faceOverlayG.clear();
                                            faceOverlayG.fillStyle(0x0091ff, 1.0);
                                            faceOverlayG.fillCircle(640, 105 - 16.25, 8.125);

                                            // White sclera
                                            faceOverlayG.fillStyle(0xffffff, 1.0);
                                            faceOverlayG.fillCircle(640 - 3.75, 105 - 16.25, 2.5);
                                            faceOverlayG.fillCircle(640 + 3.75, 105 - 16.25, 2.5);

                                            // Tiny purple speck in Pupil
                                            faceOverlayG.fillStyle(0xae20ff, 1.0);
                                            faceOverlayG.fillCircle(640 - 3.75, 105 - 16.25, 1.0);
                                            faceOverlayG.fillCircle(640 + 3.75, 105 - 16.25, 1.0);

                                            if (window.gameAudio) window.gameAudio.playSfx('boss_phase');

                                            this.time.delayedCall(450, () => {
                                              try {
                                                // Tiny purple speck dissolves, replaced by pure gold pupils
                                                faceOverlayG.clear();
                                                faceOverlayG.fillStyle(0x0091ff, 1.0);
                                                faceOverlayG.fillCircle(640, 105 - 16.25, 8.125);

                                                // White sclera
                                                faceOverlayG.fillStyle(0xffffff, 1.0);
                                                faceOverlayG.fillCircle(640 - 3.75, 105 - 16.25, 2.5);
                                                faceOverlayG.fillCircle(640 + 3.75, 105 - 16.25, 2.5);

                                                // Pure gold pupil
                                                faceOverlayG.fillStyle(0xf5c842, 1.0);
                                                faceOverlayG.fillCircle(640 - 3.75, 105 - 16.25, 1.25);
                                                faceOverlayG.fillCircle(640 + 3.75, 105 - 16.25, 1.25);

                                                // Soft gold glow behind head
                                                const goldGlowG = this.add.graphics();
                                                goldGlowG.setDepth(19);
                                                goldGlowG.fillStyle(0xf5c842, 0.25);
                                                goldGlowG.fillCircle(640, 105 - 16.25, 14);

                                                this.playDivineChord();

                                                // Fade to black
                                                this.time.delayedCall(1500, () => {
                                                  try {
                                                    this.cameras.main.fadeOut(1500, 0, 0, 0);
                                                    this.cameras.main.once('camerafadeoutcomplete', () => {
                                                      this.shutdownShrineScene();
                                                      const currentKey = this.scene.key;
                                                      this.scene.stop(currentKey);
                                                      setTimeout(() => {
                                                        this.scene.start('EndingCreditsScene');
                                                      }, 150);
                                                    });
                                                  } catch(e) {
                                                    console.error("Fadeout error:", e);
                                                    this.forceVictoryScreen();
                                                  }
                                                });
                                              } catch(e) {
                                                console.error("Gold eyes transition error:", e);
                                                this.forceVictoryScreen();
                                              }
                                            });
                                          } catch(e) {
                                            console.error("Purple speck eyes transition error:", e);
                                            this.forceVictoryScreen();
                                          }
                                        });
                                      } catch(e) {
                                        console.error("Half open eyes transition error:", e);
                                        this.forceVictoryScreen();
                                      }
                                    });
                                  } catch(e) {
                                    console.error("Cinematic zoom error:", e);
                                    this.forceVictoryScreen();
                                  }
                                });
                              } catch(e) {
                                console.error("Always dialogue error:", e);
                                this.forceVictoryScreen();
                              }
                            });
                          } catch(e) {
                            console.error("Always speech bubble error:", e);
                            this.forceVictoryScreen();
                          }
                        });
                      } catch(e) {
                        console.error("You came speech bubble error:", e);
                        this.forceVictoryScreen();
                      }
                    });
                  } catch(e) {
                    console.error("Dialogue sequence delayed error:", e);
                    this.forceVictoryScreen();
                  }
                });
              } catch(e) {
                console.error("Move player complete error:", e);
                this.forceVictoryScreen();
              }
            }
          });
        } catch(e) {
          console.error("Final strike error:", e);
          this.forceVictoryScreen();
        }
      };

      if (this.input && this.input.keyboard) {
        this.input.keyboard.once('keydown-SPACE', triggerFinalStrike);
      }
      this.input.once('pointerdown', triggerFinalStrike);

    } catch(e) {
      console.error("triggerBossDefeated outer error:", e);
      this.forceVictoryScreen();
    }
  }

  // --- PROCEDURAL RE-USABLE STICKMAN AND CAGE RENDERING FOR KHWEZI ---
  drawKhwezi(time: number) {
    if (!this.khweziGraphics) return;
    this.khweziGraphics.clear();

    // 1. Calculate breathing motion & sways
    let swayAngle = 0;
    let chestHeightScale = 1.0;
    let bobY = 0;

    if (this.khweziSwayActive) {
      const freq = this.khweziDoubleSway ? 0.007 : 0.0035;
      const amp = this.khweziDoubleSway ? 0.12 : 0.055;
      swayAngle = Math.sin(time * freq) * amp;
      chestHeightScale = 1.0 + Math.sin(time * 0.006) * 0.025;
      bobY = Math.sin(time * 0.005) * 1.5;
    }

    const baseHeadDroop = this.khweziHeadDroopAmount; // head droop
    const scale = 0.72; // Shorter stickman height (70% height)
    const strokeWidth = 2.0;

    // Anchor coordinates
    const anchorX = this.khweziX + this.khweziRecoilOffset;
    const anchorY = this.khweziY + bobY;

    // Joint placements
    const headCX = anchorX + Math.sin(swayAngle) * -12;
    const headCY = anchorY - 45 * scale + baseHeadDroop;

    const neckX = anchorX + Math.sin(swayAngle) * -4;
    const neckY = anchorY - 30 * scale;

    const pelvisX = anchorX;
    const pelvisY = anchorY + 10 * scale;

    const baseColor = this.khweziColorValue;
    const pulseFactor = this.khweziAlphaMin + Math.sin(time * 0.004) * (this.khweziAlphaTarget - this.khweziAlphaMin);

    this.khweziGraphics.lineStyle(strokeWidth, baseColor, pulseFactor);
    this.khweziGraphics.fillStyle(baseColor, pulseFactor);

    // Head outline (Slightly larger head ratio for younger sister)
    this.khweziGraphics.strokeCircle(headCX, headCY, 7.5);
    // Translucent core fill
    this.khweziGraphics.fillStyle(baseColor, pulseFactor * 0.25);
    this.khweziGraphics.fillCircle(headCX, headCY, 7.0);

    // Spine/Torso
    this.khweziGraphics.lineBetween(neckX, neckY, pelvisX, pelvisY);

    // arms
    if (this.cageActive) {
      // Arms folded snugly over chest (Captive posture)
      const rElbowX = neckX - 8;
      const rElbowY = neckY + 12;
      const rHandX = neckX + 11;
      const rHandY = neckY + 11;
      this.khweziGraphics.lineBetween(neckX, neckY, rElbowX, rElbowY);
      this.khweziGraphics.lineBetween(rElbowX, rElbowY, rHandX, rHandY);

      const lElbowX = neckX + 10;
      const lElbowY = neckY + 12;
      const lHandX = neckX - 9;
      const lHandY = neckY + 10;
      this.khweziGraphics.lineBetween(neckX, neckY, lElbowX, lElbowY);
      this.khweziGraphics.lineBetween(lElbowX, lElbowY, lHandX, lHandY);
    } else {
      // Free arms hang gently down sides
      const rShoulderX = neckX - 4;
      const lShoulderX = neckX + 4;

      const rElbowX = rShoulderX - 5 + Math.sin(time * 0.002) * 1.5;
      const rElbowY = neckY + 18 * scale * chestHeightScale;
      const rHandX = rElbowX - 1 + Math.sin(time * 0.002) * 1.0;
      const rHandY = rElbowY + 18 * scale;

      const lElbowX = lShoulderX + 5 - Math.sin(time * 0.002) * 1.5;
      const lElbowY = neckY + 18 * scale * chestHeightScale;
      const lHandX = lElbowX + 1 - Math.sin(time * 0.002) * 1.0;
      const lHandY = lElbowY + 18 * scale;

      this.khweziGraphics.lineBetween(rShoulderX, neckY, rElbowX, rElbowY);
      this.khweziGraphics.lineBetween(rElbowX, rElbowY, rHandX, rHandY);
      this.khweziGraphics.lineBetween(lShoulderX, neckY, lElbowX, lElbowY);
      this.khweziGraphics.lineBetween(lElbowX, lElbowY, lHandX, lHandY);
    }

    // Legs standing securely together
    const legL = 34 * scale;
    const rFootX = pelvisX - 3 + Math.sin(swayAngle) * 2;
    const rFootY = pelvisY + legL;

    const lFootX = pelvisX + 3 + Math.sin(swayAngle) * 2;
    const lFootY = pelvisY + legL;

    this.khweziGraphics.lineBetween(pelvisX, pelvisY, rFootX, rFootY);
    this.khweziGraphics.lineBetween(pelvisX, pelvisY, lFootX, lFootY);
  }

  drawCage(time: number) {
    if (!this.cageGraphics) return;
    this.cageGraphics.clear();

    const glowColor = this.cageGlowTint || 0xffa500; // Fierce orange glow for burning bars
    const baseColor = 0x222226; // Metallic iron framework
    const chainColor = 0x55555d; // Heavy gray chains
    const lockColor = 0x85660a; // Ancient brass padlock

    // A. Expanding shockwave base
    if (this.cageFlashCircleBase && this.cageFlashCircleBase.radius > 0) {
      this.cageGraphics.fillStyle(0xffffff, this.cageFlashCircleBase.alpha);
      this.cageGraphics.fillCircle(this.cageFlashCircleBase.x, this.cageFlashCircleBase.y, this.cageFlashCircleBase.radius);
    }

    // B. Drawing Bars
    this.cageBars.forEach((b: any) => {
      if (b.alpha <= 0) return;
      
      if (this.cageBarsShattered) {
        // Shattered flying bars
        this.cageGraphics.lineStyle(2.5, glowColor, b.alpha);
        this.cageGraphics.beginPath();
        const halfLen = 45;
        const dx = Math.cos(b.rotation) * halfLen;
        const dy = Math.sin(b.rotation) * halfLen;
        this.cageGraphics.moveTo(b.x - dx, b.y - dy);
        this.cageGraphics.lineTo(b.x + dx, b.y + dy);
        this.cageGraphics.strokePath();
      } else {
        // High fidelity shimmering glow layers
        const flamePulse = 0.55 + Math.sin(time * 0.012 + b.origX * 0.05) * 0.25;
        this.cageGraphics.lineStyle(4.5, glowColor, flamePulse * b.alpha);
        this.cageGraphics.lineBetween(b.x, 135, b.x, 225);

        this.cageGraphics.lineStyle(1.8, 0xffffff, b.alpha);
        this.cageGraphics.lineBetween(b.x, 135, b.x, 225);
      }
    });

    // C. Frame Structure: top / bottom/ left / right
    if (this.cageFrame.top.alpha > 0) {
      this.cageGraphics.lineStyle(4.5, baseColor, this.cageFrame.top.alpha);
      if (this.cageBarsShattered) {
        this.cageGraphics.beginPath();
        const dx = Math.cos(this.cageFrame.top.rotation) * 45;
        const dy = Math.sin(this.cageFrame.top.rotation) * 45;
        this.cageGraphics.moveTo(this.cageFrame.top.x - dx, this.cageFrame.top.y - dy);
        this.cageGraphics.lineTo(this.cageFrame.top.x + dx, this.cageFrame.top.y + dy);
        this.cageGraphics.strokePath();
      } else {
        this.cageGraphics.lineBetween(1005, 135, 1095, 135);
      }
    }

    if (this.cageFrame.bottom.alpha > 0) {
      this.cageGraphics.lineStyle(4.5, baseColor, this.cageFrame.bottom.alpha);
      if (this.cageBarsShattered) {
        this.cageGraphics.beginPath();
        const dx = Math.cos(this.cageFrame.bottom.rotation) * 45;
        const dy = Math.sin(this.cageFrame.bottom.rotation) * 45;
        this.cageGraphics.moveTo(this.cageFrame.bottom.x - dx, this.cageFrame.bottom.y - dy);
        this.cageGraphics.lineTo(this.cageFrame.bottom.x + dx, this.cageFrame.bottom.y + dy);
        this.cageGraphics.strokePath();
      } else {
        this.cageGraphics.lineBetween(1005, 225, 1095, 225);
      }
    }

    if (this.cageFrame.left.alpha > 0) {
      this.cageGraphics.lineStyle(4.0, baseColor, this.cageFrame.left.alpha);
      if (this.cageBarsShattered) {
        this.cageGraphics.beginPath();
        const dx = Math.cos(this.cageFrame.left.rotation) * 45;
        const dy = Math.sin(this.cageFrame.left.rotation) * 45;
        this.cageGraphics.moveTo(this.cageFrame.left.x - dx, this.cageFrame.left.y - dy);
        this.cageGraphics.lineTo(this.cageFrame.left.x + dx, this.cageFrame.left.y + dy);
        this.cageGraphics.strokePath();
      } else {
        this.cageGraphics.lineBetween(1005, 135, 1005, 225);
      }
    }

    if (this.cageFrame.right.alpha > 0) {
      this.cageGraphics.lineStyle(4.0, baseColor, this.cageFrame.right.alpha);
      if (this.cageBarsShattered) {
        this.cageGraphics.beginPath();
        const dx = Math.cos(this.cageFrame.right.rotation) * 45;
        const dy = Math.sin(this.cageFrame.right.rotation) * 45;
        this.cageGraphics.moveTo(this.cageFrame.right.x - dx, this.cageFrame.right.y - dy);
        this.cageGraphics.lineTo(this.cageFrame.right.x + dx, this.cageFrame.right.y + dy);
        this.cageGraphics.strokePath();
      } else {
        this.cageGraphics.lineBetween(1095, 135, 1095, 225);
      }
    }

    // Corner studs
    this.cageGraphics.fillStyle(0x777777, this.cageFrame.top.alpha);
    this.cageFrame.corners.forEach((c: any) => {
      if (c.alpha > 0) {
        this.cageGraphics.fillCircle(c.x, c.y, 3);
      }
    });

    // D. Heavy steel chains leading off to the dark ceiling anchor at 1160, 90
    this.cageChain.forEach((ch: any) => {
      if (ch.alpha <= 0) return;
      this.cageGraphics.save();
      this.cageGraphics.translateCanvas(ch.x, ch.y);
      const finalChainColor = ch.color || chainColor;
      this.cageGraphics.lineStyle(2.5, finalChainColor, ch.alpha);
      this.cageGraphics.strokeEllipse(0, 0, 7, 4);
      this.cageGraphics.restore();
    });

    // E. Heavy padlock locked at bottom center
    if (this.cageLock && this.cageLock.alpha > 0) {
      const lx = this.cageLock.x;
      const ly = this.cageLock.y;
      this.cageGraphics.fillStyle(lockColor, this.cageLock.alpha);
      this.cageGraphics.lineStyle(1.5, 0x111111, this.cageLock.alpha);
      this.cageGraphics.fillRoundedRect(lx - 5, ly - 3, 10, 8, 2);
      this.cageGraphics.strokeRoundedRect(lx - 5, ly - 3, 10, 8, 2);
      this.cageGraphics.beginPath();
      this.cageGraphics.arc(lx, ly - 3, 3.5, Math.PI, 0, false);
      this.cageGraphics.strokePath();
    }
  }

  triggerCageDestruction() {
    this.cageBarsShattered = true;

    // Scatter the bars violently outwards
    this.cageBars.forEach((b: any, index: number) => {
      const angle = -0.6 - index * 0.12 + Math.random() * 0.1;
      const speed = 190 + index * 10;
      this.tweens.add({
        targets: b,
        x: b.x + Math.cos(angle) * 360,
        y: b.y + Math.sin(angle) * 360 + 220,
        rotation: Math.PI * 5,
        alpha: 0,
        duration: 950,
        ease: 'Cubic.easeOut'
      });
    });

    // Scatter the frame pieces
    const parts = [this.cageFrame.top, this.cageFrame.bottom, this.cageFrame.left, this.cageFrame.right] as any[];
    parts.forEach((p, i) => {
      const angle = (i * Math.PI / 2) + 0.45;
      this.tweens.add({
        targets: p,
        x: p.x + Math.cos(angle) * 260,
        y: p.y + Math.sin(angle) * 260 + 120,
        rotation: Math.PI * 4,
        alpha: 0,
        duration: 850,
        ease: 'Cubic.easeOut'
      });
    });

    // Snap the ceiling chains
    this.cageChain.forEach((ch: any, i: number) => {
      const angle = -Math.PI / 4 + Math.random() * 0.4;
      this.tweens.add({
        targets: ch,
        x: ch.origX + Math.cos(angle) * 220 + (i * 10),
        y: ch.origY + Math.sin(angle) * 220 + 440 + (i * 20),
        alpha: 0,
        duration: 1100,
        ease: 'Cubic.easeIn'
      });
    });

    // Drop the broken padlock padlock downwards
    if (this.cageLock) {
      this.tweens.add({
        targets: this.cageLock,
        y: this.cageLock.y + 150,
        alpha: 0,
        duration: 550,
        ease: 'Quad.easeIn'
      });
    }

    // Flash white shockwave
    this.tweens.add({
      targets: this.cageFlashCircleBase,
      radius: 450,
      alpha: 0.9,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.cageFlashCircleBase,
          alpha: 0,
          duration: 250
        });
      }
    });

    // Re-orient Khwezi's posture and appearance
    this.khweziDoubleSway = false;
    this.khweziHeadDroopAmount = 0; // stands proud
    this.khweziColorValue = 0xffffff; // glow turns divine white
    this.khweziAlphaMin = 0.95;
    this.khweziAlphaTarget = 1.0;
    this.cageActive = false; // drop arms to sides
  }

  playWarmEndingTone() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const dest = ctx.destination;

      const playChimeHarmonic = (freq: number, start: number, duration: number, volFactor = 1.0) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(dest);

        osc.type = (Math.random() > 0.5) ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18 * volFactor, start + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.start(start);
        osc.stop(start + duration + 0.1);
      };

      const now = ctx.currentTime;
      playChimeHarmonic(174.61, now, 2.5, 1.0); // F3
      playChimeHarmonic(220.00, now + 0.12, 2.2, 0.82); // A3
      playChimeHarmonic(349.23, now + 0.25, 2.0, 0.45); // Octave F4
    } catch(e) {
      console.warn("Warm audio synth skipped:", e);
    }
  }

  createSisterDialogueSpeechBubble(actor: any, textText: string, type: 'jama' | 'sister', onComplete: () => void) {
    try {
      this.createSpeechBubble(actor, textText, type, onComplete);
    } catch (e) {
      console.error("Instant speech bubble fallback:", e);
      const waitTime = Math.max(1200, textText.length * 60);
      this.time.delayedCall(waitTime, onComplete);
    }
  }

  forceVictoryScreen() {
    console.warn('Force victory triggered');
    try {
      this.time.timeScale = 1;
      if (this.physics && this.physics.world) {
        this.physics.world.timeScale = 1;
      }
      this.time.removeAllEvents();
      this.tweens.killAll();
    } catch(e) {
      console.error('Error hard resetting in forceVictoryScreen:', e);
    }
    
    // Small delay then show victory ending screen
    setTimeout(() => {
      try {
        this.shutdownShrineScene();
        const currentKey = this.scene.key;
        this.scene.stop(currentKey);
        setTimeout(() => {
          this.scene.start('EndingCreditsScene');
        }, 150);
      } catch(e2) {
        console.error('Crucial failure in redirecting scene:', e2);
        // Direct browser/window level failover just in case Phaser is in terminal state
        updateReactState({ gameCompleted: true, activeScene: 'EndingCreditsScene' });
      }
    }, 500);
  }

  triggerPlayerDeath() {
    updateReactState({ isGameOver: true });
    this.player.setVelocity(0, 0);
    this.player.setAngle(90);

    this.time.delayedCall(1200, () => {
      try {
        this.shutdownShrineScene();
        const currentKey = this.scene.key;
        this.scene.stop(currentKey);
        setTimeout(() => {
          this.scene.start('GameOverScene');
        }, 150);
      } catch (e) {
        console.error('Shrine death transition failed:', e);
        this.scene.start('GameOverScene');
      }
    });
  }

  showFloatingText(x: number, y: number, textString: string, color: number) {
    const fText = this.add.text(x, y, textString, {
      fontFamily: 'Courier',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 3,
    });
    fText.setDepth(10);
    this.tweens.add({
      targets: fText,
      y: y - 45,
      alpha: 0,
      duration: 1000,
      onComplete: () => fText.destroy(),
    });
  }

  shutdownShrineScene() {
    if (this.spearParticles) this.spearParticles.destroy();
    if (this.impactParticles) this.impactParticles.destroy();
    if (this.radialParticles) this.radialParticles.destroy();
    this.telegraphMark.clear();

    // Increment player stats playtime
    if (this.startTime) {
      const elapsedSecs = Math.floor((this.time.now - this.startTime) / 1000);
      if (elapsedSecs > 0 && (window as any).incrementPlaytime) {
        (window as any).incrementPlaytime(elapsedSecs);
      }
      this.startTime = 0;
    }
  }

  triggerShieldBash() {
    if (this.isBlocking) return;
    const now = this.time.now;
    if (now - this.lastBashTime < 4000) return;
    this.lastBashTime = now;
    this.isShieldBashing = true;

    if (window.gameAudio) {
      window.gameAudio.playShieldBashSound();
    }

    const originalRotation = this.player.getData('facingAngle') ?? 0;
    const lungeX = Math.cos(originalRotation) * 45;
    const lungeY = Math.sin(originalRotation) * 45;

    updateReactState({ lastBashTime: now, bashCooldown: 4000 });

    this.tweens.add({
      targets: this.player,
      x: this.player.x + lungeX,
      y: this.player.y + lungeY,
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.isShieldBashing = false;
      }
    });

    const reach = 55;
    const damage = 15;

    // Check guards
    this.guardsGroup.getChildren().forEach((node) => {
      const enemy = node as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < reach) {
        const angleToEnemy = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
        const diff = Phaser.Math.Angle.ShortestBetween(originalRotation, angleToEnemy);
        if (Math.abs(diff) < 1.3) {
          this.hitGuard(enemy, damage, lungeX * 2.0, lungeY * 2.0);
        }
      }
    });

    // Check boss
    if (this.boss && this.boss.active) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
      if (dist < reach + 20) { // Boss is larger!
        const angleToBoss = Math.atan2(this.boss.y - this.player.y, this.boss.x - this.player.x);
        const diff = Phaser.Math.Angle.ShortestBetween(originalRotation, angleToBoss);
        if (Math.abs(diff) < 1.3) {
          const isPhase1OrMinionsAlive = (this.bossPhase === 1 || this.bossPhaseActiveMinionsAlive);
          if (isPhase1OrMinionsAlive) {
            this.showFloatingText(this.boss.x, this.boss.y - 45, "RESISTED", 0xcccccc);
            if (window.gameAudio) window.gameAudio.playSfx('click');
          } else {
            this.damageBoss(damage, lungeX * 2.0, lungeY * 2.0);
            this.bossIsStaggered = true;
            this.bossStaggerEndTime = now + 2000;
            this.showFloatingText(this.boss.x, this.boss.y - 45, "STAGGERED!", 0x4a9eff);

            this.tweens.add({
              targets: this.boss,
              x: this.boss.x + lungeX * 0.4,
              y: this.boss.y + lungeY * 0.4,
              duration: 100,
              yoyo: true,
              repeat: 4
            });
          }
        }
      }
    }
  }

  drawWeapons() {
    if (!this.player || !this.player.active) {
      if (this.spearGraphics) this.spearGraphics.clear();
      if (this.shieldGraphics) this.shieldGraphics.clear();
      return;
    }
    
    if (this.spearGraphics) this.spearGraphics.clear();
    if (this.shieldGraphics) this.shieldGraphics.clear();
    
    const isFlipped = this.player.flipX;
    const directionFactor = isFlipped ? -1 : 1;
    
    const isWalking = (Math.abs(this.player.body.velocity.x) > 10 || Math.abs(this.player.body.velocity.y) > 10);
    const bobY = isWalking ? Math.sin(this.time.now * 0.012) * 2.5 : 0;
    
    if (this.isAttacking) {
      this.spearGraphics.setDepth(2.1);
      this.shieldGraphics.setDepth(1.85);

      this.spearGraphics.setPosition(0, 0); // draw absolutely
      this.spearGraphics.setRotation(0);
      this.spearGraphics.setScale(1, 1);
      
      const facingAngle = this.player.getData('facingAngle') ?? 0;
      const spearX = Math.cos(facingAngle) * 12;
      const spearY = Math.sin(facingAngle) * 12 + bobY;
      
      const startX = this.player.x + spearX - Math.cos(facingAngle) * 12;
      const startY = this.player.y + spearY - Math.sin(facingAngle) * 12;
      const endX = this.player.x + spearX + Math.cos(facingAngle) * 28;
      const endY = this.player.y + spearY + Math.sin(facingAngle) * 28;
      
      this.spearGraphics.lineStyle(3, 0x8B5E3C, 1.0);
      this.spearGraphics.lineBetween(startX, startY, endX, endY);
      
      const tipAngle = facingAngle;
      const tipLength = 6;
      const tX = endX + Math.cos(tipAngle) * tipLength;
      const tY = endY + Math.sin(tipAngle) * tipLength;
      
      const leftAngle = tipAngle + Math.PI * 5/6;
      const rightAngle = tipAngle - Math.PI * 5/6;
      const cornerWidth = 3;
      const lX = endX + Math.cos(leftAngle) * cornerWidth;
      const lY = endY + Math.sin(leftAngle) * cornerWidth;
      const rX = endX + Math.cos(rightAngle) * cornerWidth;
      const rY = endY + Math.sin(rightAngle) * cornerWidth;
      
      this.spearGraphics.fillStyle(this.jamaWhiteGlowActive ? 0xf5c842 : 0xC0C0C0, 1.0);
      this.spearGraphics.fillTriangle(lX, lY, rX, rY, tX, tY);
      
    } else {
      this.spearGraphics.setDepth(1.85);
      this.shieldGraphics.setDepth(2.1);
      
      let raiseAngle = 0;
      if (this.spearRaiseProgress > 0) {
        raiseAngle = -this.spearRaiseProgress * (75 * Math.PI / 180) * directionFactor;
      }
      const spearAngle = ((15 * Math.PI / 180) * directionFactor) + raiseAngle;
      const handX = 12 * directionFactor;
      const handY = 4 + bobY - (this.spearRaiseProgress * 10);
      
      this.spearGraphics.setPosition(this.player.x + handX, this.player.y + handY);
      this.spearGraphics.setRotation(spearAngle);
      this.spearGraphics.setScale(1, 1);
      
      this.spearGraphics.lineStyle(2.5, 0x8B5E3C, 1.0);
      this.spearGraphics.lineBetween(0, -28, 0, 12);
      
      this.spearGraphics.fillStyle(this.jamaWhiteGlowActive ? 0xf5c842 : 0xC0C0C0, 1.0);
      this.spearGraphics.fillTriangle(-3, -28, 3, -28, 0, -34);
    }
    
    const sHandX = -12 * directionFactor;
    const sHandY = 4 + bobY;
    let shieldScale = 1.0;
    if (this.isBlocking) {
      shieldScale = 1.35;
    }
    
    const shieldTilt = -0.15 * directionFactor;
    
    this.shieldGraphics.setPosition(this.player.x + sHandX, this.player.y + sHandY);
    this.shieldGraphics.setScale(shieldScale, shieldScale);
    this.shieldGraphics.setRotation(shieldTilt);
    
    if (this.isBlocking) {
      this.shieldGraphics.fillStyle(0x4a9eff, 0.35);
      this.shieldGraphics.fillEllipse(0, 0, 20, 26);
    }
    
    this.shieldGraphics.fillStyle(0x5C3D1E, 1.0);
    this.shieldGraphics.fillEllipse(0, 0, 16, 22);
    
    let rimColor = this.jamaWhiteGlowActive ? 0xf5c842 : 0x8B6914;
    if (this.shieldFlashState === 'gold') {
      rimColor = 0xFFD700;
    } else if (this.shieldFlashState === 'blue') {
      rimColor = 0x4a9eff;
    }
    
    this.shieldGraphics.lineStyle(2, rimColor, 1.0);
    this.shieldGraphics.strokeEllipse(0, 0, 16, 22);
    
    this.shieldGraphics.fillStyle(rimColor, 1.0);
    this.shieldGraphics.fillCircle(0, 0, 4);
    
    this.shieldGraphics.lineStyle(1.5, 0x3d2000, 0.6);
    this.shieldGraphics.lineBetween(-5, -5, 5, 5);
    this.shieldGraphics.lineBetween(-5, 5, 5, -5);

    this.drawJamaOutline();
  }

  drawJamaOutline() {
    if (!this.player || !this.player.active || !this.jamaOutlineGraphics) return;

    this.jamaOutlineGraphics.clear();

    const plX = this.player.x;
    const plY = this.player.y;

    if (this.bossPhase === 2 && this.bossPhaseActiveMinionsAlive) {
      this.jamaGoldenOutlineAlpha = 0.25;
    }

    if (this.jamaGoldenOutlineAlpha > 0) {
      this.jamaOutlineGraphics.lineStyle(2.0, 0xf5c842, this.jamaGoldenOutlineAlpha);
      this.jamaOutlineGraphics.strokeCircle(plX, plY - 18, 7);
      this.jamaOutlineGraphics.lineBetween(plX, plY - 11, plX, plY + 10);
      const directionFactor = this.player.flipX ? -1 : 1;
      const bobY = (Math.abs(this.player.body.velocity.x) > 10 || Math.abs(this.player.body.velocity.y) > 10) ? Math.sin(this.time.now * 0.012) * 2.5 : 0;
      this.jamaOutlineGraphics.lineBetween(plX - 10 * directionFactor, plY - 4 + bobY, plX + 10 * directionFactor, plY - 4 + bobY);
      this.jamaOutlineGraphics.lineBetween(plX, plY + 10, plX - 8, plY + 23);
      this.jamaOutlineGraphics.lineBetween(plX, plY + 10, plX + 8, plY + 23);
    }

    if (this.jamaWhiteGlowActive) {
      this.jamaOutlineGraphics.lineStyle(2.5, 0xffffff, 0.4);
      this.jamaOutlineGraphics.strokeCircle(plX, plY - 18, 8);
      this.jamaOutlineGraphics.lineBetween(plX, plY - 11, plX, plY + 10);
      const directionFactor = this.player.flipX ? -1 : 1;
      const bobY = (Math.abs(this.player.body.velocity.x) > 10 || Math.abs(this.player.body.velocity.y) > 10) ? Math.sin(this.time.now * 0.012) * 2.5 : 0;
      this.jamaOutlineGraphics.lineBetween(plX - 11 * directionFactor, plY - 4 + bobY, plX + 11 * directionFactor, plY - 4 + bobY);
      this.jamaOutlineGraphics.lineBetween(plX, plY + 10, plX - 9, plY + 24);
      this.jamaOutlineGraphics.lineBetween(plX, plY + 10, plX + 9, plY + 24);
    }
  }

  createInstantSpeechBubble(sourceObject: any, textString: string, duration: number, onComplete: () => void) {
    const bubbleContainer = this.add.container(sourceObject.x, sourceObject.y - 100);
    bubbleContainer.setDepth(100);

    const graphics = this.add.graphics();
    bubbleContainer.add(graphics);

    const bubbleWidth = 300;
    const bubbleHeight = 90;

    const bgColor = 0x000d05;
    const strokeColor = 0xffffff;
    const plateColor = '#f5c842';
    const textColor = '#ffffff';
    const plateText = "J A M A";

    for (let g = 1; g <= 5; g++) {
      graphics.lineStyle(g * 3, strokeColor, 0.08 / g);
      graphics.strokeRoundedRect(-bubbleWidth / 2 - g * 1.5, -bubbleHeight - g * 1.5, bubbleWidth + g * 3, bubbleHeight + g * 3, 8);
    }

    graphics.fillStyle(bgColor, 1.0);
    graphics.lineStyle(2, strokeColor, 1.0);
    graphics.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);
    graphics.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight, bubbleWidth, bubbleHeight, 8);

    graphics.fillStyle(bgColor, 1.0);
    graphics.beginPath();
    graphics.moveTo(-10, 0);
    graphics.lineTo(10, 0);
    graphics.lineTo(0, 18);
    graphics.closePath();
    graphics.fillPath();

    graphics.lineStyle(2, strokeColor, 1.0);
    graphics.beginPath();
    graphics.moveTo(-10, 0);
    graphics.lineTo(0, 18);
    graphics.lineTo(10, 0);
    graphics.strokePath();

    graphics.lineStyle(3.5, bgColor, 1.0);
    graphics.lineBetween(-8, -1, 8, -1);

    graphics.lineStyle(1, strokeColor, 0.7);
    graphics.lineBetween(-bubbleWidth / 2 + 18, -bubbleHeight + 22, bubbleWidth / 2 - 18, -bubbleHeight + 22);

    const namePlate = this.add.text(-bubbleWidth / 2 + 18, -bubbleHeight + 7, plateText, {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '11px',
      color: plateColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    bubbleContainer.add(namePlate);

    const txt = this.add.text(-bubbleWidth / 2 + 18, -bubbleHeight + 28, textString, {
      fontFamily: '"Space Grotesk", "Courier New", Courier, monospace',
      fontSize: '13px',
      color: textColor,
      wordWrap: { width: bubbleWidth - 36 },
      fontStyle: 'bold',
    });
    bubbleContainer.add(txt);

    if (window.gameAudio) {
       window.gameAudio.playSfx('click');
    }

    this.time.delayedCall(duration, () => {
       if (this.tweens) {
         this.tweens.add({
           targets: bubbleContainer,
           alpha: 0,
           duration: 300,
           onComplete: () => {
              bubbleContainer.destroy();
              onComplete();
           }
         });
       } else {
         bubbleContainer.destroy();
         onComplete();
       }
    });

    const followTimer = this.time.addEvent({
       delay: 16,
       loop: true,
       callback: () => {
          if (sourceObject && sourceObject.active && bubbleContainer && bubbleContainer.active) {
             bubbleContainer.setPosition(sourceObject.x, sourceObject.y - 90);
          } else {
             followTimer.destroy();
          }
       }
    });
  }

  triggerJamaComebackDialogue() {
    this.gameplayStarted = false;
    this.isTransitioningPhase = true;
    this.player.setVelocity(0, 0);
    this.boss.setVelocity(0, 0);
    if (this.player.body) this.player.body.reset(this.player.x, this.player.y);
    if (this.boss.body) this.boss.body.reset(this.boss.x, this.boss.y);

    this.player.flipX = (this.boss.x < this.player.x);

    this.tweens.add({
      targets: this,
      jamaGoldenOutlineAlpha: 0,
      duration: 800
    });

    this.cameras.main.zoomTo(1.15, 1500, 'Sine.easeInOut');

    this.tweens.add({
      targets: this,
      spearRaiseProgress: 1,
      duration: 800,
      ease: 'Linear',
      onComplete: () => {
        this.showJamaSpeechBubble(1);
      }
    });
  }

  showJamaSpeechBubble(index: number) {
    if (index === 1) {
      this.createInstantSpeechBubble(
        this.player,
        "Scared I'll defeat you...\n...so you send your minions my way.\nTypical.",
        2200,
        () => this.showJamaSpeechBubble(2)
      );
    } else if (index === 2) {
      this.createInstantSpeechBubble(
        this.player,
        "You're weak.\nFeeding on innocent souls just to grow your power.\nThat's all you are.",
        2200,
        () => this.showJamaSpeechBubble(3)
      );
    } else if (index === 3) {
      this.createInstantSpeechBubble(
        this.player,
        "You'll never win.\nGood triumphs over evil.\nEvery single time.",
        2200,
        () => this.showJamaSpeechBubble(4)
      );
    } else if (index === 4) {
      this.createInstantSpeechBubble(
        this.player,
        "You made one mistake, Nkanyamba.\nYou picked the wrong sister.",
        2200,
        () => this.showJamaSpeechBubble(5)
      );
    } else if (index === 5) {
      this.createInstantSpeechBubble(
        this.player,
        "Now you'll pay the price.\nYou're dead.",
        3000,
        () => {
          this.playHeavyHeartbeat();
          this.time.delayedCall(800, () => {
            this.triggerWhiteFlashDivineStrength();
          });
        }
      );
    }
  }

  triggerWhiteFlashDivineStrength() {
    if (window.gameAudio) {
      window.gameAudio.stopBossDrone();
    }

    const darkScreenOverlay = this.add.graphics();
    darkScreenOverlay.fillStyle(0x000000, 1.0);
    darkScreenOverlay.fillRect(0, 0, 1280, 720);
    darkScreenOverlay.setScrollFactor(0);
    darkScreenOverlay.setDepth(500);
    darkScreenOverlay.alpha = 0;

    // Define emergency unfreeze safety net fallback
    const unfreezeTimeout = this.time.delayedCall(5000, () => {
      console.warn('Unfreeze fallback triggered');
      
      this.isTransitioningPhase = false;
      this.finalFightActive = true;
      this.finalFightStartTime = this.time.now;
      
      // Force everything back to active gameplay
      this.gameplayStarted = true;
      this.cutsceneComplete = true;
      this.input.enabled = true;
      
      if (this.physics && this.physics.world) {
        if (this.physics.world.isPaused) {
          this.physics.resume();
        }
      }
      this.time.timeScale = 1;
      this.physics.world.timeScale = 1;

      // Reset movement flags
      this.moveUp = false;
      this.moveDown = false;
      this.moveLeft = false;
      this.moveRight = false;

      if (this.player && this.player.active) {
        if (this.player.body) {
          this.player.body.enable = true;
        }
        this.player.setVelocity(0, 0);
      }
      if (this.boss && this.boss.active) {
        if (this.boss.body) {
          this.boss.body.enable = true;
        }
        this.boss.setVelocity(0, 0);
      }

      // Re-enable React/Phaser buttons if exist/applicable
      const reactNavButtons = [
         this.upButton, this.downButton, this.leftButton, this.rightButton
      ];
      reactNavButtons.forEach(btn => {
         if (btn && btn.setAlpha) {
           try { btn.setAlpha(1); } catch (e) {}
         }
      });
    });

    this.tweens.add({
      targets: darkScreenOverlay,
      alpha: 0.4,
      duration: 400,
      onComplete: () => {
        try {
          const jCircle = this.add.graphics();
          jCircle.setDepth(490);

          this.jamaGoldenOutlineAlpha = 0.8;
          
          const outlinePulseTimer = this.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => {
              try {
                if (this.jamaGoldenOutlineAlpha === 0.8) {
                  this.jamaGoldenOutlineAlpha = 0.5;
                } else {
                  this.jamaGoldenOutlineAlpha = 0.8;
                }
              } catch (e) {
                console.error('Pulse timer error:', e);
              }
            }
          });

          this.tweens.addCounter({
            from: 0,
            to: 80,
            duration: 600,
            ease: 'Quad.easeIn',
            onUpdate: (tw) => {
              try {
                jCircle.clear();
                jCircle.fillStyle(0xffffff, 0.6);
                jCircle.fillCircle(this.player.x, this.player.y, tw.getValue());
              } catch (e) {
                console.error('Circle tw onUpdate error:', e);
              }
            },
            onComplete: () => {
              try {
                jCircle.destroy();
                outlinePulseTimer.destroy();

                const whiteOverlay = this.add.graphics();
                whiteOverlay.fillStyle(0xffffff, 1.0);
                whiteOverlay.fillRect(0, 0, 1280, 720);
                whiteOverlay.setScrollFactor(0);
                whiteOverlay.setDepth(600);

                this.playDivineChord();

                this.time.delayedCall(200, () => {
                  try {
                    darkScreenOverlay.destroy();
                    
                    this.jamaWhiteGlowActive = true;
                    this.jamaChanged = true;
                    this.jamaGoldenOutlineAlpha = 0;

                    this.tweens.add({
                      targets: whiteOverlay,
                      alpha: 0,
                      duration: 800,
                      onComplete: () => {
                        try {
                          whiteOverlay.destroy();
                          
                          const whisper = this.add.text(this.player.x, this.player.y + 40, "", {
                            fontFamily: '"Space Grotesk", "Courier New", monospace',
                            fontSize: '12px',
                            color: '#f5c842',
                            fontStyle: 'bold',
                            stroke: '#000000',
                            strokeThickness: 2,
                          });
                          whisper.setOrigin(0.5);
                          whisper.setDepth(1.9);
                          whisper.alpha = 0.45;

                          const textStr = "The spirits of good are with you.";
                          let charCount = 0;
                          const whisperTimer = this.time.addEvent({
                            delay: 80,
                            repeat: textStr.length - 1,
                            callback: () => {
                              try {
                                charCount++;
                                if (whisper && whisper.active) {
                                  whisper.setText(textStr.substring(0, charCount));
                                }
                              } catch (e) {
                                console.error('WhisperTimer char update error:', e);
                              }
                            }
                          });

                          this.tweens.add({
                            targets: whisper,
                            y: this.player.y - 40,
                            alpha: 0,
                            duration: 3000,
                            onComplete: () => {
                              try {
                                whisperTimer.destroy();
                                whisper.destroy();
                              } catch (e) {
                                console.error('Whisper destroy error:', e);
                              }
                            }
                          });

                          this.cameras.main.zoomTo(1.0, 600, 'Linear');
                          
                          this.time.delayedCall(600, () => {
                            try {
                              this.isTransitioningPhase = false;
                              this.finalFightActive = true;
                              this.finalFightStartTime = this.time.now;
                              
                              if (window.gameAudio) {
                                if (typeof window.gameAudio.startBossDrone === 'function') {
                                  window.gameAudio.startBossDrone();
                                }
                              }
                              
                              // Force physics world resume and make sure player/boss bodies are enabled
                              if (this.physics && this.physics.world) {
                                if (this.physics.world.isPaused) {
                                  this.physics.resume();
                                }
                              }
                              
                              if (this.player && this.player.body) {
                                this.player.body.enable = true;
                                this.player.setVelocity(0, 0);
                              }
                              if (this.boss && this.boss.body) {
                                this.tweens.killTweensOf(this.boss);
                                this.boss.body.enable = true;
                                this.boss.setVelocity(0, 0);
                                this.bossPhaseActiveMinionsAlive = false;
                              }

                              // Cancel the emergency fallback timeout
                              try { unfreezeTimeout.remove(); } catch(e) {}

                              if (this.boss && this.boss.active) {
                                this.createSpeechBubble(this.boss, "Impossible... what is this light?!", 'nkanyamba', () => {
                                  try {
                                    this.gameplayStarted = true;
                                    this.lastBossAttackTime = this.time.now; // Reset boss attack timer to prevent insta-hit
                                  } catch (e) {
                                    console.error('Final dialogue onComplete error:', e);
                                    this.gameplayStarted = true;
                                  }
                                });
                              } else {
                                this.gameplayStarted = true;
                              }
                            } catch (e) {
                              console.error('Final delayedCall sequence error:', e);
                              this.gameplayStarted = true;
                              this.gameplayStarted = true;
                            }
                          });
                        } catch (e) {
                          console.error('whiteOverlay fadeout complete error:', e);
                          this.gameplayStarted = true;
                        }
                      }
                    });
                  } catch (e) {
                    console.error('darkScreenOverlay destroy delayedCall error:', e);
                    this.gameplayStarted = true;
                  }
                });
              } catch (e) {
                console.error('addCounter onComplete error:', e);
                this.gameplayStarted = true;
              }
            }
          });
        } catch (e) {
          console.error('darkScreenOverlay fadein onComplete error:', e);
          this.gameplayStarted = true;
        }
      }
    });

    this.playHeavyHeartbeat();
  }

  playDivineChord() {
    try {
      const AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const dest = ctx.destination;
      const now = ctx.currentTime;

      // Master gain for the global envelope (Attack 0ms, hold 200ms, decay 800ms)
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.0, now);
      masterGain.gain.setValueAtTime(1.0, now + 0.2); // hold 200ms
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0); // decay over 800ms
      masterGain.connect(dest);

      // Layer 1: 55Hz, gain 0.3
      const osc55 = ctx.createOscillator();
      const gain55 = ctx.createGain();
      osc55.frequency.setValueAtTime(55, now);
      gain55.gain.setValueAtTime(0.3, now);
      osc55.connect(gain55);
      gain55.connect(masterGain);

      // Layer 2: 110Hz, gain 0.15
      const osc110 = ctx.createOscillator();
      const gain110 = ctx.createGain();
      osc110.frequency.setValueAtTime(110, now);
      gain110.gain.setValueAtTime(0.15, now);
      osc110.connect(gain110);
      gain110.connect(masterGain);

      // Layer 3: 220Hz, gain 0.08
      const osc220 = ctx.createOscillator();
      const gain220 = ctx.createGain();
      osc220.frequency.setValueAtTime(220, now);
      gain220.gain.setValueAtTime(0.08, now);
      osc220.connect(gain220);
      gain220.connect(masterGain);

      osc55.start(now);
      osc110.start(now);
      osc220.start(now);

      osc55.stop(now + 1.2);
      osc110.stop(now + 1.2);
      osc220.stop(now + 1.2);
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  }

  playHeavyHeartbeat() {
    try {
      const AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const dest = ctx.destination;
      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.4, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      masterGain.connect(dest);

      const osc40 = ctx.createOscillator();
      osc40.frequency.setValueAtTime(45, now);
      osc40.connect(masterGain);

      osc40.start(now);
      osc40.stop(now + 0.6);
    } catch (e) {
      console.warn('AudioContext heartbeat failed:', e);
    }
  }

  spawnGuard(x: number, y: number) {
    const guard = this.guardsGroup.create(x, y, 'wraith') as Phaser.Physics.Arcade.Sprite;
    guard.setTint(0x8B1A1A); // base enemy body tint
    guard.setData('hp', 50); // double HP
    guard.setCollideWorldBounds(true);
    guard.setDepth(1.5);

    // Call the unified glow creator
    attachEnemyGlow(this, guard);
  }

  extinguishCandles() {
    this.candles.forEach((candle, idx) => {
      this.time.delayedCall(idx * 3000 + 1000, () => {
        if (candle && candle.active) {
          candle.setData('burning', false);
          this.showFloatingText(candle.getData('x'), candle.getData('y') - 10, "CANDLE EXTINGUISHED", 0x8a2be2);
          if (window.gameAudio) window.gameAudio.playSfx('click');
        }
      });
    });
  }

  drawCandles(time: number) {
    this.candles.forEach(candle => {
      if (!candle || !candle.active) return;
      candle.clear();
      const cx = candle.getData('x');
      const cy = candle.getData('y');
      const isBurning = candle.getData('burning');

      if (isBurning) {
        // Candle stick
        candle.fillStyle(0xd5ba95, 1.0);
        candle.fillRect(cx - 5, cy - 15, 10, 30);
        candle.lineStyle(1.5, 0x222222, 1.0);
        candle.strokeRect(cx - 5, cy - 15, 10, 30);

        // Flame flicker
        const flicker = 1.0 + Math.sin(time * 0.08) * 0.2;
        candle.fillStyle(0xffaa00, 0.85);
        candle.beginPath();
        candle.moveTo(cx, cy - 15);
        candle.lineTo(cx - 4, cy - 22);
        candle.lineTo(cx, cy - 22 - 6 * flicker);
        candle.lineTo(cx + 4, cy - 22);
        candle.closePath();
        candle.fillPath();

        // Inner hot core
        candle.fillStyle(0xffffff, 0.9);
        candle.fillCircle(cx, cy - 20, 2);
      } else {
        // Extinguished grey candle stick
        candle.fillStyle(0xa19688, 1.0);
        candle.fillRect(cx - 5, cy - 15, 10, 30);
        candle.lineStyle(1.5, 0x222222, 1.0);
        candle.strokeRect(cx - 5, cy - 15, 10, 30);

        // Thin dark wick
        candle.lineStyle(2.0, 0x111111, 1.0);
        candle.lineBetween(cx, cy - 15, cx, cy - 17);
      }
    });
  }
}

// 8. ENDING SCENE (VICTORY / DAWN)
export class EndingScene extends Phaser.Scene {
  private endingData: any;
  private currentCinematic: number = 1;
  private runTick: number = 0;
  
  private renderGraphics!: Phaser.GameObjects.Graphics;
  private dialogueGraphics!: Phaser.GameObjects.Graphics;

  private jamaHistory: { x: number; y: number }[] = [];
  private khweziHistory: { x: number; y: number }[] = [];

  private jama!: { x: number; y: number };
  private khwezi!: { x: number; y: number };
  private onezwa!: { x: number; y: number; alpha: number; armAngle: number; isGesturing: boolean };

  private dewdrops: { x: number; y: number }[] = [];
  private flowers: { x: number; y: number; stemLen: number; color: string; swaySpeed: number; swayPhase: number }[] = [];
  private trees: { x: number; y: number; r: number; color: string }[] = [];
  private bushes: { x: number; y: number; size: number }[] = [];
  private birds: { x: number; y: number; speed: number; scale: number; wobblePhase: number }[] = [];
  private goldenMotes: { x: number; y: number; speed: number; size: number; alpha: number }[] = [];

  private villagers: { x: number; y: number; scale: number; armsRaised: boolean; raisedTime: number; jumpOffset: number; isJumping: boolean }[] = [];
  private villageFloaterTexts: { x: number; y: number; text: string; alpha: number; yOffset: number }[] = [];
  private huts: { x: number; y: number; w: number; h: number; roofH: number }[] = [];

  private activeBubbleSpeaker: string = "";
  private activeBubbleText: string = "";
  private activeBubbleTyped: string = "";
  private activeBubbleX: number = 0;
  private activeBubbleY: number = 0;
  private activeBubbleVisible: boolean = false;
  private activeBubbleColor: number = 0x00ffa3;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private fadeAlpha: number = 1;

  private bubbleLabelObject: Phaser.GameObjects.Text | null = null;
  private bubbleTextObject: Phaser.GameObjects.Text | null = null;
  private screenTexts: Phaser.GameObjects.Text[] = [];
  private finalButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('EndingScene');
  }

  init(data?: any) {
    this.endingData = {
      difficulty: (data && data.difficulty) || window.gameState.difficulty || 'medium',
      enemiesDefeated: (data && typeof data.enemiesDefeated === 'number') ? data.enemiesDefeated : (window.gameState.score || 0),
      artifactsCollected: (data && typeof data.artifactsCollected === 'number') ? data.artifactsCollected : (window.gameState.artifactsCollected ? window.gameState.artifactsCollected.length : 0),
      elapsedTime: (data && typeof data.elapsedTime === 'number') ? data.elapsedTime : (window.gameState.timer || 0)
    };
  }

  create() {
    updateReactState({ activeScene: 'EndingScene' });
    if (window.gameAudio) {
      window.gameAudio.setMusicTheme('ending');
    }

    this.renderGraphics = this.add.graphics().setDepth(10);
    this.dialogueGraphics = this.add.graphics().setDepth(40);

    // Initial asset declarations
    this.dewdrops = [];
    for (let i = 0; i < 45; i++) {
      this.dewdrops.push({ x: Math.random() * 1280, y: 350 + Math.random() * 370 });
    }

    this.flowers = [];
    const colors = ['#ff6b9d', '#ff9e3d', '#ffd166', '#06d6a0', '#a8dadc', '#e8985e'];
    for (let i = 0; i < 40; i++) {
      this.flowers.push({
        x: 40 + Math.random() * 1200,
        y: 380 + Math.random() * 340,
        stemLen: 8 + Math.round(Math.random() * 6),
        color: colors[Math.floor(Math.random() * colors.length)],
        swaySpeed: 0.03 + Math.random() * 0.04,
        swayPhase: Math.random() * Math.PI * 2
      });
    }

    this.trees = [];
    const treeCols = ['#203d15', '#2a4d1b', '#1a3211', '#325d23'];
    for (let i = 0; i < 12; i++) {
      this.trees.push({
        x: 50 + i * 110 + Math.random() * 40,
        y: 280 + Math.random() * 60,
        r: 32 + Math.random() * 22,
        color: treeCols[Math.floor(Math.random() * treeCols.length)]
      });
    }

    this.bushes = [];
    for (let i = 0; i < 15; i++) {
      this.bushes.push({ x: Math.random() * 1280, y: 340 + Math.random() * 380, size: 15 + Math.random() * 15 });
    }

    this.goldenMotes = [];
    for (let i = 0; i < 20; i++) {
      this.goldenMotes.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        speed: 0.4 + Math.random() * 0.7,
        size: 1.5 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.4
      });
    }

    this.birds = [];
    for (let i = 0; i < 5; i++) {
      this.birds.push({
        x: -100 - i * 160,
        y: 60 + Math.random() * 90,
        speed: 0.8 + Math.random() * 0.7,
        scale: 0.7 + Math.random() * 0.4,
        wobblePhase: Math.random() * Math.PI * 2
      });
    }

    this.villagers = [];
    for (let i = 0; i < 10; i++) {
      this.villagers.push({
        x: 180 + i * 100 + (Math.random() * 20 - 10),
        y: 440 + Math.random() * 180,
        scale: 0.9 + Math.random() * 0.15,
        armsRaised: false,
        raisedTime: 0,
        jumpOffset: 0,
        isJumping: false
      });
    }

    this.huts = [
      { x: 120, y: 320, w: 75, h: 50, roofH: 35 },
      { x: 380, y: 310, w: 85, h: 60, roofH: 40 },
      { x: 740, y: 315, w: 80, h: 55, roofH: 38 },
      { x: 980, y: 330, w: 90, h: 65, roofH: 45 },
      { x: 1150, y: 310, w: 75, h: 50, roofH: 35 }
    ];

    // Boot Phase 1
    this.setPhase(1);
  }

  setPhase(phaseNum: number) {
    this.currentCinematic = phaseNum;
    this.clearAllScreenTexts();
    this.jamaHistory = [];
    this.khweziHistory = [];
    this.activeBubbleVisible = false;
    if (this.bubbleLabelObject) this.bubbleLabelObject.destroy();
    if (this.bubbleTextObject) this.bubbleTextObject.destroy();
    if (this.typewriterTimer) this.typewriterTimer.destroy();

    if (phaseNum === 1) {
      this.jama = { x: 640, y: 150 };
      this.khwezi = { x: 605, y: 165 };
      this.fadeAlpha = 1;

      this.tweens.add({ targets: this.jama, x: 640, y: 650, duration: 3500 });
      this.tweens.add({ targets: this.khwezi, x: 605, y: 630, duration: 3500 });
      this.tweens.add({ targets: this, fadeAlpha: 0, duration: 800 });

      this.time.delayedCall(3200, () => {
        this.tweens.add({ targets: this, fadeAlpha: 1, duration: 300 });
      });
      this.time.delayedCall(3500, () => this.setPhase(2));
    }
    else if (phaseNum === 2) {
      this.jama = { x: 640, y: 100 };
      this.khwezi = { x: 605, y: 115 };
      this.fadeAlpha = 1;

      this.tweens.add({ targets: this.jama, x: 640, y: 650, duration: 2200 });
      this.tweens.add({ targets: this.khwezi, x: 605, y: 630, duration: 2200 });
      this.tweens.add({ targets: this, fadeAlpha: 0, duration: 300 });

      this.time.delayedCall(1900, () => {
        this.tweens.add({ targets: this, fadeAlpha: 1, duration: 300 });
      });
      this.time.delayedCall(2200, () => this.setPhase(3));
    }
    else if (phaseNum === 3) {
      this.jama = { x: -50, y: 520 };
      this.khwezi = { x: -100, y: 525 };
      this.fadeAlpha = 1;

      this.tweens.add({ targets: this.jama, x: 1330, y: 520, duration: 4000 });
      this.tweens.add({ targets: this.khwezi, x: 1280, y: 525, duration: 4000 });
      this.tweens.add({ targets: this, fadeAlpha: 0, duration: 400 });

      const chEvent = this.time.addEvent({
        delay: 1000,
        callback: () => { if (this.currentCinematic === 3) this.playPeacefulForestSound(); },
        loop: true
      });

      this.time.delayedCall(3600, () => {
        this.tweens.add({ targets: this, fadeAlpha: 1, duration: 400 });
      });
      this.time.delayedCall(4000, () => {
        chEvent.destroy();
        this.setPhase(4);
      });
    }
    else if (phaseNum === 4) {
      this.jama = { x: -50, y: 520 };
      this.khwezi = { x: -100, y: 525 };
      this.fadeAlpha = 1;

      this.villagers.forEach(v => { v.armsRaised = false; v.isJumping = false; v.jumpOffset = 0; });

      this.tweens.add({ targets: this.jama, x: 400, y: 520, duration: 1500, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: this.khwezi, x: 340, y: 525, duration: 1500, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: this, fadeAlpha: 0, duration: 400 });

      this.time.delayedCall(1500, () => {
        this.villagers.forEach((vl, i) => {
          this.time.delayedCall(i * 150, () => {
            if (this.currentCinematic === 4) {
              vl.armsRaised = true;
              vl.isJumping = true;
              if (i % 2 === 0) this.spawnVillageFloatingText(vl.x, vl.y - 45, Math.random() > 0.5 ? "!" : "!!");
            }
          });
        });
      });

      this.time.delayedCall(3200, () => this.setPhase(5));
    }
    else if (phaseNum === 5) {
      this.jama = { x: 400, y: 520 };
      this.khwezi = { x: 340, y: 525 };
      this.onezwa = { x: 650, y: 512, alpha: 0, armAngle: 0.2, isGesturing: false };
      this.fadeAlpha = 0;

      this.villagers.forEach(v => { v.armsRaised = true; v.isJumping = true; });

      this.tweens.add({
        targets: this.onezwa,
        alpha: 0.8,
        duration: 1200,
        onComplete: () => {
          this.playOnezwaFadingChord();
          this.startOnezwaDialogueSequence();
        }
      });
    }
    else if (phaseNum === 6) {
      this.jama = { x: 620, y: 460 };
      this.khwezi = { x: 660, y: 465 };
      this.fadeAlpha = 1;

      this.villagers.forEach(v => { v.armsRaised = true; v.isJumping = true; });
      this.tweens.add({ targets: this, fadeAlpha: 0, duration: 800 });

      this.time.delayedCall(500, () => {
        const t1 = this.createScreenText(640, 120, "The village of Emnyameni welcomed them home.", '"Space Grotesk", "Courier New", monospace', '16px', '#f5c842', 'center', 'bold');
        this.tweens.add({ targets: t1, alpha: 1, duration: 800 });
      });

      this.time.delayedCall(2500, () => {
        const t2 = this.createScreenText(640, 540, "As dawn broke over the forest,\nthe darkness that had haunted\nthose hills for generations...\nlifted.", '"JetBrains Mono", "Courier New", monospace', '12px', '#ffffff');
        this.tweens.add({ targets: t2, alpha: 0.8, duration: 800 });
      });

      this.time.delayedCall(4200, () => {
        const t3 = this.createScreenText(640, 640, "And the forest, at last, was at peace.", '"Space Grotesk", "Courier New", monospace', '15px', '#00FFA3', 'center', 'bold');
        this.tweens.add({ targets: t3, alpha: 1, duration: 800 });
      });

      this.time.delayedCall(8200, () => {
        this.tweens.add({ targets: this, fadeAlpha: 1, duration: 1000 });
      });
      this.time.delayedCall(9300, () => this.setPhase(7));
    }
    else if (phaseNum === 7) {
      this.fadeAlpha = 1;
      this.playOnezwaFadingChord();
      this.tweens.add({ targets: this, fadeAlpha: 0, duration: 1000 });

      this.time.delayedCall(1600, () => {
        const c1 = this.createScreenText(640, 110, "THE NIGHT FOREST", '"Space Grotesk", "Courier New", monospace', '24px', '#f5c842', 'center', 'bold');
        this.tweens.add({ targets: c1, alpha: 1, duration: 800 });
      });

      this.time.delayedCall(3000, () => {
        const c2 = this.createScreenText(640, 180, "A story of love, courage,\nand the unseen forces that walk with us.", '"JetBrains Mono", "Courier New", monospace', '13px', '#2D7A4F');
        this.tweens.add({ targets: c2, alpha: 1, duration: 800 });
      });

      this.time.delayedCall(4500, () => {
        const scoreVal = this.endingData.enemiesDefeated;
        const artifactsVal = this.endingData.artifactsCollected;
        const totalSecs = this.endingData.elapsedTime;
        const mins = Math.floor(totalSecs / 60);
        const secs = Math.floor(totalSecs % 60);
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        const diffVal = (this.endingData.difficulty || 'MEDIUM').toUpperCase();

        const s1 = this.createScreenText(640, 235, "────────────────────────────────────────", '"JetBrains Mono", "Courier New", monospace', '12px', '#295a3a');
        const s2 = this.createScreenText(640, 255, `Difficulty Level:      ${diffVal}`, '"JetBrains Mono", "Courier New", monospace', '12px', '#87d0a1');
        const s3 = this.createScreenText(640, 275, `Time Survived:         ${timeStr}`, '"JetBrains Mono", "Courier New", monospace', '12px', '#87d0a1');
        const s4 = this.createScreenText(640, 295, `Malevolent Defeated:   ${scoreVal}`, '"JetBrains Mono", "Courier New", monospace', '12px', '#87d0a1');
        const s5 = this.createScreenText(640, 315, `Relics Reassembled:    ${artifactsVal} / 5`, '"JetBrains Mono", "Courier New", monospace', '12px', '#87d0a1');
        const s6 = this.createScreenText(640, 335, "────────────────────────────────────────", '"JetBrains Mono", "Courier New", monospace', '12px', '#295a3a');

        this.tweens.add({ targets: [s1, s2, s3, s4, s5, s6], alpha: 1, duration: 800 });
      });

      this.time.delayedCall(6500, () => {
        const c3 = this.createScreenText(640, 375, "Thank you for playing.", '"Space Grotesk", "Courier New", monospace', '14px', '#00FFA3', 'center', 'bold');
        this.tweens.add({ targets: c3, alpha: 1, duration: 800 });
      });

      this.time.delayedCall(8000, () => {
        const c4 = this.createScreenText(640, 430, "May you always choose\nto walk in the light.", '"JetBrains Mono", "Courier New", monospace', '12px', '#ffffff', 'center', 'italic');
        this.tweens.add({ targets: c4, alpha: 0.7, duration: 800 });
      });

      this.time.delayedCall(10000, () => {
        const c5 = this.createScreenText(640, 490, "Built with Phaser 3  •  The Night Forest © 2026", '"JetBrains Mono", "Courier New", monospace', '11px', '#2D7A4F');
        this.tweens.add({ targets: c5, alpha: 0.5, duration: 800 });
      });

      this.time.delayedCall(12000, () => {
        const q1 = this.createScreenText(640, 535, "The forest has always known what you are.", '"Space Grotesk", "Courier New", monospace', '14px', '#f5c842', 'center', 'bold');
        this.tweens.add({ targets: q1, alpha: 1, duration: 1000 });
      });

      this.time.delayedCall(13500, () => {
        const q2 = this.createScreenText(640, 570, "The question is —", '"Space Grotesk", "Courier New", monospace', '15px', '#ffffff', 'center', 'bold');
        this.tweens.add({ targets: q2, alpha: 1, duration: 1000 });
      });

      this.time.delayedCall(14700, () => {
        try { if (window.gameAudio) window.gameAudio.playSfx('relic'); } catch(e){}
        const q3 = this.createScreenText(640, 610, "Do you?", '"Space Grotesk", "Courier New", monospace', '20px', '#f5c842', 'center', 'bold');
        this.tweens.add({ targets: q3, alpha: 1, duration: 1000 });
      });

      this.time.delayedCall(16500, () => this.displayEndGameMenus());
    }
  }

  private startOnezwaDialogueSequence() {
    const dialogue = [
      { speaker: "ONEZWA", text: "You have done well, Jama.\nThe forest saw your courage\nfrom the very first step." },
      { speaker: "ONEZWA", text: "Do not let others tell you\nthe forest is evil.\nIt never was.\nIt was merely overrun." },
      { speaker: "ONEZWA", text: "When you needed strength,\nthe forest gave it.\nWhen you needed courage,\nyour ancestors stood beside you.\nYou were never alone.\nNot for a single moment.", gesture: true },
      { speaker: "ONEZWA", text: "After your triumph,\nlet the villagers know —\nGod rewards courage.\nHe meets those who try,\nhalfway." },
      { speaker: "ONEZWA", text: "Go home and rest,\nlittle Khwezi." },
      { speaker: "KHWEZI", text: "Thank you." },
      { speaker: "ONEZWA", text: "The forest will remember you,\nJama.\nGo well." }
    ];

    let currentMsgIdx = 0;

    const playNextMsg = () => {
      if (currentMsgIdx >= dialogue.length) {
        this.tweens.add({
          targets: this.onezwa,
          alpha: 0,
          duration: 1500,
          onComplete: () => {
            this.playOnezwaFadingChord();
            this.time.delayedCall(1500, () => {
              this.tweens.add({ targets: this, fadeAlpha: 1, duration: 1000 });
              this.time.delayedCall(1100, () => this.setPhase(6));
            });
          }
        });
        return;
      }

      const item = dialogue[currentMsgIdx];
      
      if (item.gesture) {
        this.onezwa.isGesturing = true;
        this.tweens.add({ targets: this.onezwa, armAngle: -0.6, duration: 800, ease: 'Cubic.easeOut' });
      }

      const speakColor = item.speaker === "KHWEZI" ? 0xaaccff : 0xffea00;
      const speakHexStr = item.speaker === "KHWEZI" ? '#aaccff' : '#ffea00';
      const bubbleTargetX = item.speaker === "KHWEZI" ? this.khwezi.x : this.onezwa.x;
      const bubbleTargetY = item.speaker === "KHWEZI" ? this.khwezi.y - 45 : this.onezwa.y - 120;

      this.activeBubbleSpeaker = item.speaker;
      this.activeBubbleText = item.text;
      this.activeBubbleTyped = "";
      this.activeBubbleX = bubbleTargetX;
      this.activeBubbleY = bubbleTargetY;
      this.activeBubbleColor = speakColor;
      this.activeBubbleVisible = true;

      let charIdx = 0;
      this.typewriterTimer = this.time.addEvent({
        delay: 30,
        callback: () => {
          if (charIdx < item.text.length) {
            this.activeBubbleTyped += item.text[charIdx];
            charIdx++;
            try {
              if (window.gameAudio && charIdx % 2 === 0) {
                window.gameAudio.playSfx('click');
              }
            } catch(sfxErr){}

            this.updateBubbleTextObjects(bubbleTargetX, bubbleTargetY, this.activeBubbleTyped, item.speaker, speakHexStr);
          } else {
            this.typewriterTimer!.destroy();
            this.time.delayedCall(1800, () => {
              this.activeBubbleVisible = false;
              if (this.bubbleLabelObject) this.bubbleLabelObject.destroy();
              if (this.bubbleTextObject) this.bubbleTextObject.destroy();
              
              if (item.gesture) {
                this.tweens.add({ targets: this.onezwa, armAngle: 0.2, duration: 600 });
              }

              currentMsgIdx++;
              this.time.delayedCall(300, playNextMsg);
            });
          }
        },
        loop: true
      });
    };

    playNextMsg();
  }

  private updateBubbleTextObjects(x: number, y: number, typedText: string, speaker: string, colorHexStr: string) {
    if (this.bubbleTextObject) this.bubbleTextObject.destroy();
    if (this.bubbleLabelObject) this.bubbleLabelObject.destroy();

    const lines = typedText.split("\n");
    let maxW = 120;
    lines.forEach(l => {
      const w = l.length * 7;
      if (w > maxW) maxW = w;
    });
    maxW = Math.min(300, maxW + 20);
    const bubbleH = lines.length * 16 + 20;
    const bubbleW = maxW + 28;
    const bx = x - bubbleW / 2;
    const by = y - bubbleH - 15;

    this.bubbleLabelObject = this.add.text(bx + 14, by + 8, speaker, {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '9px',
      color: colorHexStr,
      fontStyle: 'bold'
    }).setDepth(50);

    this.bubbleTextObject = this.add.text(bx + 14, by + 20, typedText, {
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontSize: '11px',
      color: '#ffffff',
      lineSpacing: 4
    }).setDepth(50);
  }

  private createScreenText(x: number, y: number, text: string, fontFamily: string, fontSize: string, color: string, align: string = 'center', fontStyle: string = '', alpha: number = 0): Phaser.GameObjects.Text {
    const txt = this.add.text(x, y, text, {
      fontFamily,
      fontSize,
      color,
      align,
      fontStyle,
      wordWrap: { width: 900 }
    }).setOrigin(0.5).setAlpha(alpha).setDepth(30);
    this.screenTexts.push(txt);
    return txt;
  }

  private clearAllScreenTexts() {
    this.screenTexts.forEach(t => { if (t && t.active) t.destroy(); });
    this.screenTexts = [];
  }

  private displayEndGameMenus() {
    const playAgain = this.add.container(480, 665);
    this.finalButtons.push(playAgain);

    const playAgainBg = this.add.graphics();
    playAgainBg.fillStyle(0x0a1014, 0.6);
    playAgainBg.lineStyle(2, 0x00FFA3, 1.0);
    playAgainBg.fillRoundedRect(-110, -22, 220, 44, 6);
    playAgainBg.strokeRoundedRect(-110, -22, 220, 44, 6);
    playAgain.add(playAgainBg);

    const playAgainTxt = this.add.text(0, 0, "PLAY AGAIN", {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '13px',
      color: '#00FFA3',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    playAgain.add(playAgainTxt);

    playAgainBg.setInteractive(new Phaser.Geom.Rectangle(-110, -22, 220, 44), Phaser.Geom.Rectangle.Contains);
    playAgainBg.on('pointerover', () => {
      this.input.setDefaultCursor('pointer');
      this.tweens.add({ targets: playAgain, scale: 1.05, duration: 150 });
      try { if (window.gameAudio) window.gameAudio.playSfx('click'); } catch(e){}
    });
    playAgainBg.on('pointerout', () => {
      this.input.setDefaultCursor('default');
      this.tweens.add({ targets: playAgain, scale: 1.0, duration: 150 });
    });
    playAgainBg.on('pointerdown', () => {
      this.input.setDefaultCursor('default');
      try { if (window.gameAudio) window.gameAudio.playSfx('relic'); } catch(e){}
      updateReactState({
        health: 100,
        score: 0,
        timer: 0,
        isGameOver: false,
        gameCompleted: false,
        activeScene: 'DifficultyScene'
      });
      window.gameState.health = 100;
      window.gameState.score = 0;
      window.gameState.timer = 0;
      window.gameState.isGameOver = false;
      window.gameState.gameCompleted = false;
      this.scene.start('DifficultyScene');
    });

    const mainMenu = this.add.container(800, 665);
    this.finalButtons.push(mainMenu);

    const mainMenuBg = this.add.graphics();
    mainMenuBg.fillStyle(0x0a1014, 0.6);
    mainMenuBg.lineStyle(2, 0x2D7A4F, 1.0);
    mainMenuBg.fillRoundedRect(-110, -22, 220, 44, 6);
    mainMenuBg.strokeRoundedRect(-110, -22, 220, 44, 6);
    mainMenu.add(mainMenuBg);

    const mainMenuTxt = this.add.text(0, 0, "MAIN MENU", {
      fontFamily: '"Space Grotesk", "Courier New", monospace',
      fontSize: '13px',
      color: '#2D7A4F',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    mainMenu.add(mainMenuTxt);

    mainMenuBg.setInteractive(new Phaser.Geom.Rectangle(-110, -22, 220, 44), Phaser.Geom.Rectangle.Contains);
    mainMenuBg.on('pointerover', () => {
      this.input.setDefaultCursor('pointer');
      this.tweens.add({ targets: mainMenu, scale: 1.05, duration: 150 });
      try { if (window.gameAudio) window.gameAudio.playSfx('click'); } catch(e){}
    });
    mainMenuBg.on('pointerout', () => {
      this.input.setDefaultCursor('default');
      this.tweens.add({ targets: mainMenu, scale: 1.0, duration: 150 });
    });
    mainMenuBg.on('pointerdown', () => {
      this.input.setDefaultCursor('default');
      try { if (window.gameAudio) window.gameAudio.playSfx('relic'); } catch(e){}
      updateReactState({
        health: 100,
        score: 0,
        timer: 0,
        isGameOver: false,
        gameCompleted: false,
        activeScene: 'MainMenuScene'
      });
      window.gameState.health = 100;
      window.gameState.score = 0;
      window.gameState.timer = 0;
      window.gameState.isGameOver = false;
      window.gameState.gameCompleted = false;
      this.scene.start('MainMenuScene');
    });

    playAgain.setAlpha(0);
    mainMenu.setAlpha(0);
    this.tweens.add({ targets: [playAgain, mainMenu], alpha: 1, duration: 800 });
  }

  // SOUND HELPERS
  private playPeacefulForestSound() {
    try {
      const AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const dest = ctx.destination;
      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.015, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      masterGain.connect(dest);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, now);
      osc.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.8);
    } catch(e){}
  }

  private playOnezwaFadingChord() {
    try {
      const AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const dest = ctx.destination;
      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.035, now);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
      masterGain.connect(dest);

      const frequencies = [523.25, 659.25, 783.99, 987.77];
      frequencies.forEach(f => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);
        osc.connect(masterGain);
        osc.start(now);
        osc.stop(now + 3.0);
      });
    } catch(e){}
  }

  // RENDER GRAPHIC SUB-ROUTINES
  private drawHut(v: any, shiftY = 0) {
    const g = this.renderGraphics;
    const hy = v.y + shiftY;
    
    // Clay walls
    g.fillStyle(0xbc9355, 1);
    g.fillRect(v.x - v.w / 2, hy - v.h, v.w, v.h);
    g.lineStyle(1.5, 0x6b4618, 1);
    g.lineBetween(v.x - v.w / 2, hy, v.x + v.w / 2, hy - v.h);
    g.lineBetween(v.x + v.w / 2, hy, v.x - v.w / 2, hy - v.h);
    g.strokeRect(v.x - v.w / 2, hy - v.h, v.w, v.h);

    // Thatch roof
    g.fillStyle(0xa27e3d);
    g.beginPath();
    g.moveTo(v.x - v.w / 2 - 10, hy - v.h);
    g.lineTo(v.x + v.w / 2 + 10, hy - v.h);
    g.lineTo(v.x, hy - v.h - v.roofH);
    g.closePath();
    g.fillPath();

    g.lineStyle(1.0, 0x735624, 0.6);
    g.lineBetween(v.x, hy - v.h - v.roofH, v.x - v.w / 2 - 6, hy - v.h);
    g.lineBetween(v.x, hy - v.h - v.roofH, v.x - v.w / 4, hy - v.h);
    g.lineBetween(v.x, hy - v.h - v.roofH, v.x + v.w / 4, hy - v.h);
    g.lineBetween(v.x, hy - v.h - v.roofH, v.x + v.w / 2 + 6, hy - v.h);
    g.lineStyle(1.5, 0x513511, 1).strokePath();

    // Doorway
    g.fillStyle(0x3d2000).fillRect(v.x - 7, hy - 20, 14, 20);
    g.lineStyle(1.2, 0x1f0f00, 1).strokeRect(v.x - 7, hy - 20, 14, 20);

    // Rising smoke
    const smokeVal = (this.runTick * 0.04) % 1;
    g.lineStyle(1.5, 0xdddddd, 0.4 * (1 - smokeVal));
    g.beginPath().moveTo(v.x, hy - v.h - v.roofH).lineTo(v.x + Math.sin(this.runTick * 0.08) * 10, hy - v.h - v.roofH - 50 * smokeVal).strokePath();
  }

  private drawShrineEscape() {
    const g = this.renderGraphics;
    g.fillStyle(0x070a0e, 1).fillRect(0, 0, 1280, 720);
    
    // Columns
    g.fillStyle(0x1d2126).lineStyle(2, 0x272e36, 1);
    [80, 280, 950, 1150].forEach(cx => {
      g.fillRect(cx, 0, 48, 720).strokeRect(cx, -2, 48, 724);
    });

    // Gateway portals
    g.fillStyle(0x111317).fillCircle(640, 630, 120);
    g.fillStyle(0x000000).fillCircle(640, 630, 95).fillRect(545, 630, 190, 100);
    g.lineStyle(3, 0x2c353d, 1).strokeCircle(640, 630, 95);
    g.lineStyle(3, 0x485663, 1).strokeCircle(640, 630, 120);
  }

  private drawPassageway() {
    const g = this.renderGraphics;
    g.fillStyle(0x0b0e12, 1).fillRect(0, 0, 1280, 720);
    g.fillStyle(0x13171c).fillRect(0, 0, 440, 720).fillRect(840, 0, 440, 720);
    g.lineStyle(2.5, 0x232c36, 1).lineBetween(440, 0, 440, 720).lineBetween(840, 0, 840, 720);

    g.lineStyle(1.5, 0x1d242d, 0.85);
    for (let y = 30; y < 720; y += 90) {
      g.lineBetween(0, y, 440, y);
      g.lineBetween(840, y, 1280, y);
    }

    g.fillStyle(0x111317).fillCircle(640, 630, 120);
    g.fillStyle(0xf5c842, 0.12 * (0.55 + Math.sin(this.runTick * 0.08) * 0.15)).fillCircle(640, 630, 110);
    g.fillStyle(0x000000).fillCircle(640, 630, 95).fillRect(545, 630, 190, 100);

    g.lineStyle(3, 0x3d3a35, 1).strokeCircle(640, 630, 95);
    for (let x = 555; x < 730; x += 30) {
      g.lineBetween(x, 535, x, 552);
    }

    // Shadow Mask Lantern bounds
    g.fillStyle(0x000000, 0.45);
    g.fillRect(440, 0, 400, this.jama.y - 140);
    g.fillRect(440, this.jama.y + 140, 400, 720 - (this.jama.y + 140));
    g.fillRect(440, this.jama.y - 140, this.jama.x - 175 - 440, 280);
    g.fillRect(this.jama.x + 175, this.jama.y - 140, 840 - (this.jama.x + 175), 280);
  }

  private drawDawnForest(time: number) {
    const g = this.renderGraphics;
    g.fillStyle(0x12240b, 1).fillRect(0, 0, 1280, 720);
    g.fillStyle(0xff8a3a, 0.15).fillRect(0, 0, 1280, 120);
    g.fillStyle(0xffd166, 0.28).fillCircle(1150, 80, 45);

    g.lineStyle(1.5, 0xffd166, 0.15);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + time * 0.0002;
      g.lineBetween(1150, 80, 1150 + Math.cos(ang) * 90, 80 + Math.sin(ang) * 90);
    }

    this.dewdrops.forEach(d => {
      g.fillStyle(0xaaddff, 0.45).fillCircle(d.x, d.y, 2);
    });

    this.trees.forEach(t => {
      g.fillStyle(0x4a3118, 1).fillRect(t.x - 5, t.y, 10, 720 - t.y);
      g.lineStyle(1, 0x221307, 1).strokeRect(t.x - 5, t.y, 10, 720 - t.y);
      try {
        g.fillStyle(parseInt(t.color.replace("#", "0x")), 0.95).fillCircle(t.x, t.y, t.r);
        g.fillStyle(0x111111, 0.18).fillCircle(t.x, t.y, t.r * 0.8);
        g.lineStyle(2, 0xffd166, 0.35).beginPath().arc(t.x, t.y, t.r - 2, -Math.PI / 3, Math.PI / 6, false).strokePath();
      } catch(e){}
    });

    this.birds.forEach(b => {
      const y = b.y + Math.sin(b.wobblePhase + time * 0.005) * 14;
      g.lineStyle(2, 0x111a0d, 0.7).beginPath();
      const flap = Math.sin(time * 0.012 + b.wobblePhase) * 6;
      g.moveTo(b.x - 14 * b.scale, y - flap).lineTo(b.x, y).lineTo(b.x + 14 * b.scale, y - flap).strokePath();
      
      b.x += b.speed;
      if (b.x > 1380) {
        b.x = -120;
        b.y = 60 + Math.random() * 100;
        b.speed = 0.8 + Math.random() * 0.7;
      }
    });

    this.goldenMotes.forEach(m => {
      g.fillStyle(0xffd166, m.alpha).fillCircle(m.x, m.y, m.size);
      m.y -= m.speed;
      if (m.y < -10) {
        m.y = 730;
        m.x = Math.random() * 1280;
      }
    });
  }

  private drawDawnForestFG() {
    const g = this.renderGraphics;
    this.bushes.forEach(b => {
      g.fillStyle(0x234215, 0.9).fillCircle(b.x, b.y, b.size).fillCircle(b.x - b.size * 0.5, b.y + b.size * 0.2, b.size * 0.8).fillCircle(b.x + b.size * 0.5, b.y + b.size * 0.2, b.size * 0.8);
    });

    this.flowers.forEach(f => {
      const sway = Math.sin(this.runTick * 0.04 + f.swayPhase) * 0.15;
      const tx = f.x + Math.sin(sway) * f.stemLen;
      const ty = f.y - f.stemLen;

      g.lineStyle(1.5, 0x245419, 1).lineBetween(f.x, f.y, tx, ty);
      try {
        g.fillStyle(parseInt(f.color.replace("#", "0x")), 1);
        for (let i = 0; i < 5; i++) {
          g.fillCircle(tx + Math.cos((i / 5) * Math.PI * 2 + sway * 0.8) * 4.5, ty + Math.sin((i / 5) * Math.PI * 2 + sway * 0.8) * 4.5, 3.2);
        }
        g.fillStyle(0xffd166, 1).fillCircle(tx, ty, 2.5);
      } catch(e){}
    });
  }

  private drawVillageBG(time: number) {
    const g = this.renderGraphics;
    g.fillStyle(0xff8d52).fillRect(0, 0, 1280, 200);
    g.fillStyle(0x8caad4).fillRect(0, 200, 1280, 160);

    g.fillStyle(0x13300f).beginPath().moveTo(0, 360);
    for (let x = 0; x < 1290; x += 30) {
      g.lineTo(x, 345 + Math.sin(x * 0.015) * 8);
    }
    g.lineTo(1280, 360).closePath().fillPath();

    g.fillStyle(0x764c18).fillRect(0, 360, 1280, 360);

    this.huts.forEach(hut => this.drawHut(hut));

    this.goldenMotes.forEach(m => {
      g.fillStyle(0xffecb3, m.alpha * 0.6).fillCircle(m.x, m.y, m.size);
      m.y += m.speed * 0.3;
      m.x += Math.sin(time * 0.002 + m.y) * 0.2;
      if (m.y > 730) {
        m.y = -10;
        m.x = Math.random() * 1280;
      }
    });

    this.drawVillageParticlesText();
    this.drawVillagers(time);
  }

  private drawVillageParticlesText() {
    this.villageFloaterTexts.forEach((t, i) => {
      const label = this.add.text(t.x, t.y - t.yOffset, t.text, {
        fontFamily: '"Space Grotesk", "Courier New", monospace',
        fontSize: '11px',
        color: '#f5c842',
        fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(t.alpha).setDepth(25);

      t.yOffset += 0.8;
      t.alpha -= 0.016;

      this.time.delayedCall(40, () => label.destroy());
      if (t.alpha <= 0) {
        this.villageFloaterTexts.splice(i, 1);
      }
    });
  }

  private drawVillagers(time: number) {
    const g = this.renderGraphics;
    this.villagers.forEach(v => {
      let vy = v.y;
      if (v.isJumping) vy += -Math.sin((time * 0.01 + v.x) % Math.PI) * 12;

      const s = v.scale;
      const th = 26 * s;
      const lh = 30 * s;
      const col = 0x4282eb;

      g.lineStyle(2.5, col, 0.95).fillStyle(col, 0.95);
      g.strokeCircle(v.x, vy - th - 12 * s, 6.5 * s).fillStyle(col, 0.24).fillCircle(v.x, vy - th - 12 * s, 6.0 * s).lineBetween(v.x, vy - th, v.x, vy);

      if (v.isJumping && vy - v.y < -3) {
        g.lineBetween(v.x, vy, v.x - 6 * s, vy + lh * 0.4).lineBetween(v.x - 6 * s, vy + lh * 0.4, v.x - 3 * s, vy + lh * 0.8);
        g.lineBetween(v.x, vy, v.x + 6 * s, vy + lh * 0.4).lineBetween(v.x + 6 * s, vy + lh * 0.4, v.x + 3 * s, vy + lh * 0.8);
      } else {
        g.lineBetween(v.x, vy, v.x - 4 * s, vy + lh).lineBetween(v.x, vy, v.x + 4 * s, vy + lh);
      }

      if (v.armsRaised) {
        const wave = Math.sin(time * 0.015 + v.x) * 4 * s;
        g.lineBetween(v.x, vy - th, v.x - 10 * s, vy - th - 12 * s + wave).lineBetween(v.x, vy - th, v.x + 10 * s, vy - th - 12 * s - wave);
      } else {
        g.lineBetween(v.x, vy - th, v.x - 6 * s, vy - th + th * 0.6).lineBetween(v.x, vy - th, v.x + 6 * s, vy - th + th * 0.6);
      }
    });
  }

  private spawnVillageFloatingText(x: number, y: number, text: string) {
    this.villageFloaterTexts.push({ x, y, text, alpha: 1.0, yOffset: 0 });
  }

  private drawOnezwa(time: number) {
    const g = this.renderGraphics;
    const oz = this.onezwa;
    
    // Large sun-like glowing halo
    const pulseFactor = 0.9 + Math.sin(time * 0.0035) * 0.15;
    g.fillStyle(0xFF8800, 0.16 * oz.alpha * pulseFactor).fillCircle(oz.x, oz.y - 35, 80);
    g.fillStyle(0xFFEA00, 0.22 * oz.alpha * pulseFactor).fillCircle(oz.x, oz.y - 35, 50);

    const s = 1.7; // Large size
    const th = 30 * s;
    const lh = 36 * s;
    const col = 0xFFEA00; // Bright sun yellow
    const alpha = oz.alpha;

    g.lineStyle(3.5, col, alpha).fillStyle(col, alpha);
    const headY = oz.y - th - 16;
    g.strokeCircle(oz.x, headY, 12).fillStyle(col, alpha * 0.55).fillCircle(oz.x, headY, 11).lineBetween(oz.x, oz.y - th, oz.x, oz.y);

    const drift = Math.sin(time * 0.002) * 2.0;
    g.lineBetween(oz.x, oz.y, oz.x - 7 + drift, oz.y + lh).lineBetween(oz.x, oz.y, oz.x + 7 + drift, oz.y + lh);

    const rSh = oz.x - 5;
    const lSh = oz.x + 5;

    if (oz.isGesturing) {
      g.lineBetween(lSh, oz.y - th, lSh + 24, oz.y - th + Math.sin(oz.armAngle) * 40);
      g.lineBetween(rSh, oz.y - th, rSh - 12, oz.y - th + 24);
    } else {
      g.lineBetween(rSh, oz.y - th, rSh - 15, oz.y - th + 24).lineBetween(lSh, oz.y - th, lSh + 15, oz.y - th + 24);
    }
  }

  private drawStoryCardBG(time: number) {
    const g = this.renderGraphics;
    g.fillStyle(0xff994a, 1).fillRect(0, 0, 1280, 220);
    g.fillStyle(0x73a4cf, 1).fillRect(0, 220, 1280, 190);

    g.fillStyle(0x132d10, 1).beginPath().moveTo(0, 410);
    for (let x = 0; x < 1290; x += 40) {
      g.lineTo(x, 390 + Math.sin(x * 0.02) * 12);
    }
    g.lineTo(1280, 410).closePath().fillPath();
    g.fillStyle(0x86602c, 1).fillRect(0, 410, 1280, 310);

    this.huts.forEach(hut => {
      this.drawHut({ x: hut.x, y: hut.y + 115, w: hut.w, h: hut.h, roofH: hut.roofH });
    });

    this.villagers.forEach(v => {
      const cx = v.x < 640 ? v.x - 120 : v.x + 120;
      const cy = v.y + 10;

      g.lineStyle(2, 0x4282eb, 0.7);
      g.strokeCircle(cx, cy - 35, 6).lineBetween(cx, cy - 29, cx, cy).lineBetween(cx, cy, cx - 4, cy + 24).lineBetween(cx, cy, cx + 4, cy + 24);

      const wave = Math.sin(time * 0.01 + v.x) * 6;
      g.lineBetween(cx, cy - 29, cx - 10, cy - 38 + wave).lineBetween(cx, cy - 29, cx + 10, cy - 38 - wave);
    });
  }

  private drawStoryCardFG() {
    const g = this.renderGraphics;
    this.goldenMotes.forEach(m => {
      g.fillStyle(0x00ffa3, m.alpha * 0.35).fillCircle(m.x, m.y, m.size * 1.5);
      m.y += m.speed * 0.5;
      m.x += Math.sin(this.runTick * 0.05 + m.y) * 0.4;
      if (m.y > 730) {
        m.y = -10;
        m.x = Math.random() * 1280;
      }
    });
  }

  private drawCreditsBG() {
    const g = this.renderGraphics;
    g.fillStyle(0x05080c, 1).fillRect(0, 0, 1280, 720);

    g.fillStyle(0x0b1a13, 1).beginPath().moveTo(0, 720).lineTo(0, 640);
    for (let tx = 30; tx < 1290; tx += 60) {
      g.lineTo(tx, 640 + Math.sin(tx * 0.01) * 20);
    }
    g.lineTo(1280, 640).lineTo(1280, 720).closePath().fillPath();

    this.goldenMotes.forEach(m => {
      const twinkle = 0.4 + Math.sin(this.runTick * 0.04 + m.x) * 0.3;
      g.fillStyle(0xffffff, m.alpha * twinkle).fillCircle(m.x, m.y * 0.8, 1);
    });
  }

  private drawSpeechBubble(canvas: Phaser.GameObjects.Graphics, x: number, y: number, text: string, speaker: string, color: number) {
    const lines = text.split("\n");
    let maxW = 120;
    lines.forEach(l => {
      const w = l.length * 7;
      if (w > maxW) maxW = w;
    });
    maxW = Math.min(300, maxW + 20);
    
    const bubbleH = lines.length * 16 + 20;
    const bubbleW = maxW + 28;
    const bx = x - bubbleW / 2;
    const by = y - bubbleH - 15;

    canvas.fillStyle(0x0c0f13, 1.0).lineStyle(2, color, 1.0);
    canvas.fillRoundedRect(bx, by, bubbleW, bubbleH, 6).strokeRoundedRect(bx, by, bubbleW, bubbleH, 6);
    
    canvas.beginPath().moveTo(x - 8, by + bubbleH).lineTo(x, by + bubbleH + 10).lineTo(x + 8, by + bubbleH).closePath().fillPath().strokePath();
    canvas.lineStyle(2.5, 0x0c0f13, 1.0).lineBetween(x - 7, by + bubbleH, x + 7, by + bubbleH);
  }

  // CORE STICKMAN COMPACT COMPREHENSIVE DRAWER
  private drawStickman(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, color: number, alpha: number, runTick: number, isKhwezi: boolean, glanceBack: boolean = false, targetArmX?: number, targetArmY?: number) {
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

    if (targetArmX !== undefined && targetArmY !== undefined) {
      g.lineBetween(x, y - torsoL, targetArmX, targetArmY);
      g.lineBetween(x - 2, y - torsoL, x - 6 * scale, y - torsoL + 12 * scale);
    } else {
      g.lineBetween(x - 2, y - torsoL, x + sL * stride, y - torsoL + armL);
      g.lineBetween(x + 2, y - torsoL, x + sR * stride, y - torsoL + armL);
    }
  }

  update(time: number, delta: number) {
    try {
      this.runTick += 0.015 * delta;
      this.renderGraphics.clear();
      this.dialogueGraphics.clear();

      if (this.currentCinematic === 1) {
        this.drawShrineEscape();
        
        this.jamaHistory.push({ x: this.jama.x, y: this.jama.y });
        this.khweziHistory.push({ x: this.khwezi.x, y: this.khwezi.y });
        if (this.jamaHistory.length > 15) this.jamaHistory.shift();
        if (this.khweziHistory.length > 15) this.khweziHistory.shift();

        const steps = [12, 8, 4];
        steps.forEach((step, idx) => {
          const jaIdx = this.jamaHistory.length - 1 - step;
          if (jaIdx >= 0) {
            const jaPos = this.jamaHistory[jaIdx];
            this.drawStickman(this.renderGraphics, jaPos.x, jaPos.y, 1.0, 0x00d0ff, 0.15 - idx * 0.04, this.runTick - step * 0.15, false);
          }
          const khIdx = this.khweziHistory.length - 1 - step;
          if (khIdx >= 0) {
            const khPos = this.khweziHistory[khIdx];
            this.drawStickman(this.renderGraphics, khPos.x, khPos.y, 0.72, 0x00FFA3, 0.15 - idx * 0.04, this.runTick - step * 0.15, true);
          }
        });

        this.drawStickman(this.renderGraphics, this.jama.x, this.jama.y, 1.0, 0x00d0ff, 1.0, this.runTick, false);
        const glance = Math.floor(time * 0.001) % 4 === 1;
        this.drawStickman(this.renderGraphics, this.khwezi.x, this.khwezi.y, 0.72, 0x00FFA3, 1.0, this.runTick, true, glance);
      }
      else if (this.currentCinematic === 2) {
        this.drawPassageway();

        this.jamaHistory.push({ x: this.jama.x, y: this.jama.y });
        this.khweziHistory.push({ x: this.khwezi.x, y: this.khwezi.y });
        if (this.jamaHistory.length > 15) this.jamaHistory.shift();
        if (this.khweziHistory.length > 15) this.khweziHistory.shift();

        const steps = [9, 6, 3];
        steps.forEach((step, idx) => {
          const jaIdx = this.jamaHistory.length - 1 - step;
          if (jaIdx >= 0) {
            const jaPos = this.jamaHistory[jaIdx];
            this.drawStickman(this.renderGraphics, jaPos.x, jaPos.y, 1.0, 0x00d0ff, 0.15 - idx * 0.04, (this.runTick * 1.5) - step * 0.15, false);
          }
          const khIdx = this.khweziHistory.length - 1 - step;
          if (khIdx >= 0) {
            const khPos = this.khweziHistory[khIdx];
            this.drawStickman(this.renderGraphics, khPos.x, khPos.y, 0.72, 0x00FFA3, 0.15 - idx * 0.04, (this.runTick * 1.5) - step * 0.15, true);
          }
        });

        this.drawStickman(this.renderGraphics, this.jama.x, this.jama.y, 1.0, 0x00d0ff, 1.0, this.runTick * 1.5, false);
        this.drawStickman(this.renderGraphics, this.khwezi.x, this.khwezi.y, 0.72, 0x00FFA3, 1.0, this.runTick * 1.5, true);
      }
      else if (this.currentCinematic === 3) {
        this.drawDawnForest(time);
        this.drawStickman(this.renderGraphics, this.jama.x, this.jama.y, 1.0, 0x00d0ff, 1.0, this.runTick * 0.7, false);
        this.drawStickman(this.renderGraphics, this.khwezi.x, this.khwezi.y, 0.72, 0x00FFA3, 1.0, this.runTick * 0.7, true);
        this.drawDawnForestFG();
      }
      else if (this.currentCinematic === 4 || this.currentCinematic === 5) {
        this.drawVillageBG(time);

        const isIdle = this.currentCinematic === 5 || (this.jama.x >= 390);
        const cycle = isIdle ? (Math.sin(time * 0.003) * 0.15) : this.runTick;
        
        this.drawStickman(this.renderGraphics, this.jama.x, this.jama.y, 1.0, 0x00d0ff, 1.0, cycle, false);
        this.drawStickman(this.renderGraphics, this.khwezi.x, this.khwezi.y, 0.72, 0x00FFA3, 1.0, cycle, true);

        if (this.currentCinematic === 5 && this.onezwa) {
          this.drawOnezwa(time);
        }
      }
      else if (this.currentCinematic === 6) {
        this.drawStoryCardBG(time);
        const sway = Math.sin(time * 0.002) * 0.12;
        this.drawStickman(this.renderGraphics, this.jama.x, this.jama.y, 1.0, 0x00d0ff, 1.0, sway, false, false, this.khwezi.x, this.khwezi.y - 24);
        this.drawStickman(this.renderGraphics, this.khwezi.x, this.khwezi.y, 0.72, 0x00FFA3, 1.0, sway, true);
        this.drawStoryCardFG();
      }
      else if (this.currentCinematic === 7) {
        this.drawCreditsBG();
      }

      if (this.activeBubbleVisible) {
        this.drawSpeechBubble(this.dialogueGraphics, this.activeBubbleX, this.activeBubbleY, this.activeBubbleTyped, this.activeBubbleSpeaker, this.activeBubbleColor);
      }

      if (this.fadeAlpha > 0) {
        this.dialogueGraphics.fillStyle(0x000000, this.fadeAlpha);
        this.dialogueGraphics.fillRect(0, 0, 1280, 720);
      }
    } catch(err) {
      console.warn("Caught harmless EndingScene draw error:", err);
    }
  }
}

// 9. GAME OVER SCENE
export class GameOverScene extends Phaser.Scene {
  private fogGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameOverScene');
  }

  create() {
    updateReactState({ activeScene: 'GameOverScene' });
    if (window.gameAudio) {
      window.gameAudio.setMusicTheme('none');
    }

    const w = 1280;
    const h = 720;

    // Dark flat background
    const bg = this.add.graphics();
    bg.fillStyle(0x040306, 1.0);
    bg.fillRect(0, 0, w, h);

    // 1. Slow pulsing purple fog aura in the center
    this.fogGraphics = this.add.graphics();
    this.fogGraphics.setPosition(640, 360);

    this.tweens.addCounter({
      from: 0.75,
      to: 1.25,
      duration: 3200,
      yoyo: true,
      loop: -1,
      onUpdate: (twCounter) => {
        if (!this.fogGraphics) return;
        this.fogGraphics.clear();
        let scale = twCounter.getValue();
        this.fogGraphics.fillStyle(0x3b0254, 0.18 + (scale - 0.75) * 0.08);
        this.fogGraphics.fillCircle(0, 0, 180 * scale);
        this.fogGraphics.fillStyle(0x280133, 0.28);
        this.fogGraphics.fillCircle(0, 0, 90 * scale);
      }
    });

    // 2. Creeping skeletal branches painted across the corners of the screen
    const branches = this.add.graphics();
    branches.lineStyle(3.0, 0x16131c, 0.85);

    // Corner: Top-Left
    branches.beginPath();
    branches.moveTo(0, 0);
    branches.lineTo(150, 120);
    branches.lineTo(220, 140);
    // Sub branches
    branches.moveTo(150, 120);
    branches.lineTo(120, 200);
    branches.moveTo(220, 140);
    branches.lineTo(310, 110);
    branches.strokePath();

    // Corner: Top-Right
    branches.lineStyle(2.8, 0x16131c, 0.8);
    branches.beginPath();
    branches.moveTo(w, 0);
    branches.lineTo(w - 180, 140);
    branches.lineTo(w - 240, 180);
    branches.moveTo(w - 180, 140);
    branches.lineTo(w - 110, 250);
    branches.strokePath();

    // Corner: Bottom-Left
    branches.beginPath();
    branches.moveTo(0, h);
    branches.lineTo(130, h - 110);
    branches.lineTo(160, h - 190);
    branches.moveTo(130, h - 110);
    branches.lineTo(240, h - 80);
    branches.strokePath();

    // Corner: Bottom-Right
    branches.beginPath();
    branches.moveTo(w, h);
    branches.lineTo(w - 140, h - 130);
    branches.lineTo(w - 220, h - 100);
    branches.moveTo(w - 140, h - 130);
    branches.lineTo(w - 110, h - 230);
    branches.strokePath();
  }
}

// 10. ENDING CREDITS SCENE (COMPELLING INTERACTIVE RESOLUTION)
export class EndingCreditsScene extends Phaser.Scene {
  private endingData: any;
  private phase: string = '';
  private runTick: number = 0;
  
  private renderGraphics!: Phaser.GameObjects.Graphics;
  private dialogueGraphics!: Phaser.GameObjects.Graphics;
  
  private jama!: { x: number; y: number };
  private khwezi!: { x: number; y: number };
  private onezwa!: { x: number; y: number; alpha: number };
  
  private ambientToneOscs: any[] = [];
  private ambientToneGains: any[] = [];
  private phase2Texts: any[] = [];
  
  constructor() {
    super('EndingCreditsScene');
  }

  init(data?: any) {
    this.endingData = data || {
      difficulty: 'medium',
      enemiesDefeated: (window.gameState as any)?.enemiesDefeated || 0,
      artifactsCollected: (window.gameState?.artifactsCollected || []).length,
      elapsedTime: (window.gameState as any)?.elapsedTime || 0
    };
  }

  create() {
    this.events.on('shutdown', this.shutdown, this);
    this.events.on('destroy', this.shutdown, this);

    // Notify React layer
    updateReactState({ activeScene: 'EndingCreditsScene' });
    
    // Stop all background audio themes
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

    // Initial camera fade in
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Bootstrap Phase 2: Philosophical choices
    this.fadeToPhase2();
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.input.removeAllListeners();
    try {
      if (this.input.keyboard) {
        this.input.keyboard.removeAllKeys(true);
      }
    } catch(e) {}

    // Cleanup solfeggio oscillators
    if (this.ambientToneOscs) {
      this.ambientToneOscs.forEach((osc: any, idx: number) => {
        try {
          const gainNode = this.ambientToneGains[idx];
          if (gainNode) {
            gainNode.disconnect();
          }
          osc.stop();
          osc.disconnect();
        } catch(e) {}
      });
      this.ambientToneOscs = [];
      this.ambientToneGains = [];
    }

    if (this.phase2Texts) {
      this.phase2Texts.forEach(x => {
        if (x && x.destroy) x.destroy();
      });
      this.phase2Texts = [];
    }

    GlobalCleanup.cleanScene(this);
  }

  private startOnezwaPhase() {
    this.phase = 'onezwa';
    const sw = this.scale.width;
    const sh = this.scale.height;

    // Background base: Dark dawn green
    const bgBase = this.add.graphics();
    bgBase.fillStyle(0x0a1a05, 1.0);
    bgBase.fillRect(0, 0, sw, sh);

    // Dawn Sky Overlay: Overlapping rectangles represent slow orange morning breakout
    const sky1 = this.add.rectangle(sw/2, 144, sw, 288, 0x1a0a05).setScrollFactor(0);
    const sky2 = this.add.rectangle(sw/2, 144, sw, 288, 0xff9a3c).setScrollFactor(0).setAlpha(0.2);
    
    // Ground horizontal strip (bottom 30% of screen)
    const ground = this.add.rectangle(sw/2, sh - 108, sw, 216, 0x1a3a0a).setScrollFactor(0);

    // 5 Scattered tree silhouette circles
    const silhouetteColor = 0x1a4a0a;
    const trees = [
      this.add.circle(200, sh - 250, 50, silhouetteColor),
      this.add.circle(450, sh - 280, 65, silhouetteColor),
      this.add.circle(700, sh - 240, 45, silhouetteColor),
      this.add.circle(950, sh - 270, 58, silhouetteColor),
      this.add.circle(1150, sh - 250, 48, silhouetteColor)
    ];

    // Underneath tree trunks representation
    const trunkG = this.add.graphics();
    trunkG.fillStyle(silhouetteColor, 1.0);
    [[200, 50], [450, 65], [700, 45], [950, 58], [1150, 48]].forEach(([tx, r]) => {
      trunkG.fillRect(tx - 6, sh - 250, 12, 150);
    });

    // 8 Golden particles float slow rising
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

    // Onezwa (facing Jama, center-right)
    this.onezwa = { x: sw/2 + 150, y: sh - 120, alpha: 0 };

    // Materialize Onezwa after 1000ms delay
    this.time.delayedCall(1000, () => {
      // 1. Green mist explosion
      const mistG = this.add.graphics().setDepth(15);
      this.tweens.add({
        targets: { r: 1, a: 0.35 },
        r: 58,
        a: 0,
        duration: 700,
        onUpdate: (tween, target) => {
          mistG.clear();
          mistG.fillStyle(0x00FFA3, target.a);
          mistG.fillCircle(this.onezwa.x, this.onezwa.y - 15, target.r);
        },
        onComplete: () => {
          mistG.destroy();
        }
      });

      // 2. Onezwa figure fades in (0 to 0.85) over 800ms
      this.tweens.add({
        targets: this.onezwa,
        alpha: 0.85,
        delay: 150,
        duration: 800,
        onComplete: () => {
          // Play divine chord chord trigger and launch dialogue text bubble chain after 200ms pause
          this.time.delayedCall(2000, () => {
            this.runDialogChain();
          });
        }
      });
    });
  }

  private runDialogChain() {
    const playNextBubble = (idx: number) => {
      const dialogs = [
        {
          speaker: "ONEZWA",
          text: "You have done well, Jama.\nThe forest saw your courage\nfrom the very first step.",
          bg: "#001a0a", border: "#00FFA3", color: "#00FFA3",
          char: this.onezwa, duration: 4000
        },
        {
          speaker: "ONEZWA",
          text: "Do not let others tell you\nthe forest is evil.\nIt never was.\nIt was merely overrun.",
          bg: "#001a0a", border: "#00FFA3", color: "#00FFA3",
          char: this.onezwa, duration: 4000
        },
        {
          speaker: "ONEZWA",
          text: "When you needed strength,\nthe forest gave it.\nWhen you needed courage,\nyour ancestors stood beside you.\nYou were never alone.\nNot for a single moment.",
          bg: "#001a0a", border: "#00FFA3", color: "#00FFA3",
          char: this.onezwa, duration: 4500
        },
        {
          speaker: "ONEZWA",
          text: "After your triumph,\nlet the villagers know —\nGod rewards courage.\nHe meets those who try\nhalfway.",
          bg: "#001a0a", border: "#00FFA3", color: "#00FFA3",
          char: this.onezwa, duration: 4200
        },
        {
          speaker: "ONEZWA",
          text: "Go home and rest,\nlittle Khwezi.",
          bg: "#001a0a", border: "#00FFA3", color: "#00FFA3",
          char: this.onezwa, duration: 2500
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
          bg: "#001a0a", border: "#00FFA3", color: "#00FFA3",
          char: this.onezwa, duration: 3200
        }
      ];

      if (idx >= dialogs.length) {
        // Dialogue holds, Onezwa fades out (1.2 seconds) with 3 green particles rising
        this.tweens.add({
          targets: this.onezwa,
          alpha: 0,
          duration: 1200,
          onComplete: () => {
            // Wait 800ms fade to black, then transition to Phase 2
            this.time.delayedCall(800, () => {
              this.cameras.main.fadeOut(800, 0, 0, 0);
              this.cameras.main.once('camerafadeoutcomplete', () => {
                this.fadeToPhase2();
              });
            });
          }
        });

        // 3 Green particle rises
        for (let j = 0; j < 3; j++) {
          const pt = this.add.circle(
            this.onezwa.x + Phaser.Math.Between(-15, 15),
            this.onezwa.y - 12,
            Phaser.Math.Between(2, 4),
            0x00FFA3
          ).setDepth(15).setAlpha(0.6);
          this.tweens.add({
            targets: pt,
            y: pt.y - 45,
            alpha: 0,
            duration: 1000,
            onComplete: () => pt.destroy()
          });
        }
        return;
      }

      const current = dialogs[idx];
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

  private fadeToPhase2() {
    this.phase = 'philosophical';
    const sw = this.scale.width;
    const sh = this.scale.height;

    // Clean up drawing canvases
    this.renderGraphics.clear();
    this.dialogueGraphics.clear();

    const flatBG = this.add.graphics();
    flatBG.fillStyle(0x0a0f14, 1.0);
    flatBG.fillRect(0, 0, sw, sh);

    this.cameras.main.fadeIn(500, 10, 15, 20);

    // Silhouette forest triangle landscape base (bottom edge, color #112B1A, alpha 0.45)
    const forestSil = this.add.graphics();
    forestSil.fillStyle(0x112B1A, 0.45);
    const treeW = 190;
    const treeH = 130;
    for (let k = 0; k < 6; k++) {
      const tx = 60 + k * 230 + Phaser.Math.Between(-15, 15);
      const ty = sh;
      forestSil.fillTriangle(
        tx, ty - treeH,
        tx - treeW / 2, ty,
        tx + treeW / 2, ty
      );
    }

    // Phase 2 dramatic text scrolling
    this.phase2Texts = [];

    const delayBetweenLines = 1500;

    const printLine1 = () => {
      const t1 = this.add.text(sw/2, sh/2 - 90, "Every soul walking this earth\nis being used by something.", {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5).setAlpha(0);
      this.phase2Texts.push(t1);
      this.tweens.add({ targets: t1, alpha: 1, duration: 600 });
      this.time.delayedCall(600 + delayBetweenLines, printLine2);
    };

    const printLine2 = () => {
      const t2 = this.add.text(sw/2, sh/2 - 30, "The question is never whether\nunseen forces are at work.", {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5).setAlpha(0);
      this.phase2Texts.push(t2);
      this.tweens.add({ targets: t2, alpha: 1, duration: 600 });
      this.time.delayedCall(600 + delayBetweenLines, printLine3);
    };

    const printLine3 = () => {
      const t3 = this.add.text(sw/2, sh/2 + 30, "The question is always:", {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#f5c842',
        align: 'center'
      }).setOrigin(0.5).setAlpha(0);
      this.phase2Texts.push(t3);
      this.tweens.add({ targets: t3, alpha: 1, duration: 600 });
      this.time.delayedCall(600 + 1200, printQuestionWordByWord);
    };

    const printQuestionWordByWord = () => {
      const words = ["Which", "side", "are", "you", "on?"];
      const tQuestion = this.add.text(sw/2, sh/2 + 85, "", {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#f5c842',
        align: 'center',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      
      this.phase2Texts.push(tQuestion);

      words.forEach((w, index) => {
        this.time.delayedCall(index * 400, () => {
          if (tQuestion && tQuestion.active) {
            if (index > 0) tQuestion.text += "   ";
            tQuestion.text += w;
            if (window.gameAudio) {
              try { window.gameAudio.playSfx('click'); } catch(e){}
            }
          }
        });
      });

      // after full question appears: 2000ms hold, then fade out over 600ms
      const qFinishDelay = (words.length - 1) * 400 + 2000;
      this.time.delayedCall(qFinishDelay, () => {
        this.tweens.add({
          targets: this.phase2Texts,
          alpha: 0,
          duration: 600,
          onComplete: () => {
            this.phase2Texts.forEach(x => x.destroy());
            this.phase2Texts = [];
            this.showCardsTransition();
          }
        });
      });
    };

    printLine1();
  }

  private showCardsTransition() {
    this.phase = 'choices';
    const sw = this.scale.width;
    const sh = this.scale.height;

    // Faint overlay text
    const instructionText = this.add.text(sw/2, sh/2 - 120, "The forest has always known what you are.\nChoose.", {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: instructionText, alpha: 0.7, duration: 400 });

    // LEFT CARD: GOOD
    const goodCard = this.add.container(-400, sh/2);
    
    const goodBG = this.add.graphics();
    goodBG.fillStyle(0x0a1a0a, 1.0);
    goodBG.fillRoundedRect(-90, -70, 180, 140, 8);
    goodCard.add(goodBG);

    const goodTitle = this.add.text(0, -25, "GOOD", {
      fontFamily: 'monospace', fontSize: '20px', color: '#00FFA3', fontStyle: 'bold'
    }).setOrigin(0.5);
    goodCard.add(goodTitle);

    const goodSub = this.add.text(0, 10, "Walk in the light.", {
      fontFamily: 'monospace', fontSize: '12px', color: '#2D7A4F'
    }).setOrigin(0.5);
    goodCard.add(goodSub);

    // Draw little sun icon above title
    const sunG = this.add.graphics();
    sunG.fillStyle(0xf5c842, 1.0);
    sunG.fillCircle(0, -45, 8);
    sunG.lineStyle(2, 0xf5c842, 1.0);
    for (let c = 0; c < 6; c++) {
      const angle = (c * Math.PI) / 3;
      sunG.lineBetween(Math.cos(angle)*11, -45 + Math.sin(angle)*11, Math.cos(angle)*18, -45 + Math.sin(angle)*18);
    }
    goodCard.add(sunG);

    // Independent stroke graphics representing glowing outer pulse
    const goodPulseLine = this.add.graphics();
    goodPulseLine.lineStyle(2, 0x00FFA3, 1.0);
    goodPulseLine.strokeRoundedRect(-91, -71, 182, 142, 8);
    goodCard.add(goodPulseLine);

    this.tweens.add({
      targets: goodPulseLine,
      alpha: 0.45,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // RIGHT CARD: EVIL
    const evilCard = this.add.container(sw + 400, sh/2);

    const evilBG = this.add.graphics();
    evilBG.fillStyle(0x1a0a0a, 1.0);
    evilBG.fillRoundedRect(-90, -70, 180, 140, 8);
    evilCard.add(evilBG);

    const evilTitle = this.add.text(0, -25, "EVIL", {
      fontFamily: 'monospace', fontSize: '20px', color: '#ff3a3a', fontStyle: 'bold'
    }).setOrigin(0.5);
    evilCard.add(evilTitle);

    const evilSub = this.add.text(0, 10, "Embrace the dark.", {
      fontFamily: 'monospace', fontSize: '12px', color: '#8B1A1A'
    }).setOrigin(0.5);
    evilCard.add(evilSub);

    // Draw little eye icon above title
    const eyeG = this.add.graphics();
    eyeG.lineStyle(1.5, 0xff3a3a, 1.0);
    eyeG.strokeEllipse(0, -45, 10, 6);
    eyeG.fillStyle(0xff0000, 1.0);
    eyeG.fillCircle(0, -45, 3);
    evilCard.add(eyeG);

    const evilPulseLine = this.add.graphics();
    evilPulseLine.lineStyle(2, 0xff3a3a, 1.0);
    evilPulseLine.strokeRoundedRect(-91, -71, 182, 142, 8);
    evilCard.add(evilPulseLine);

    this.tweens.add({
      targets: evilPulseLine,
      alpha: 0.45,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Slide in cards from sides with Back.easeOut
    this.tweens.add({
      targets: goodCard,
      x: sw/2 - 160,
      duration: 700,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: evilCard,
      x: sw/2 + 160,
      duration: 700,
      ease: 'Back.easeOut'
    });

    // Hover mouse interactions
    goodBG.setInteractive(new Phaser.Geom.Rectangle(-90, -70, 180, 140), Phaser.Geom.Rectangle.Contains);
    evilBG.setInteractive(new Phaser.Geom.Rectangle(-90, -70, 180, 140), Phaser.Geom.Rectangle.Contains);

    goodBG.on('pointerover', () => {
      this.tweens.add({ targets: goodCard, scale: 1.07, duration: 150, overwrite: true });
    });
    goodBG.on('pointerout', () => {
      this.tweens.add({ targets: goodCard, scale: 1.0, duration: 150, overwrite: true });
    });

    evilBG.on('pointerover', () => {
      this.tweens.add({ targets: evilCard, scale: 1.07, duration: 150, overwrite: true });
    });
    evilBG.on('pointerout', () => {
      this.tweens.add({ targets: evilCard, scale: 1.0, duration: 150, overwrite: true });
    });

    // Option selected click trigger
    goodBG.on('pointerdown', () => {
      goodBG.disableInteractive();
      evilBG.disableInteractive();
      
      this.tweens.killAll(); // Disable ongoing card pulses/sways
      
      if (window.gameAudio) {
        try { window.gameAudio.playSfx('click'); } catch(e){}
      }

      // Flash screen green
      this.cameras.main.flash(300, 0, 255, 100);

      // Fade elements out
      this.tweens.add({
        targets: [goodCard, evilCard, instructionText],
        alpha: 0,
        duration: 600,
        onComplete: () => {
          goodCard.destroy();
          evilCard.destroy();
          instructionText.destroy();
          this.showGoodEnding();
        }
      });
    });

    evilBG.on('pointerdown', () => {
      goodBG.disableInteractive();
      evilBG.disableInteractive();
      
      this.tweens.killAll(); // Disable ongoing card pulses/sways
      
      if (window.gameAudio) {
        try { window.gameAudio.playSfx('click'); } catch(e){}
      }

      // Flash screen red
      this.cameras.main.flash(300, 255, 0, 0);

      // Fade elements out
      this.tweens.add({
        targets: [goodCard, evilCard, instructionText],
        alpha: 0,
        duration: 600,
        onComplete: () => {
          goodCard.destroy();
          evilCard.destroy();
          instructionText.destroy();
          this.showEvilEnding();
        }
      });
    });
  }

  private showGoodEnding() {
    this.phase = 'narrative_good';
    const sw = this.scale.width;
    const sh = this.scale.height;
    const endingTexts: any[] = [];

    // Line 1
    const t1 = this.add.text(sw/2, sh/2 - 80, "Then walk well.", {
      fontFamily: 'monospace', fontSize: '15px', color: '#00FFA3'
    }).setOrigin(0.5).setAlpha(0);
    endingTexts.push(t1);
    this.tweens.add({ targets: t1, alpha: 1, duration: 500 });

    this.time.delayedCall(500 + 1300, () => {
      // Line 2
      const t2 = this.add.text(sw/2, sh/2 - 30, "The forest has always known\nwhat you are.", {
        fontFamily: 'monospace', fontSize: '15px', color: '#00FFA3', align: 'center', lineSpacing: 6
      }).setOrigin(0.5).setAlpha(0);
      endingTexts.push(t2);
      this.tweens.add({ targets: t2, alpha: 1, duration: 500 });

      this.time.delayedCall(500 + 1000, () => {
        // Words: "The   question   is —"
        const t3 = this.add.text(sw/2, sh/2 + 30, "", {
          fontFamily: 'monospace', fontSize: '20px', color: '#f5c842', fontStyle: 'bold'
        }).setOrigin(0.5);
        endingTexts.push(t3);

        const words = ["The", "question", "is —"];
        words.forEach((w, i) => {
          this.time.delayedCall(i * 500, () => {
            if (t3 && t3.active) {
              if (i > 0) t3.text += "   ";
              t3.text += w;
              if (window.gameAudio) {
                try { window.gameAudio.playSfx('click'); } catch(e){}
              }
            }
          });
        });

        // Question words finish hold 850ms, then launch line 4 ("Do   you?")
        this.time.delayedCall((words.length - 1)*500 + 850, () => {
          const t4 = this.add.text(sw/2, sh/2 + 80, "", {
            fontFamily: 'monospace', fontSize: '20px', color: '#f5c842', fontStyle: 'bold'
          }).setOrigin(0.5);
          endingTexts.push(t4);

          const qWords = ["Do", "you?"];
          qWords.forEach((qw, j) => {
            this.time.delayedCall(j * 500, () => {
              if (t4 && t4.active) {
                if (j > 0) t4.text += "   ";
                t4.text += qw;
                if (window.gameAudio) {
                  try { window.gameAudio.playSfx('chime'); } catch(e){}
                }
              }
            });
          });

          // Hold full sequence 2.5s, then fade to finalcredits
          this.time.delayedCall(1000 + 2500, () => {
            this.tweens.add({
              targets: endingTexts,
              alpha: 0,
              duration: 800,
              onComplete: () => {
                endingTexts.forEach(x => x.destroy());
                this.showFinalCredits();
              }
            });
          });
        });
      });
    });
  }

  private showEvilEnding() {
    this.phase = 'narrative_evil';
    const sw = this.scale.width;
    const sh = this.scale.height;
    const endingTexts: any[] = [];

    // Line 1: Then beware.
    const t1 = this.add.text(sw/2, sh/2 - 110, "Then beware.", {
      fontFamily: 'monospace', fontSize: '15px', color: '#ff3a3a'
    }).setOrigin(0.5).setAlpha(0);
    endingTexts.push(t1);
    this.tweens.add({ targets: t1, alpha: 1, duration: 500 });

    this.time.delayedCall(500 + 1300, () => {
      // Line 2: Even Nkanyamba believed / he was powerful
      const t2 = this.add.text(sw/2, sh/2 - 65, "Even Nkanyamba believed\nhe was powerful.", {
        fontFamily: 'monospace', fontSize: '15px', color: '#ff3a3a', align: 'center', lineSpacing: 6
      }).setOrigin(0.5).setAlpha(0);
      endingTexts.push(t2);
      this.tweens.add({ targets: t2, alpha: 1, duration: 500 });

      this.time.delayedCall(500 + 1100, () => {
        // Line 3: The darkness always turns / on those who serve it.
        const t3 = this.add.text(sw/2, sh/2 - 15, "The darkness always turns\non those who serve it.", {
          fontFamily: 'monospace', fontSize: '15px', color: '#ff3a3a', align: 'center', lineSpacing: 6
        }).setOrigin(0.5).setAlpha(0);
        endingTexts.push(t3);
        this.tweens.add({ targets: t3, alpha: 1, duration: 500 });

        this.time.delayedCall(500 + 1300, () => {
          // Line 4: The forest has always known / what you are.
          const t4 = this.add.text(sw/2, sh/2 + 35, "The forest has always known\nwhat you are.", {
            fontFamily: 'monospace', fontSize: '14px', color: '#ffffff', align: 'center', lineSpacing: 6
          }).setOrigin(0.5).setAlpha(0);
          endingTexts.push(t4);
          this.tweens.add({ targets: t4, alpha: 0.8, duration: 500 });

          this.time.delayedCall(500 + 1000, () => {
            // Words: "The   question   is —"
            const t5 = this.add.text(sw/2, sh/2 + 85, "", {
              fontFamily: 'monospace', fontSize: '20px', color: '#f5c842', fontStyle: 'bold'
            }).setOrigin(0.5);
            endingTexts.push(t5);

            const words = ["The", "question", "is —"];
            words.forEach((w, i) => {
              this.time.delayedCall(i * 500, () => {
                if (t5 && t5.active) {
                  if (i > 0) t5.text += "   ";
                  t5.text += w;
                  if (window.gameAudio) {
                    try { window.gameAudio.playSfx('click'); } catch(e){}
                  }
                }
              });
            });

            this.time.delayedCall((words.length - 1)*500 + 850, () => {
              const t6 = this.add.text(sw/2, sh/2 + 130, "", {
                fontFamily: 'monospace', fontSize: '20px', color: '#f5c842', fontStyle: 'bold'
              }).setOrigin(0.5);
              endingTexts.push(t6);

              const qWords = ["Do", "you?"];
              qWords.forEach((qw, j) => {
                this.time.delayedCall(j * 500, () => {
                  if (t6 && t6.active) {
                    if (j > 0) t6.text += "   ";
                    t6.text += qw;
                    if (window.gameAudio) {
                      try { window.gameAudio.playSfx('chime'); } catch(e){}
                    }
                  }
                });
              });

              // Hold full sequence 2.5s, then fade to finalcredits
              this.time.delayedCall(1000 + 2500, () => {
                this.tweens.add({
                  targets: endingTexts,
                  alpha: 0,
                  duration: 800,
                  onComplete: () => {
                    endingTexts.forEach(x => x.destroy());
                    this.showFinalCredits();
                  }
                });
              });
            });
          });
        });
      });
    });
  }

  private showFinalCredits() {
    this.phase = 'credits';
    const sw = this.scale.width;
    const sh = this.scale.height;

    // Trigger double sine wave ambient therapeutic background hum
    const actx = window.gameAudio && (window.gameAudio as any).ctx;
    if (actx) {
      try {
        const osc1 = actx.createOscillator();
        const osc2 = actx.createOscillator();
        const g1 = actx.createGain();
        const g2 = actx.createGain();
        
        osc1.type = 'sine'; osc1.frequency.value = 396; // Solfeggio frequency
        osc2.type = 'sine'; osc2.frequency.value = 528; // Transformation/Miracles Solfeggio
        
        g1.gain.value = 0.04; g2.gain.value = 0.04;
        
        osc1.connect(g1); osc2.connect(g2);
        g1.connect(actx.destination); g2.connect(actx.destination);
        
        osc1.start(); osc2.start();
        
        this.ambientToneOscs = [osc1, osc2];
        this.ambientToneGains = [g1, g2];
      } catch (e) {}
    }

    this.cameras.main.setBackgroundColor('#0a0f14');
    this.cameras.main.fadeIn(800, 10, 15, 20);

    const creditsTexts: any[] = [];

    // Credit slide delays
    this.time.delayedCall(1500, () => {
      // 1. Title
      const c1 = this.add.text(sw/2, 100, "THE NIGHT FOREST", {
        fontFamily: 'monospace', fontSize: '26px', color: '#f5c842', fontStyle: 'bold'
      }).setOrigin(0.5).setAlpha(0);
      creditsTexts.push(c1);
      this.tweens.add({ targets: c1, alpha: 1, duration: 600 });
      
      this.time.delayedCall(1200, () => {
        // 2. Lore Description
        const c2 = this.add.text(sw/2, 160, "A story about love, courage,\nand the unseen forces\nthat walk with us.", {
          fontFamily: 'monospace', fontSize: '13px', color: '#2D7A4F', align: 'center', lineSpacing: 5
        }).setOrigin(0.5).setAlpha(0);
        creditsTexts.push(c2);
        this.tweens.add({ targets: c2, alpha: 1, duration: 600 });
        
        this.time.delayedCall(1500, () => {
          // 3. Thank you
          const c3 = this.add.text(sw/2, 240, "Thank you for playing.", {
            fontFamily: 'monospace', fontSize: '16px', color: '#00FFA3', fontStyle: 'bold'
          }).setOrigin(0.5).setAlpha(0);
          creditsTexts.push(c3);
          this.tweens.add({ targets: c3, alpha: 1, duration: 600 });
          
          this.time.delayedCall(1200, () => {
            // 4. Blessing
            const c4 = this.add.text(sw/2, 290, "May you always choose\nto walk in the light.", {
              fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', align: 'center'
            }).setOrigin(0.5).setAlpha(0);
            creditsTexts.push(c4);
            this.tweens.add({ targets: c4, alpha: 0.8, duration: 600 });
            
            this.time.delayedCall(2000, () => {
              // 5. Ultimate Query word by word
              const c5 = this.add.text(sw/2, 360, "", {
                fontFamily: 'monospace', fontSize: '15px', color: '#f5c842', fontStyle: 'bold', align: 'center', lineSpacing: 5
              }).setOrigin(0.5);
              creditsTexts.push(c5);
              
              const words = ["The", "forest", "has", "always\nknown", "what", "you", "are."];
              words.forEach((w, i) => {
                this.time.delayedCall(i * 500, () => {
                  if (c5 && c5.active) {
                    if (i > 0 && !w.startsWith('\n')) c5.text += "   ";
                    c5.text += w;
                    if (window.gameAudio) {
                      try { window.gameAudio.playSfx('click'); } catch(e){}
                    }
                  }
                });
              });
              
              const c5Duration = (words.length - 1) * 500;
              this.time.delayedCall(c5Duration + 1000, () => {
                // 6. The question is —
                const c6 = this.add.text(sw/2, 425, "The question is —", {
                  fontFamily: 'monospace', fontSize: '17px', color: '#ffffff', fontStyle: 'bold'
                }).setOrigin(0.5).setAlpha(0);
                creditsTexts.push(c6);
                this.tweens.add({ targets: c6, alpha: 1, duration: 600 });
                
                this.time.delayedCall(800, () => {
                  // 7. Do you? word by word
                  const c7 = this.add.text(sw/2, 470, "", {
                    fontFamily: 'monospace', fontSize: '22px', color: '#f5c842', fontStyle: 'bold'
                  }).setOrigin(0.5);
                  creditsTexts.push(c7);
                  
                  const doYouWords = ["Do", "you?"];
                  doYouWords.forEach((dyw, k) => {
                    this.time.delayedCall(k * 500, () => {
                      if (c7 && c7.active) {
                        if (k > 0) c7.text += "   ";
                        c7.text += dyw;
                        if (window.gameAudio) {
                          try { window.gameAudio.playSfx('chime'); } catch(e){}
                        }
                      }
                    });
                  });
                  
                  this.time.delayedCall(1000 + 3000, () => {
                    // 8. Faint footnote
                    const c8 = this.add.text(sw/2, 530, "Built with Phaser 3  ·  The Night Forest  ·  2026", {
                      fontFamily: 'monospace', fontSize: '11px', color: '#2D7A4F'
                    }).setOrigin(0.5).setAlpha(0);
                    creditsTexts.push(c8);
                    this.tweens.add({ targets: c8, alpha: 0.45, duration: 600 });
                    
                    this.time.delayedCall(1500, () => {
                      // 9. Buttons fade in
                      this.createActionButtons();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  private createActionButtons() {
    const sw = this.scale.width;
    const sh = this.scale.height;
    
    // Stop ambient tone when playing again or returning to main menu
    const stopAmbientTone = () => {
      if (this.ambientToneOscs && this.ambientToneGains) {
        this.ambientToneOscs.forEach((osc, idx) => {
          try {
            const gainNode = this.ambientToneGains[idx];
            if (gainNode) {
              const actx = window.gameAudio && (window.gameAudio as any).ctx;
              if (actx) {
                gainNode.gain.linearRampToValueAtTime(0, actx.currentTime + 0.5);
              }
            }
            this.time.delayedCall(500, () => {
              try { osc.stop(); } catch(sc){}
            });
          } catch(e) {}
        });
      }
    };
    
    // PLAY AGAIN button: border 2px solid #00FFA3, text color #00FFA3
    const playAgainText = this.add.text(0, 0, "PLAY AGAIN", {
      fontFamily: 'monospace', fontSize: '14px', color: '#00FFA3', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const playAgainBorder = this.add.graphics();
    playAgainBorder.lineStyle(2, 0x00FFA3, 1.0);
    playAgainBorder.strokeRoundedRect(-75, -20, 150, 40, 6);
    
    const playAgainContainer = this.add.container(sw/2 - 90, sh - 100);
    playAgainContainer.add([playAgainBorder, playAgainText]);
    playAgainContainer.setAlpha(0);
    
    const playAgainHit = this.add.zone(0, 0, 150, 40).setInteractive({ cursor: 'pointer' });
    playAgainContainer.add(playAgainHit);
    
    playAgainHit.on('pointerover', () => {
      this.tweens.add({ targets: playAgainContainer, alpha: 1.0, duration: 150, overwrite: true });
    });
    playAgainHit.on('pointerout', () => {
      this.tweens.add({ targets: playAgainContainer, alpha: 0.7, duration: 150, overwrite: true });
    });
    
    playAgainHit.on('pointerdown', () => {
      if (window.gameAudio) {
        try { window.gameAudio.playSfx('click'); } catch(e){}
      }
      stopAmbientTone();
      
      // Perform complete global reset!
      GlobalCleanup.globalReset(this);
      
      this.time.delayedCall(200, () => {
        this.scene.start('DifficultyScene');
      });
    });
    
    // MAIN MENU button: border 2px solid #2D7A4F, text color #2D7A4F
    const mainMenuText = this.add.text(0, 0, "MAIN MENU", {
      fontFamily: 'monospace', fontSize: '14px', color: '#2D7A4F', fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const mainMenuBorder = this.add.graphics();
    mainMenuBorder.lineStyle(2, 0x2D7A4F, 1.0);
    mainMenuBorder.strokeRoundedRect(-75, -20, 150, 40, 6);
    
    const mainMenuContainer = this.add.container(sw/2 + 90, sh - 100);
    mainMenuContainer.add([mainMenuBorder, mainMenuText]);
    mainMenuContainer.setAlpha(0);
    
    const mainMenuHit = this.add.zone(0, 0, 150, 40).setInteractive({ cursor: 'pointer' });
    mainMenuContainer.add(mainMenuHit);
    
    mainMenuHit.on('pointerover', () => {
      this.tweens.add({ targets: mainMenuContainer, alpha: 1.0, duration: 150, overwrite: true });
    });
    mainMenuHit.on('pointerout', () => {
      this.tweens.add({ targets: mainMenuContainer, alpha: 0.7, duration: 150, overwrite: true });
    });
    
    mainMenuHit.on('pointerdown', () => {
      if (window.gameAudio) {
        try { window.gameAudio.playSfx('click'); } catch(e){}
      }
      stopAmbientTone();
      
      // Perform complete global reset!
      GlobalCleanup.globalReset(this);
      
      updateReactState({
        isGameOver: false,
        gameCompleted: false,
        activeScene: 'MainMenuScene'
      });
      
      this.time.delayedCall(200, () => {
        this.scene.start('MainMenuScene');
      });
    });
    
    // Fade buttons in simultaneously, testing rest alpha at 0.7
    this.tweens.add({
      targets: [playAgainContainer, mainMenuContainer],
      alpha: 0.7,
      duration: 600
    });
  }

  // Helper method drawing vector Stickmen
  private drawStickman(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, color: number, alpha: number, runTick: number, isKhwezi: boolean, glanceBack: boolean = false, targetArmX?: number, targetArmY?: number) {
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

    if (targetArmX !== undefined && targetArmY !== undefined) {
      g.lineBetween(x - 2, y - torsoL, targetArmX, targetArmY);
      g.lineBetween(x - 2, y - torsoL, x - 6 * scale, y - torsoL + 12 * scale);
    } else {
      g.lineBetween(x - 2, y - torsoL, x + sL * stride, y - torsoL + armL);
      g.lineBetween(x + 2, y - torsoL, x + sR * stride, y - torsoL + armL);
    }

    // Spear accessory for Jama
    if (!isKhwezi) {
      g.lineStyle(1.5, 0x8b5a2b, alpha * 0.9); // mahogany spear shaft
      g.lineBetween(x + 12, y - torsoL - 10, x + 12, y + legL);
      g.fillStyle(0xd3d3d3, alpha * 0.95); // iron spearhead
      g.fillTriangle(x + 12, y - torsoL - 18, x + 9, y - torsoL - 10, x + 15, y - torsoL - 10);
    }
  }

  // Typewriter-enabled text dialogue speech bubble
  private showBubble(speaker: string, text: string, bg: string, border: string, color: string, character: any, duration: number, onComplete: () => void) {
    // Destroy existing bubble
    if ((this as any).currentBubble) {
      try { (this as any).currentBubble.destroy(); } catch(e){}
      (this as any).currentBubble = null;
    }

    const sw = this.scale.width;
    const sh = this.scale.height;

    const charX = character ? character.x : sw/2;
    const charY = character ? character.y : sh/2;

    const bw = 260;
    const bh = 85;

    let bx = charX;
    let by = charY + 65;

    // Bounds checking
    bx = Phaser.Math.Clamp(bx, bw/2 + 10, sw - bw/2 - 10);
    by = Phaser.Math.Clamp(by, 10, sh - bh - 10);

    const container = this.add.container(bx, by).setDepth(500).setScrollFactor(0);

    const bgInt = parseInt(bg.replace('#','0x'));
    const borderInt = parseInt(border.replace('#','0x'));

    const rect = this.add.rectangle(0, 0, bw, bh, bgInt).setStrokeStyle(2, borderInt);
    
    const lbl = this.add.text(-bw/2 + 8, -bh/2 + 6, speaker, {
      fontSize: '10px', color: border, fontFamily: 'monospace', fontStyle: 'bold'
    });

    const txt = this.add.text(-bw/2 + 8, -bh/2 + 22, '', {
      fontSize: '13px', color: color, fontFamily: 'monospace', wordWrap: { width: bw - 16 }
    });

    container.add([rect, lbl, txt]);
    (this as any).currentBubble = container;

    // Typewriter effect 28ms/char
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
              (this as any).currentBubble = null;
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

  update(time: number, delta: number) {
    try {
      this.runTick += 0.015 * delta;

      if (this.phase === 'onezwa') {
        if (this.renderGraphics) {
          this.renderGraphics.clear();
          
          // Draw Jama
          this.drawStickman(this.renderGraphics, this.jama.x, this.jama.y, 1.0, 0x00bfff, 1.0, this.runTick * 0.5, false);

          // Draw Khwezi (shorter, no spear)
          this.drawStickman(this.renderGraphics, this.khwezi.x, this.khwezi.y, 0.72, 0x00FFA3, 1.0, this.runTick * 0.5, true);

          // Draw Onezwa fading figure (facing left)
          if (this.onezwa && this.onezwa.alpha > 0) {
            this.drawStickman(this.renderGraphics, this.onezwa.x, this.onezwa.y, 1.15, 0x00FFA3, this.onezwa.alpha, this.runTick * 0.3, false, true);
          }
        }
      }
    } catch(err) {
      console.warn("Harmless update render skip:", err);
    }
  }
}
