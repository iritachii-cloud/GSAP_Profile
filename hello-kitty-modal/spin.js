import * as THREE from 'three';
import { state } from './state.js';
import { createHeartMesh } from './utils.js';
import { playSpinSFX } from './music.js';

export function spinKitty(loop = false, sequences = 1) {
    // Kill any ongoing animation
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    playSpinSFX();
    state.currentAnim = 'spin';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    const heartGroup = new THREE.Group();
    heartGroup.position.copy(state.kitty.position);
    state.scene.add(heartGroup);
    state.tempGroups.push(heartGroup);

    const heartCount = 12;
    const hearts = [];
    for (let i = 0; i < heartCount; i++) {
        const heart = createHeartMesh();
        const angle = (i / heartCount) * Math.PI * 2;
        heart.position.set(Math.cos(angle) * 0.7, 0.15, Math.sin(angle) * 0.7);
        heart.scale.set(0.25, 0.25, 1);
        heartGroup.add(heart);
        hearts.push(heart);
    }

    const repeatCount = loop ? -1 : sequences - 1;

    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playSpinSFX();
        },
        onComplete: () => {
            hearts.forEach(h => {
                gsap.to(h.material, { opacity: 0, duration: 0.4, onComplete: () => {
                    heartGroup.remove(h);
                    h.material.dispose();
                    h.material.map?.dispose();
                }});
            });
            gsap.delayedCall(0.5, () => {
                state.scene.remove(heartGroup);
                const idx = state.tempGroups.indexOf(heartGroup);
                if (idx > -1) state.tempGroups.splice(idx, 1);
            });
            state.currentAnim = null;
            state.activeTimeline = null;
        }
    });

    state.activeTimeline = tl;

    tl.to(state.kitty.rotation, { y: '+=12.5664', duration: 0.95, ease: 'power2.inOut' });
    tl.to(heartGroup.rotation, { y: '-=3.1416', duration: 0.95, ease: 'sine.inOut' }, 0);

    hearts.forEach((h, i) => {
        tl.to(h.scale, { x: 0.45, y: 0.45, duration: 0.35, repeat: 1, yoyo: true, ease: 'power1.out' }, 0.1 + i * 0.04);
    });
    hearts.forEach((h, i) => {
        const startAngle = (i / heartCount) * Math.PI * 2;
        const targetDist = 1.8;
        tl.to(h.position, { x: Math.cos(startAngle) * targetDist, z: Math.sin(startAngle) * targetDist, duration: 0.75, ease: 'power2.out' }, 0.25 + i * 0.05);
    });
}