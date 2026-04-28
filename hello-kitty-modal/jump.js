import { state } from './state.js';
import { createHeartMesh } from './utils.js';
import { playJumpSFX } from './music.js';

function spawnLandingHeartsForMain(count = 6) {
    const k = state.kitty;
    if (!k) return;
    for (let i = 0; i < count; i++) {
        const heart = createHeartMesh();
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.2 + Math.random() * 0.5;
        heart.position.set(
            k.position.x + Math.cos(angle) * radius,
            k.position.y - 0.15,
            k.position.z + Math.sin(angle) * radius
        );
        heart.scale.set(0.18, 0.18, 1);
        state.scene.add(heart);
        state.heartsPool.push(heart);

        gsap.to(heart.position, {
            x: heart.position.x + Math.cos(angle) * 0.8,
            y: heart.position.y + 0.5 + Math.random() * 0.7,
            z: heart.position.z + Math.sin(angle) * 0.8,
            duration: 0.7 + Math.random() * 0.5,
            ease: 'power2.out'
        });
        gsap.to(heart.material, {
            opacity: 0,
            duration: 0.8 + Math.random() * 0.4,
            ease: 'power2.in',
            onComplete: () => {
                state.scene.remove(heart);
                heart.material.dispose();
                heart.material.map?.dispose();
                const idx = state.heartsPool.indexOf(heart);
                if (idx > -1) state.heartsPool.splice(idx, 1);
            }
        });
    }
}

export function jumpKitty(loop = false, sequences = 1) {
    // Kill any ongoing animation
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    playJumpSFX();
    state.currentAnim = 'jump';
    state.currentSequence = 0;
    const base = state.kitty.userData.baseY ?? 0;

    const repeatCount = loop ? -1 : sequences - 1;

    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            const disp = document.getElementById('seqDisplay');
            if (disp) disp.textContent = state.currentSequence;
            spawnLandingHeartsForMain(7);
            playJumpSFX();
        },
        onComplete: () => {
            state.currentAnim = null;
            state.activeTimeline = null;
        }
    });

    state.activeTimeline = tl;

    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    tl.to(state.kitty.scale, { y: 0.78, duration: 0.12, ease: 'power2.in' })
      .to(state.kitty.position, { y: base + 0.9, duration: 0.28, ease: 'power2.out' })
      .to(state.kitty.scale,    { y: 1.15, duration: 0.14 }, '-=0.15')
      .to(state.kitty.position, { y: base, duration: 0.28, ease: 'bounce.out' })
      .to(state.kitty.scale,    { y: 0.85, duration: 0.08 }, '-=0.1')
      .to(state.kitty.scale,    { y: 1, duration: 0.18 })
      .call(() => spawnLandingHeartsForMain(7), null, 0.35)
      .to(state.cardEl, {
          scale: 0.92,
          duration: 0.08,
          ease: 'power2.in',
          onComplete: () => gsap.to(state.cardEl, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.3)' })
      }, 0.4);
}