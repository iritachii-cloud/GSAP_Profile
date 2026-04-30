import * as THREE from 'three';
import { state } from './state.js';
import { spawnPetalBurst, createPetalSprite, groundCharacter } from './utils.js';
import { playJumpSFX } from './music.js';

export function jumpClaw(loop = false, sequences = 1) {
    // Kill any existing animation and ensure no leftover tweens
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    gsap.killTweensOf(state.claw.position);
    gsap.killTweensOf(state.claw.rotation);
    gsap.killTweensOf(state.claw.scale);

    playJumpSFX();
    state.currentAnim = 'jump';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    const base = state.claw.userData.baseY ?? 0;   // ground is at 0
    const repeatCount = loop ? -1 : sequences - 1;

    // Petal group that follows the character during the jump
    const petalGroup = new THREE.Group();
    petalGroup.position.copy(state.claw.position);
    state.scene.add(petalGroup);
    state.tempGroups.push(petalGroup);

    for (let i = 0; i < 40; i++) {
        const petal = createPetalSprite('#ff365e', 0.08);
        petal.position.set(
            (Math.random() - 0.5) * 0.6,
            Math.random() * 0.6,
            (Math.random() - 0.5) * 0.6
        );
        petalGroup.add(petal);
        state.darkEffectsPool.push(petal);
    }

    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playJumpSFX();
            // Ground bash on each landing
            spawnPetalBurst(
                new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z),
                25,
                '#ff365e'
            );
        },
        onComplete: () => {
            // Clean up petal group
            petalGroup.traverse(p => {
                if (p.material) {
                    gsap.to(p.material, { opacity: 0, duration: 0.4, onComplete: () => {
                        petalGroup.remove(p);
                        if (p.material.map) p.material.map.dispose();
                        p.material.dispose();
                    }});
                }
            });
            state.scene.remove(petalGroup);
            const idx = state.tempGroups.indexOf(petalGroup);
            if (idx > -1) state.tempGroups.splice(idx, 1);

            // Ensure feet are on ground after animation
            groundCharacter();

            state.currentAnim = null;
            state.activeTimeline = null;
        }
    });
    state.activeTimeline = tl;

    // Sync petal group to character
    tl.eventCallback('onUpdate', () => {
        petalGroup.position.copy(state.claw.position);
    });

    // Jump animation: squash → rise → stretch → fall → squash → normal
    tl.to(state.claw.scale, { y: 0.75, duration: 0.12, ease: 'power2.in' }, 0)
      .to(state.claw.position, { y: base + 0.95, duration: 0.28, ease: 'power2.out' }, 0)
      .to(state.claw.scale, { y: 1.18, duration: 0.14 }, '-=0.15')
      .to(state.claw.position, { y: base, duration: 0.28, ease: 'bounce.out' })
      .to(state.claw.scale, { y: 0.85, duration: 0.08 }, '-=0.1')
      .to(state.claw.scale, { y: 1, duration: 0.18 })
      .call(() => {
          spawnPetalBurst(
              new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z),
              25,
              '#ff365e'
          );
      }, null, 0.7)
      // Subtle card shake
      .to(state.cardEl, {
          scale: 0.92,
          duration: 0.08,
          ease: 'power2.in',
          onComplete: () => gsap.to(state.cardEl, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.3)' })
      }, 0.4);
}