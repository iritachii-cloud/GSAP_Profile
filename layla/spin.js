import * as THREE from 'three';
import { state } from './state.js';
import { playSpinSFX } from './music.js';

/**
 * Layla spins, creating a wide swirling vortex of lightning arcs.
 * No left‑over artefacts — everything is cleaned up on finish or interrupt.
 */
export function spinClaw(loop = false, sequences = 1) {
    // Kill any previous animation
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }

    playSpinSFX();
    state.currentAnim = 'spin';
    state.currentSequence = 1;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '1';

    const isNight = state.timeOfDay === 'night';
    const vortexRadius = 2.0;            // tight width
    const vortexHeight = 4.5;            // tall
    const arcCount = isNight ? 16 : 10;
    const rotationDuration = 1.8;

    // ---- Vortex container ----
    const vortexGroup = new THREE.Group();
    vortexGroup.position.copy(state.claw.position);
    state.scene.add(vortexGroup);
    state.tempGroups.push(vortexGroup);

    // ---- Create swirling arcs ----
    const arcs = [];
    for (let i = 0; i < arcCount; i++) {
        const startAngle = (i / arcCount) * Math.PI * 2;
        const arcLength = Math.PI * 1.2;
        const arc = createLightningArc(startAngle, arcLength, vortexRadius, vortexHeight, 0.8);
        vortexGroup.add(arc);
        arcs.push({
            mesh: arc,
            baseAngle: startAngle,
            speed: 1.8 + Math.random() * 2.5,
            verticalOffset: Math.random() * vortexHeight,
        });
    }

    // ---- Map lightning strikes (temp) ----
    const mapStrikes = [];

    // ---- Cleanup function ----
    function cleanup() {
        // Remove and dispose vortex group and all its children
        if (vortexGroup.parent) {
            vortexGroup.traverse(obj => {
                if (obj.material) obj.material.dispose();
                if (obj.geometry) obj.geometry.dispose();
            });
            state.scene.remove(vortexGroup);
        }
        // Remove any leftover map lightning strikes
        clearMapStrikes(mapStrikes);
        // Reset character rotation if needed
        if (state.claw) {
            state.claw.rotation.y = state.claw.userData.originalRotationY || state.claw.rotation.y;
        }
        state.currentAnim = null;
        state.activeTimeline = null;
    }

    // ---- Timeline ----
    const tl = gsap.timeline({
        repeat: loop ? -1 : sequences - 1,
        onRepeat: () => {
            state.currentSequence++;
            if (disp) disp.textContent = state.currentSequence;
            playSpinSFX();
            spawnRandomMapLightning(isNight ? 4 : 2, mapStrikes);
        },
        onComplete: cleanup,
        onInterrupt: cleanup,   // ← ensures no leftover if killed
    });
    state.activeTimeline = tl;

    // Save initial rotation for reset
    if (state.claw) state.claw.userData.originalRotationY = state.claw.rotation.y;

    // Layla spins
    tl.to(state.claw.rotation, {
        y: `+=${Math.PI * 4}`,
        duration: rotationDuration,
        ease: 'none',
    }, 0);

    // Vortex rotation animation (separate tween, killed with timeline)
    tl.to({}, {
        duration: rotationDuration,
        ease: 'none',
        onUpdate: () => {
            const time = performance.now() * 0.001;
            vortexGroup.rotation.y += 0.04;
            arcs.forEach(a => {
                const angle = a.baseAngle + time * a.speed;
                updateLightningArc(
                    a.mesh,
                    angle,
                    Math.PI * 1.2,
                    vortexRadius,
                    a.verticalOffset,
                    0.7 + Math.sin(time * 10 + angle) * 0.2
                );
            });
        },
    }, 0);

    // Map lightning at start
    tl.call(() => {
        spawnRandomMapLightning(isNight ? 5 : 3, mapStrikes);
    }, null, 0);

    // Screen shake
    tl.to(state.cardEl, {
        x: 5,
        duration: 0.05,
        yoyo: true,
        repeat: 5,
        ease: 'none',
        onComplete: () => gsap.set(state.cardEl, { x: 0 }),
    }, 0.2);

    // Fade out arcs at the end
    tl.to(arcs.map(a => a.mesh.material), {
        opacity: 0,
        duration: 0.4,
    }, rotationDuration - 0.4);
}

// ---------- Lightning Arc Helpers ----------
function createLightningArc(startAngle, arcAngle, radius, height, opacity) {
    const segments = 12;
    const points = [];
    for (let i = 0; i <= segments; i++) {
        const a = startAngle + (i / segments) * arcAngle;
        const r = radius + (Math.random() - 0.5) * 0.3;
        const y = (i / segments) * height + Math.random() * 0.3;
        points.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
        color: '#ffff88',
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(geo, mat);
}

function updateLightningArc(line, startAngle, arcAngle, radius, heightOffset, opacity) {
    const segments = 12;
    const points = [];
    const h = 4.5; // full vortex height
    for (let i = 0; i <= segments; i++) {
        const a = startAngle + (i / segments) * arcAngle;
        const r = radius + (Math.random() - 0.5) * 0.5;
        const y = (i / segments) * h + heightOffset + Math.random() * 0.1;
        points.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    line.geometry.setFromPoints(points);
    line.material.opacity = opacity;
}

// ---------- Map Lightning Helpers ----------
function spawnRandomMapLightning(count, strikesArray) {
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 30;
        const z = (Math.random() - 0.5) * 30;
        const start = new THREE.Vector3(x, 10 + Math.random() * 4, z);
        const end = new THREE.Vector3(x, 0.1, z);
        const bolt = createSingleLine(start, end, '#ffdd88', 0.9);
        state.scene.add(bolt);
        const light = new THREE.PointLight('#ffdd88', 2, 8);
        light.position.copy(end);
        state.scene.add(light);
        gsap.to(bolt.material, {
            opacity: 0,
            duration: 0.5,
            delay: 0.2,
            onComplete: () => {
                state.scene.remove(bolt);
                bolt.geometry.dispose();
                bolt.material.dispose();
            },
        });
        gsap.to(light, {
            intensity: 0,
            duration: 0.4,
            delay: 0.15,
            onComplete: () => state.scene.remove(light),
        });
        strikesArray.push(bolt);
    }
}

function createSingleLine(start, end, color, opacity) {
    const segments = 8;
    const pts = [start.clone()];
    const step = end.clone().sub(start).divideScalar(segments);
    for (let i = 1; i < segments; i++) {
        const p = start.clone().add(step.clone().multiplyScalar(i));
        p.x += (Math.random() - 0.5) * 0.5;
        p.y += (Math.random() - 0.5) * 0.5;
        p.z += (Math.random() - 0.5) * 0.5;
        pts.push(p);
    }
    pts.push(end.clone());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending });
    return new THREE.Line(geo, mat);
}

function clearMapStrikes(strikesArray) {
    strikesArray.forEach(bolt => {
        if (bolt.parent) {
            state.scene.remove(bolt);
            bolt.geometry.dispose();
            bolt.material.dispose();
        }
    });
    strikesArray.length = 0;
}