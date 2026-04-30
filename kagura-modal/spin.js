import * as THREE from 'three';
import { state } from './state.js';
import { createPetalSprite, groundCharacter } from './utils.js';
import { playSpinSFX } from './music.js';

export function spinClaw(loop = false, sequences = 1) {
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    playSpinSFX();
    state.currentAnim = 'spin';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    // Particle cylinder
    const vortexGroup = new THREE.Group();
    vortexGroup.position.copy(state.claw.position);
    state.scene.add(vortexGroup);
    state.tempGroups.push(vortexGroup);

    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleData = [];
    const radius = 1.0;
    const minY = -0.3;
    const maxY = 1.9;
    const height = maxY - minY;

    for (let i = 0; i < particleCount; i++) {
        const y = minY + Math.random() * height;
        const angle = Math.random() * Math.PI * 2;
        const r = radius * (0.85 + Math.random() * 0.3);
        positions[i*3] = Math.cos(angle) * r;
        positions[i*3+1] = y;
        positions[i*3+2] = Math.sin(angle) * r;
        particleData.push({
            radius: r,
            angle: angle,
            baseY: y,
            speed: 0.5 + Math.random() * 0.5,
            rotSpeed: 1.8 + Math.random() * 2.0
        });
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const petalTex = (() => {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ff365e';
        ctx.beginPath(); ctx.ellipse(8,8,6,3,0,0,Math.PI*2); ctx.fill();
        return new THREE.CanvasTexture(c);
    })();

    const material = new THREE.PointsMaterial({
        color: '#ff365e',
        map: petalTex,
        size: 0.09,
        transparent: true,
        opacity: 0.8,
        blending: THREE.NormalBlending,
        depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    vortexGroup.add(particles);

    const repeatCount = loop ? -1 : sequences - 1;
    const tl = gsap.timeline({
        repeat: repeatCount,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playSpinSFX();
        },
        onComplete: () => {
            gsap.killTweensOf(vortexGroup.rotation);
            geometry.dispose();
            material.dispose();
            petalTex.dispose();
            state.scene.remove(vortexGroup);
            const idx = state.tempGroups.indexOf(vortexGroup);
            if (idx > -1) state.tempGroups.splice(idx, 1);

            groundCharacter(); // feet on ground

            state.currentAnim = null;
            state.activeTimeline = null;
        }
    });
    state.activeTimeline = tl;

    // Spin character Y
    tl.to(state.claw.rotation, { y: '+=6.2832', duration: 1.3, ease: 'power1.inOut' }, 0);
    // Spin particle cylinder opposite
    tl.to(vortexGroup.rotation, { y: '-=6.2832', duration: 1.3, ease: 'none' }, 0);

    let spinActive = true;
    tl.eventCallback('onComplete', () => { spinActive = false; });

    function animateRising() {
        function update() {
            if (!spinActive) return;
            const now = performance.now();
            const delta = Math.min(0.033, (now - (window._lastSpinFrame || now)) / 1000);
            window._lastSpinFrame = now;

            const positionsAttr = geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                const data = particleData[i];
                let newY = positionsAttr[i*3+1] + data.speed * delta;
                if (newY > maxY) {
                    newY = minY;
                    const newAngle = Math.random() * Math.PI * 2;
                    const newRadius = radius * (0.85 + Math.random() * 0.3);
                    positionsAttr[i*3] = Math.cos(newAngle) * newRadius;
                    positionsAttr[i*3+2] = Math.sin(newAngle) * newRadius;
                    particleData[i].radius = newRadius;
                    particleData[i].angle = newAngle;
                }
                positionsAttr[i*3+1] = newY;
                const angle = particleData[i].angle + (now * 0.002 * particleData[i].rotSpeed);
                const r = particleData[i].radius;
                positionsAttr[i*3] = Math.cos(angle) * r;
                positionsAttr[i*3+2] = Math.sin(angle) * r;
            }
            geometry.attributes.position.needsUpdate = true;
            requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }
    animateRising();
}