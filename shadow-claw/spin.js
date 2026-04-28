import * as THREE from 'three';
import { state } from './state.js';
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

    // Group to hold particles – centered on claw, does NOT affect model
    const vortexGroup = new THREE.Group();
    vortexGroup.position.copy(state.claw.position);
    state.scene.add(vortexGroup);
    state.tempGroups.push(vortexGroup);

    // Soft green particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#88ff88';
    ctx.beginPath();
    ctx.arc(8, 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#44aa44';
    ctx.beginPath();
    ctx.arc(8, 8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);

    const particleCount = 320;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Cylinder radius and vertical range
    const radius = 0.9;
    const minY = -0.45;
    const maxY = 2.0;
    const height = maxY - minY;
    
    // Each particle gets a starting Y and unique rotation offset
    const particleData = [];
    for (let i = 0; i < particleCount; i++) {
        // Spread particles evenly along the height
        const y = minY + Math.random() * height;
        const angle = Math.random() * Math.PI * 2;
        const r = radius * (0.85 + Math.random() * 0.3);
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        positions[i*3] = x;
        positions[i*3+1] = y;
        positions[i*3+2] = z;
        particleData.push({
            radius: r,
            angle: angle,
            baseY: y,
            speed: 0.4 + Math.random() * 0.6,   // rising speed
            rotSpeed: 1.5 + Math.random() * 2.0  // rotation speed
        });
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0x88ff88,
        map: texture,
        size: 0.09,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
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
            texture.dispose();
            state.scene.remove(vortexGroup);
            const idx = state.tempGroups.indexOf(vortexGroup);
            if (idx > -1) state.tempGroups.splice(idx, 1);
            state.currentAnim = null;
            state.activeTimeline = null;
        }
    });
    state.activeTimeline = tl;
    
    // Rotate the character gently (Y axis only)
    tl.to(state.claw.rotation, { y: '+=6.2832', duration: 1.3, ease: 'power1.inOut' }, 0);
    // Rotate the particle cylinder in opposite direction
    tl.to(vortexGroup.rotation, { y: '-=6.2832', duration: 1.3, ease: 'none' }, 0);
    
    // Use a local flag so the rAF loop stops exactly when this spin ends
    let spinActive = true;
    tl.eventCallback('onComplete', () => { spinActive = false; });

    // Animate particles: rising from ground, recycling when reaching top
    function animateRising() {
        function update() {
            if (!spinActive) return;
            const now = performance.now();
            const delta = Math.min(0.033, (now - (window._lastSpinFrame || now)) / 1000);
            window._lastSpinFrame = now;
            
            const positionsAttr = geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                const data = particleData[i];
                // Update Y: rise upward
                let newY = positionsAttr[i*3+1] + data.speed * delta;
                if (newY > maxY) {
                    newY = minY;
                    // also randomize angle when resetting to ground
                    const newAngle = Math.random() * Math.PI * 2;
                    const newRadius = radius * (0.85 + Math.random() * 0.3);
                    const x = Math.cos(newAngle) * newRadius;
                    const z = Math.sin(newAngle) * newRadius;
                    positionsAttr[i*3] = x;
                    positionsAttr[i*3+2] = z;
                    particleData[i].radius = newRadius;
                    particleData[i].angle = newAngle;
                }
                positionsAttr[i*3+1] = newY;
                
                // Rotate around Y axis as they rise – creates spiral
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
    
    // Pulsing size effect for energy feel
    gsap.to(material, { size: 0.13, duration: 0.3, yoyo: true, repeat: 3, ease: 'sine.inOut', delay: 0.2 });
}