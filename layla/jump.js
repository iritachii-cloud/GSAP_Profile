import * as THREE from 'three';
import { state } from './state.js';
import { spawnEnergyBurst } from './utils.js';
import { playJumpSFX } from './music.js';
import { triggerLightning } from './sky.js'; // optional, for real sky lightning

/**
 * Layla leaps into the air with a swirl of wind, then lands with an expanding
 * energy aura and random lightning strikes around the map.
 */
export function jumpClaw(loop = false, sequences = 1) {
    // Kill any ongoing animation
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    gsap.killTweensOf(state.claw.position);
    gsap.killTweensOf(state.claw.scale);

    playJumpSFX();
    state.currentAnim = 'jump';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    const baseY = state.claw.userData.baseY ?? 0;
    const jumpHeight = 1.8;
    const isNight = state.timeOfDay === 'night';

    // ----- Air swirl particles (follow her up) -----
    const swirlGroup = new THREE.Group();
    swirlGroup.position.copy(state.claw.position);
    state.scene.add(swirlGroup);
    state.tempGroups.push(swirlGroup);

    const swirlCount = 30;
    const swirlParticles = [];
    for (let i = 0; i < swirlCount; i++) {
        const sprite = createGlowSprite('#88ccff', 0.12);
        sprite.position.set(
            (Math.random() - 0.5) * 0.8,
            Math.random() * 1.0,
            (Math.random() - 0.5) * 0.8
        );
        swirlGroup.add(sprite);
        swirlParticles.push(sprite);
    }

    // ----- Aura ring (expands on land) -----
    const auraGeo = new THREE.TorusGeometry(0.2, 0.08, 16, 32);
    const auraMat = new THREE.MeshBasicMaterial({
        color: '#ffaa44',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const auraRing = new THREE.Mesh(auraGeo, auraMat);
    auraRing.rotation.x = Math.PI / 2;
    auraRing.position.set(
        state.claw.position.x,
        0.05,
        state.claw.position.z
    );
    state.scene.add(auraRing);
    state.tempGroups.push(auraRing);

    // ----- Timeline -----
    const tl = gsap.timeline({
        repeat: loop ? -1 : sequences - 1,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playJumpSFX();
            // Reset aura each repeat
            auraMat.opacity = 0;
            auraRing.scale.set(1, 1, 1);
        },
        onComplete: () => {
            // Cleanup
            [swirlGroup, auraRing].forEach(g => {
                if (g.parent) state.scene.remove(g);
                g.traverse(obj => {
                    if (obj.material) {
                        if (obj.material.map) obj.material.map.dispose();
                        obj.material.dispose();
                    }
                    if (obj.geometry) obj.geometry.dispose();
                });
            });
            state.currentAnim = null;
            state.activeTimeline = null;
            // Re‑ground
            if (state.claw) {
                state.claw.position.y = baseY;
                state.claw.scale.set(1, 1, 1);
            }
        },
    });
    state.activeTimeline = tl;

    // 1. Squash down (prepare)
    tl.to(state.claw.scale, { y: 0.65, duration: 0.1, ease: 'power2.in' }, 0);

    // 2. Launch upward – particles swirl around her
    tl.to(state.claw.position, {
        y: baseY + jumpHeight,
        duration: 0.35,
        ease: 'power2.out',
        onUpdate: () => {
            swirlGroup.position.copy(state.claw.position);
            // Rotate swirl group fast for swoosh effect
            swirlGroup.rotation.y += 0.15;
            // Move individual particles along a spiral
            swirlParticles.forEach((p, idx) => {
                p.position.y += (0.5 - Math.random()) * 0.02;
                p.position.x += Math.sin(Date.now() * 0.01 + idx) * 0.01;
                p.position.z += Math.cos(Date.now() * 0.01 + idx) * 0.01;
            });
        },
    }, 0.1);

    // 3. Hang time / peak – she stretches a bit
    tl.to(state.claw.scale, { y: 1.15, x: 0.9, z: 0.9, duration: 0.15 }, 0.45);

    // 4. Fall back down
    tl.to(state.claw.position, {
        y: baseY,
        duration: 0.35,
        ease: 'bounce.out',
        onUpdate: () => {
            swirlGroup.position.copy(state.claw.position);
            swirlGroup.rotation.y += 0.1;
        },
    }, 0.6);

    // 5. Land impact (at ~0.95 sec)
    tl.call(() => {
        // Ground burst (gear particles from utils)
        spawnEnergyBurst(new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z), 40, '#ffaa44');

        // Expanding aura ring
        auraRing.position.set(state.claw.position.x, 0.05, state.claw.position.z);
        auraMat.opacity = 0.9;
        gsap.to(auraRing.scale, { x: 4, y: 4, z: 4, duration: 0.8, ease: 'power2.out' });
        gsap.to(auraMat, { opacity: 0, duration: 0.6, delay: 0.2 });

        // Lightning strikes at 3–5 random positions
        const strikeCount = isNight ? 5 : 3;
        for (let s = 0; s < strikeCount; s++) {
            const randX = (Math.random() - 0.5) * 30;
            const randZ = (Math.random() - 0.5) * 30;
            const strikePos = new THREE.Vector3(randX, 0, randZ);
            // Use sky's lightning at that position? No, we'll create our own bolt.
            createAndFlashLightning(strikePos);
        }
    }, null, 0.95);

    // 6. Squash on landing
    tl.to(state.claw.scale, { y: 0.8, duration: 0.08, ease: 'power2.in' }, 0.95);
    // Recover
    tl.to(state.claw.scale, { y: 1, x: 1, z: 1, duration: 0.2, ease: 'elastic.out(1,0.5)' }, 1.03);
}

// ----- Helper: lightning bolt from sky to a ground point -----
function createAndFlashLightning(targetPos) {
    const start = new THREE.Vector3(targetPos.x, 12 + Math.random() * 4, targetPos.z);
    const end = targetPos.clone().setY(0.1);
    const bolt = createLightningLine(start, end, 8, '#ffcc88', 0.9);
    state.scene.add(bolt);
    // Flash point light at target
    const light = new THREE.PointLight('#ffcc88', 2, 8);
    light.position.copy(end);
    state.scene.add(light);
    // Fade out and remove
    gsap.to(bolt.material, { opacity: 0, duration: 0.5, delay: 0.15, onComplete: () => {
        state.scene.remove(bolt);
        bolt.geometry.dispose();
        bolt.material.dispose();
    }});
    gsap.to(light, { intensity: 0, duration: 0.4, delay: 0.1, onComplete: () => state.scene.remove(light) });
}

// ----- Helper: glowing circle sprite (reused from attack.js, can be imported) -----
function createGlowSprite(color, size) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    return sprite;
}

// ----- Helper: lightning line (reused) -----
function createLightningLine(start, end, segments, color, opacity) {
    const points = [start.clone()];
    const step = end.clone().sub(start).divideScalar(segments);
    for (let i = 1; i < segments; i++) {
        const p = start.clone().add(step.clone().multiplyScalar(i));
        p.x += (Math.random() - 0.5) * 0.5;
        p.y += (Math.random() - 0.5) * 0.5;
        p.z += (Math.random() - 0.5) * 0.5;
        points.push(p);
    }
    points.push(end.clone());
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending });
    return new THREE.Line(geo, mat);
}