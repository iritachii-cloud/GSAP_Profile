import * as THREE from 'three';
import { state } from './state.js';
import { spawnEnergyBurst } from './utils.js';
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

    const isNight = state.timeOfDay === 'night';

    // --- Direction: where Layla is facing ---
    const charPos = state.claw.position.clone();
    const dir = new THREE.Vector3(
        Math.sin(state.claw.rotation.y),
        0,
        Math.cos(state.claw.rotation.y)
    ).normalize();

    const beamLength = 40;            // full map length
    const beamRadius = 0.6;           // big (≥ double body size)
    const chargeDuration = 2.5;       // before firing
    const beamDuration = 4.0;         // how long the beam stays
    const fadeDuration = 0.5;         // fade out after beam

    // --- Charging particles (spiral around her) ---
    const chargeGroup = new THREE.Group();
    chargeGroup.position.copy(charPos);
    state.scene.add(chargeGroup);
    state.tempGroups.push(chargeGroup);

    const particleCount = 60;
    const particles = [];
    const coldColor = new THREE.Color('#4488ff');   // start
    const warmColor = new THREE.Color('#ff8844');   // end

    for (let i = 0; i < particleCount; i++) {
        const sprite = createGlowSprite(coldColor.getStyle(), 0.18);
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.8 + Math.random() * 2.0;
        const height = Math.random() * 2.0;
        sprite.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        sprite.userData = {
            baseAngle: angle,
            baseRadius: radius,
            baseHeight: height,
            randomOffset: Math.random() * Math.PI * 2,
        };
        chargeGroup.add(sprite);
        particles.push(sprite);
    }

    // --- The beam (hidden until fired) ---
    const beamGeo = new THREE.CylinderGeometry(beamRadius, beamRadius, beamLength, 8);
    const beamMat = new THREE.MeshBasicMaterial({
        color: '#2288ff',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(charPos.clone().add(dir.clone().multiplyScalar(beamLength / 2)));
    beam.quaternion.copy(
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    );
    state.scene.add(beam);
    state.tempGroups.push(beam);

    // Night glow beam (wider)
    let glowBeam = null;
    if (isNight) {
        const glowGeo = new THREE.CylinderGeometry(beamRadius * 2.5, beamRadius * 2.5, beamLength, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: '#88ccff',
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
        });
        glowBeam = new THREE.Mesh(glowGeo, glowMat);
        glowBeam.position.copy(beam.position);
        glowBeam.quaternion.copy(beam.quaternion);
        state.scene.add(glowBeam);
        state.tempGroups.push(glowBeam);
    }

    // --- Lightning lines along the beam (created later) ---
    const lightningGroup = new THREE.Group();
    state.scene.add(lightningGroup);
    state.tempGroups.push(lightningGroup);
    const lightningLines = [];

    const tl = gsap.timeline({
        repeat: loop ? -1 : sequences - 1,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playAttackSFX();
        },
        onComplete: () => {
            // Cleanup all
            [chargeGroup, beam, lightningGroup].forEach(g => {
                if (g.parent) state.scene.remove(g);
                g.traverse(obj => {
                    if (obj.material) {
                        if (obj.material.map) obj.material.map.dispose();
                        obj.material.dispose();
                    }
                    if (obj.geometry) obj.geometry.dispose();
                });
            });
            if (glowBeam && glowBeam.parent) {
                state.scene.remove(glowBeam);
                glowBeam.geometry.dispose();
                glowBeam.material.dispose();
            }
            state.currentAnim = null;
            state.activeTimeline = null;
            // Reset character scale/rotation just in case
            if (state.claw) {
                gsap.killTweensOf(state.claw.scale);
                gsap.killTweensOf(state.claw.rotation);
                state.claw.rotation.z = 0;
                state.claw.scale.set(1,1,1);
            }
        },
    });
    state.activeTimeline = tl;

    // ===== PHASE 1: CHARGE (0 → 2.5s) =====
    // Character squash and lean
    tl.to(state.claw.rotation, { z: 0.15, duration: 0.3, ease: 'power2.out' }, 0);
    tl.to(state.claw.scale, { x: 0.85, y: 0.85, z: 0.85, duration: 0.3 }, 0);

    // Animate particles spiraling inward + color shift over 2.5s
    const chargeProgress = { value: 0 };
    tl.to(chargeProgress, {
        value: 1,
        duration: chargeDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
            const p = chargeProgress.value;
            // Update particle positions
            particles.forEach(sprite => {
                const ud = sprite.userData;
                // Radius shrinks toward centre
                const radius = ud.baseRadius * (1 - p * 0.8);
                // Angle increases (spiral)
                const angle = ud.baseAngle + p * Math.PI * 6 + ud.randomOffset;
                // Height rises slightly
                const height = ud.baseHeight + (0.2 - ud.baseHeight) * p;
                sprite.position.set(
                    Math.cos(angle) * radius,
                    height,
                    Math.sin(angle) * radius
                );
                // Color shift from cold to warm
                const color = coldColor.clone().lerp(warmColor, p);
                sprite.material.color.set(color);
                // Scale may grow slightly
                const s = 1 + p * 0.8;
                sprite.scale.set(s * 0.18, s * 0.18, 1);
            });
        },
    }, 0);

    // ===== PHASE 2: FIRE (2.5s) =====
    tl.call(() => playAttackSFX(), null, chargeDuration); // second blast sound
    // Flash point light at Layla's position
    tl.call(() => {
        const pLight = new THREE.PointLight('#4488ff', isNight ? 6 : 3, 12);
        pLight.position.copy(charPos);
        state.scene.add(pLight);
        gsap.to(pLight, { intensity: 0, duration: 0.8, delay: 0.2, onComplete: () => state.scene.remove(pLight) });
    }, null, chargeDuration);

    // Beam appears
    tl.to(beamMat, { opacity: 1, duration: 0.15 }, chargeDuration);
    if (glowBeam) {
        tl.to(glowBeam.material, { opacity: 0.6, duration: 0.15 }, chargeDuration);
    }

    // Create lightning lines
    const lightningCount = isNight ? 20 : 10;
    for (let i = 0; i < lightningCount; i++) {
        const start = charPos.clone().add(dir.clone().multiplyScalar(0.3));
        const end = charPos.clone().add(dir.clone().multiplyScalar(beamLength * 0.95));
        const line = createLightningLine(start, end, 8, '#88ffff', 0);
        lightningGroup.add(line);
        lightningLines.push(line);
    }

    // Lightning opacity up
    tl.to(lightningLines.map(l => l.material), {
        opacity: 1,
        duration: 0.1,
        stagger: 0.02,
    }, chargeDuration + 0.1);

    // Screen shake
    tl.to(state.cardEl, {
        x: 10,
        duration: 0.05,
        yoyo: true,
        repeat: 10,
        ease: 'none',
        onComplete: () => gsap.set(state.cardEl, { x: 0 }),
    }, chargeDuration + 0.05);

    // ===== PHASE 3: BEAM SUSTAIN (2.5s + 4s) =====
    // Nothing changes; beam stays visible for 4 seconds total from fire time.
    // So we just hold until 2.5+4 = 6.5s

    // ===== PHASE 4: FADE OUT (6.5s → 7.0s) =====
    const fadeStart = chargeDuration + beamDuration;
    tl.to(beamMat, { opacity: 0, duration: fadeDuration }, fadeStart);
    if (glowBeam) tl.to(glowBeam.material, { opacity: 0, duration: fadeDuration }, fadeStart);
    tl.to(lightningLines.map(l => l.material), { opacity: 0, duration: fadeDuration * 0.8 }, fadeStart);

    // Disperse charging particles
    tl.to(particles.map(p => p.position), {
        x: () => (Math.random() - 0.5) * 4,
        y: () => Math.random() * 3 + 1,
        z: () => (Math.random() - 0.5) * 4,
        duration: 0.8,
        ease: 'power2.out',
        stagger: 0.01,
    }, fadeStart);
    tl.to(particles.map(p => p.material), { opacity: 0, duration: 0.5 }, fadeStart + 0.2);

    // Restore character
    tl.to(state.claw.rotation, { z: 0, duration: 0.3 }, fadeStart + 0.3);
    tl.to(state.claw.scale, { x: 1, y: 1, z: 1, duration: 0.3 }, fadeStart + 0.3);

    // Night extra bursts
    if (isNight) {
        tl.call(() => {
            spawnEnergyBurst(charPos, 50, '#ffaa44');
        }, null, fadeStart + 0.1);
    }

    // Keep charge group aligned with character during charge
    tl.eventCallback('onUpdate', () => {
        if (chargeProgress.value < 1 && chargeGroup) {
            chargeGroup.position.copy(state.claw.position);
            // Recompute beam start if needed? No, beam is already placed at fire moment.
        }
    });
}

// --- Helper: glowing circle sprite ---
function createGlowSprite(color, size) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
        map: tex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    return sprite;
}

// --- Helper: lightning line ---
function createLightningLine(start, end, segments, color, opacity) {
    const points = [start.clone()];
    const step = end.clone().sub(start).divideScalar(segments);
    for (let i = 1; i < segments; i++) {
        const p = start.clone().add(step.clone().multiplyScalar(i));
        p.x += (Math.random() - 0.5) * 0.4;
        p.y += (Math.random() - 0.5) * 0.4;
        p.z += (Math.random() - 0.5) * 0.4;
        points.push(p);
    }
    points.push(end.clone());
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(geo, mat);
}