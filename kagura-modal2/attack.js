import * as THREE from 'three';
import { state } from './state.js';
import { createPetalSprite, spawnPetalBurst, groundCharacter } from './utils.js';
import { playAttackSFX } from './music.js';

export function attackClaw(loop = false, sequences = 1) {
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    playAttackSFX();
    state.currentAnim = 'attack';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    const gatherGroup = new THREE.Group();
    gatherGroup.position.copy(state.claw.position);
    state.scene.add(gatherGroup);
    state.tempGroups.push(gatherGroup);

    const petalCount = 60;
    const petals = [];
    for (let i = 0; i < petalCount; i++) {
        const petal = createPetalSprite('#ff365e', 0.1 + Math.random() * 0.08);
        petal.position.set(
            (Math.random() - 0.5) * 1.5,
            Math.random() * 1.2,
            (Math.random() - 0.5) * 1.5
        );
        gatherGroup.add(petal);
        petals.push(petal);
    }

    const tl = gsap.timeline({
        repeat: loop ? -1 : sequences - 1,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playAttackSFX();
        },
        onComplete: () => {
            // Clean up gatherGroup
            if (gatherGroup.parent) state.scene.remove(gatherGroup);
            const idx = state.tempGroups.indexOf(gatherGroup);
            if (idx > -1) state.tempGroups.splice(idx, 1);

            groundCharacter(); // feet on ground

            state.currentAnim = null;
            state.activeTimeline = null;
        }
    });
    state.activeTimeline = tl;

    // Step 1: gather petals closer
    tl.to(state.claw.rotation, { z: 0.2, duration: 0.2, ease: 'power2.out' }, 0)
      .to(state.claw.scale, { x: 0.95, y: 0.95, z: 0.95, duration: 0.2 }, 0)
      .to(petals.map(p => p.position), {
          x: 0, y: 0.2, z: 0,
          duration: 0.4,
          ease: 'power2.in',
          stagger: 0.01
      }, 0)
      .call(() => {
          const glow = createPetalSprite('#ffffff', 0.5);
          glow.position.copy(gatherGroup.position);
          state.scene.add(glow);
          gsap.to(glow.scale, { x: 1.2, y: 1.2, duration: 0.3 });
          gsap.to(glow.material, { opacity: 0, duration: 0.5, onComplete: () => {
              state.scene.remove(glow);
              glow.material.dispose();
          }});
      }, null, 0.5)
      // Step 2: throw petals towards viewer
      .to(state.claw.rotation, { z: 0, duration: 0.1 }, 0.6)
      .to(state.claw.scale, { x: 1, y: 1, z: 1 }, 0.6)
      .to(petals.map(p => p.position), {
          onStart: function() {
              const camPos = state.camera.position.clone();
              const charPos = gatherGroup.position.clone();
              const dir = camPos.sub(charPos).normalize();
              petals.forEach(p => {
                  p.userData.throwTarget = charPos.clone().add(dir.clone().multiplyScalar(3 + Math.random() * 2));
              });
          },
          x: (i, target) => petals[i].userData.throwTarget.x,
          y: (i, target) => petals[i].userData.throwTarget.y + Math.random() * 1.5,
          z: (i, target) => petals[i].userData.throwTarget.z,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.02
      }, 0.7)
      // Step 3: explosion near viewer
      .call(() => {
          const camPos = state.camera.position.clone();
          spawnPetalBurst(camPos, 80, '#ff365e');
          gsap.to(state.cardEl, {
              x: 8, duration: 0.03, yoyo: true, repeat: 5,
              onComplete: () => gsap.set(state.cardEl, { x: 0 })
          });
      }, null, 1.5)
      .to(petals.map(p => p.material), { opacity: 0, duration: 0.4, stagger: 0.03 }, 1.5)
      .to({}, { duration: 0.5 });

    // Sync group position to character
    tl.eventCallback('onUpdate', () => {
        gatherGroup.position.copy(state.claw.position);
    });
}