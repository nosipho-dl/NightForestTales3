import Phaser from 'phaser';

export class GlobalCleanup {
  static cleanScene(scene: Phaser.Scene) {
    if (!scene) return;

    // Reset window.gameInput values on transition/cleanup, to avoid stickiness
    if (window.gameInput) {
      window.gameInput.up = false;
      window.gameInput.down = false;
      window.gameInput.left = false;
      window.gameInput.right = false;
      window.gameInput.attack = false;
      window.gameInput.dash = false;
      window.gameInput.bash = false;
      window.gameInput.block = false;
      window.gameInput.power = false;
      window.gameInput.collect = false;
      if ('crouch' in window.gameInput) {
        (window.gameInput as any).crouch = false;
      }
    }

    // Reset window trigger event handler stubs to empty functions
    (window as any).triggerPhaserAttack = () => {};
    (window as any).triggerPhaserDash = () => {};
    (window as any).triggerPhaserBash = () => {};
    (window as any).triggerPhaserPower = () => {};
    (window as any).triggerPhaserCollect = () => {};

    // Stop all tweens
    try {
      scene.tweens.killAll();
    } catch (e) {}

    // Stop all timers
    try {
      scene.time.removeAllEvents();
    } catch (e) {}

    // Clear all input listeners
    try {
      scene.input.removeAllListeners();
      if (scene.input.keyboard) {
        scene.input.keyboard.removeAllKeys(true);
      }
    } catch (e) {}

    // Reset player state
    const anyScene = scene as any;
    if (anyScene.player) {
      try {
        anyScene.player.setVelocity(0, 0);
        if (anyScene.player.body) {
          anyScene.player.body.reset(anyScene.player.x, anyScene.player.y);
          anyScene.player.body.enable = true;
          anyScene.player.body.setVelocity(0, 0);
          anyScene.player.body.setAcceleration(0, 0);
        }
      } catch (e) {}
    }

    // Stop all audio devices/oscillators
    if (anyScene.activeOscillators) {
      anyScene.activeOscillators.forEach((o: any) => {
        try {
          o.stop();
          o.disconnect();
        } catch (e) {}
      });
      anyScene.activeOscillators = [];
    }

    // Destroy all tracked graphics
    if (anyScene.graphicsObjects) {
      anyScene.graphicsObjects.forEach((g: any) => {
        try {
          if (g && !g.destroyed && typeof g.destroy === 'function') g.destroy();
        } catch (e) {}
      });
      anyScene.graphicsObjects = [];
    }

    // Destroy all tracked particles
    if (anyScene.particleEmitters) {
      anyScene.particleEmitters.forEach((e: any) => {
        try {
          if (e && !e.destroyed && typeof e.destroy === 'function') e.destroy();
        } catch (e) {}
      });
      anyScene.particleEmitters = [];
    }
  }

  static globalReset(scene: Phaser.Scene) {
    if (!scene) return;

    // Explicitly stop and cleanup all active scenes (Phaser level)
    try {
      const activeScenes = scene.scene.manager.getScenes(true);
      activeScenes.forEach(s => {
        try {
          GlobalCleanup.cleanScene(s);
          s.scene.stop();
        } catch (err) {}
      });
    } catch (e) {}

    // Reset window variables (mechanics & triggers)
    (window as any).bossDefeated = false;
    (window as any).phase2Triggered = false;
    (window as any).passagewayCleared = false;
    (window as any).jamaInvulnerable = false;
    (window as any).lockBroken = false;
    (window as any).reunionPlayed = false;
    (window as any).enemiesDefeated = 0;
    (window as any).elapsedTime = 0;

    // Reconstruct game input stubs to prevent stickiness
    if (window.gameInput) {
      window.gameInput.up = false;
      window.gameInput.down = false;
      window.gameInput.left = false;
      window.gameInput.right = false;
      window.gameInput.attack = false;
      window.gameInput.dash = false;
      window.gameInput.bash = false;
      window.gameInput.block = false;
      window.gameInput.power = false;
      window.gameInput.collect = false;
      if ('crouch' in window.gameInput) {
        (window.gameInput as any).crouch = false;
      }
    }

    // Reset game state back to clinical defaults
    const diff = window.gameState?.difficulty || 'Medium';
    const cDiff = window.gameState?.currentDifficulty || 'medium';

    window.gameState = {
      difficulty: diff,
      currentDifficulty: cDiff,
      health: 100,
      maxHealth: 100,
      timer: 300,
      initialTimer: 300,
      lanternFuel: 100,
      artifactsCollected: [],
      relicsFound: [false, false, false, false, false],
      hasPower: false,
      score: 0,
      gameCompleted: false,
      isGameOver: false,
      activeScene: 'DifficultyScene',
      isPaused: false
    };

    // React state event update bridge
    if ((window as any).onGameStateChange) {
      (window as any).onGameStateChange(window.gameState);
    }
  }
}
