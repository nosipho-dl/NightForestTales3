import Phaser from 'phaser';

export class OnezwaOrb extends Phaser.GameObjects.Container {
  innerContainer!: Phaser.GameObjects.Container;
  primaryOrb!: Phaser.GameObjects.Graphics;
  innerCore!: Phaser.GameObjects.Graphics;
  glowRing1!: Phaser.GameObjects.Graphics;
  glowRing2!: Phaser.GameObjects.Graphics;
  
  orbitCol1!: Phaser.GameObjects.Container;
  orbitCol2!: Phaser.GameObjects.Container;
  orbitCol3!: Phaser.GameObjects.Container;
  
  p1!: Phaser.GameObjects.Graphics;
  p2!: Phaser.GameObjects.Graphics;
  p3!: Phaser.GameObjects.Graphics;
  
  rot1!: Phaser.Tweens.Tween;
  rot2!: Phaser.Tweens.Tween;
  rot3!: Phaser.Tweens.Tween;
  
  orbitActive = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setDepth(150);

    // Inner container to isolate gentle float offset from main container coordinates (enabling smooth glides)
    this.innerContainer = scene.add.container(0, 0);
    this.add(this.innerContainer);

    // 1. Outer glow ring 2: circle radius 110px, color orange/gold (#FFA500), alpha 0.15 for intense sun halo
    this.glowRing2 = scene.add.graphics();
    this.glowRing2.fillStyle(0xFF8800, 0.15);
    this.glowRing2.fillCircle(0, 0, 110);
    this.innerContainer.add(this.glowRing2);

    // 2. Outer glow ring 1: circle radius 80px, color gold (#FFD700), alpha 0.35
    this.glowRing1 = scene.add.graphics();
    this.glowRing1.fillStyle(0xFFD700, 0.35);
    this.glowRing1.fillCircle(0, 0, 80);
    this.innerContainer.add(this.glowRing1);

    // 3. Primary orb: circle radius 55px, color brilliant sun yellow (#FFEA00), alpha 0.95
    this.primaryOrb = scene.add.graphics();
    this.primaryOrb.fillStyle(0xFFEA00, 0.95);
    this.primaryOrb.fillCircle(0, 0, 55);
    this.innerContainer.add(this.primaryOrb);

    // 4. Inner bright core: circle radius 26px, color white (#ffffff), alpha 0.8
    this.innerCore = scene.add.graphics();
    this.innerCore.fillStyle(0xffffff, 0.8);
    this.innerCore.fillCircle(0, 0, 26);
    this.innerContainer.add(this.innerCore);

    // 5. Particle trail containers for coordinate-based rotation via Phaser Tweens
    this.orbitCol1 = scene.add.container(0, 0);
    this.orbitCol2 = scene.add.container(0, 0);
    this.orbitCol3 = scene.add.container(0, 0);
    this.innerContainer.add([this.orbitCol1, this.orbitCol2, this.orbitCol3]);

    // Radii of rotation scaled up: 95px, 125px, 155px. Color brilliant gold/yellow, radius 6px
    this.p1 = scene.add.graphics().fillStyle(0xFFD700, 0.6).fillCircle(95, 0, 6);
    this.p2 = scene.add.graphics().fillStyle(0xFFAA00, 0.6).fillCircle(125, 0, 6);
    this.p3 = scene.add.graphics().fillStyle(0xFFEA00, 0.6).fillCircle(155, 0, 6);
    
    this.p1.setVisible(false);
    this.p2.setVisible(false);
    this.p3.setVisible(false);
    
    this.orbitCol1.add(this.p1);
    this.orbitCol2.add(this.p2);
    this.orbitCol3.add(this.p3);

    // Always active background rotation tweens
    // Speeds: one full rotation per 3000ms, 4000ms, 5000ms respectively
    this.rot1 = scene.tweens.add({
      targets: this.orbitCol1,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: 'Linear'
    });

    this.rot2 = scene.tweens.add({
      targets: this.orbitCol2,
      angle: 360,
      duration: 4000,
      repeat: -1,
      ease: 'Linear'
    });

    this.rot3 = scene.tweens.add({
      targets: this.orbitCol3,
      angle: 360,
      duration: 5000,
      repeat: -1,
      ease: 'Linear'
    });

    // Pulse: primary orb radius 53px -> 60px (scale 1.0 to 60/55) over 1200ms with yoyo repeat -1
    scene.tweens.add({
      targets: this.primaryOrb,
      scaleX: 60 / 55,
      scaleY: 60 / 55,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Inner core pulse: 24px -> 30px (scale 1.0 to 30/26) over 800ms
    scene.tweens.add({
      targets: this.innerCore,
      scaleX: 30 / 26,
      scaleY: 30 / 26,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Glow rings pulse alpha
    scene.tweens.add({
      targets: this.glowRing1,
      alpha: 0.5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    scene.tweens.add({
      targets: this.glowRing2,
      alpha: 0.24,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Gentle float: entire orb moves up 6px then down 6px over 2000ms
    scene.tweens.add({
      targets: this.innerContainer,
      y: -6,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(time: number, delta: number) {
    // This method is kept for backwards compatibility with any manual callers
  }

  materialize(onComplete?: () => void) {
    this.setScale(0);
    this.setAlpha(0);
    
    // Grow to full size and fade to 0.9 alpha over 800ms
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 0.9,
      duration: 800,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Particle orbit starts after fully visible
        this.orbitActive = true;
        this.p1.setVisible(true);
        this.p2.setVisible(true);
        this.p3.setVisible(true);
        if (onComplete) onComplete();
      }
    });
  }

  speakPulse() {
    // Inner core alpha spikes to 1.0 for 200ms then returns
    this.scene.tweens.add({
      targets: this.innerCore,
      alpha: 1.0,
      duration: 100,
      yoyo: true,
      repeat: 0,
      onComplete: () => {
        this.innerCore.alpha = 0.6;
      }
    });

    // Orb scale pulse brighter momentarily
    this.scene.tweens.add({
      targets: [this.glowRing1, this.glowRing2],
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 150,
      yoyo: true,
      repeat: 0
    });
  }

  fadeOutDisappear(onComplete?: () => void) {
    // Particle orbit speeds up then stops
    if (this.rot1 && this.rot2 && this.rot3) {
      this.rot1.timeScale = 4.0;
      this.rot2.timeScale = 4.0;
      this.rot3.timeScale = 4.0;
    }

    this.scene.tweens.add({
      targets: this,
      duration: 350,
      onComplete: () => {
        this.orbitActive = false;
        this.p1.setVisible(false);
        this.p2.setVisible(false);
        this.p3.setVisible(false);
        if (this.rot1) this.rot1.stop();
        if (this.rot2) this.rot2.stop();
        if (this.rot3) this.rot3.stop();
      }
    });

    // Scale and Alpha fade to 0 over 1000ms
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        // Final bright white flash alpha 0.5 then 0 over 200ms
        const flash = this.scene.add.graphics();
        flash.fillStyle(0xffffff, 0.5);
        flash.fillCircle(this.x, this.y, 110);
        flash.setDepth(this.depth + 10);
        
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scale: 1.3,
          duration: 200,
          onComplete: () => {
            flash.destroy();
            this.destroy();
            if (onComplete) onComplete();
          }
        });
      }
    });
  }
}
