import * as THREE from 'three';
import { state } from './state.js';
import {
    createDarkEnergyMesh,
    spawnDarkImpactSplash,
    spawnClawSlash,
    spawnDarkSparks
} from './utils.js';
import { startStorm, stopStorm } from './storm.js';
import { startDanceMusic, stopDanceMusic } from './music.js';

// Ground Y level (same as main character's baseY)
let groundY = 0;

function setGroundY() {
    if (state.claw && state.claw.userData.baseY !== undefined) {
        groundY = state.claw.userData.baseY;
    }
}

function playCloneJump(clone) {
    const baseY = clone.userData.baseY ?? 0;   // local Y (0 = on ground)
    const baseScale = clone.userData.baseScale ?? 0.55;
    const tl = gsap.timeline();
    tl.to(clone.scale, { y: baseScale * 0.65, duration: 0.12, ease: 'power2.in' })
      .to(clone.position, { y: baseY + 0.7, duration: 0.25, ease: 'power2.out' })
      .to(clone.scale, { y: baseScale * 1.2, duration: 0.14 }, '-=0.15')
      .to(clone.position, { y: baseY, duration: 0.28, ease: 'bounce.out' })
      .to(clone.scale, { y: baseScale * 0.8, duration: 0.08 }, '-=0.1')
      .to(clone.scale, { y: baseScale, duration: 0.18 })
      .call(() => spawnDarkImpactSplash(clone.position, 6), null, 0.35)
      .to({}, { duration: 0.45 });
    state.cloneTweens.push(tl);
    return tl;
}

// Clone spin: only rotates the clone, no vertical movement; particle cylinder stays grounded
function playCloneSpin(clone) {
    const tl = gsap.timeline();
    // Rotate clone itself (Y rotation only) – stays at groundY
    tl.to(clone.rotation, { y: '+=6.2832', duration: 1.3, ease: 'power1.inOut' }, 0);
    
    // Create a particle cylinder around the clone that rises from ground
    const vortexGroup = new THREE.Group();
    vortexGroup.position.copy(clone.position);
    vortexGroup.position.y = 0; // local space – group handles world Y
    state.scene.add(vortexGroup);  // add to scene so it's in world space
    state.tempGroups.push(vortexGroup);
    
    const particleCount = 180;
    const radius = 0.8;
    const minY = -0.15;   // relative to vortexGroup (which sits at world groundY)
    const maxY = 1.7;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleData = [];
    for (let i = 0; i < particleCount; i++) {
        const y = minY + Math.random() * (maxY - minY);
        const angle = Math.random() * Math.PI * 2;
        const r = radius * (0.8 + Math.random() * 0.4);
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        positions[i*3] = x;
        positions[i*3+1] = y;
        positions[i*3+2] = z;
        particleData.push({
            radius: r,
            angle: angle,
            baseY: y,
            speed: 0.3 + Math.random() * 0.6,
            rotSpeed: 1.0 + Math.random() * 1.8
        });
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#88ff88';
    ctx.beginPath(); ctx.arc(8,8,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#44aa44';
    ctx.beginPath(); ctx.arc(8,8,2.5,0,Math.PI*2); ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.PointsMaterial({ color: 0x88ff88, map: texture, size: 0.07, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(geometry, material);
    vortexGroup.add(particles);
    
    // Rotate the cylinder opposite direction
    gsap.to(vortexGroup.rotation, { y: '-=6.2832', duration: 1.3, ease: 'none' });
    
    // Rising animation
    let lastTime = performance.now();
    function animateRise() {
        if (!state.activeTimeline && vortexGroup.parent) return;
        const now = performance.now();
        const delta = Math.min(0.033, (now - lastTime) / 1000);
        lastTime = now;
        const posAttr = geometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            let newY = posAttr[i*3+1] + particleData[i].speed * delta;
            if (newY > maxY) {
                newY = minY;
                const newAngle = Math.random() * Math.PI * 2;
                const newRadius = radius * (0.8 + Math.random() * 0.4);
                posAttr[i*3] = Math.cos(newAngle) * newRadius;
                posAttr[i*3+2] = Math.sin(newAngle) * newRadius;
                particleData[i].radius = newRadius;
                particleData[i].angle = newAngle;
            }
            posAttr[i*3+1] = newY;
            const angle = particleData[i].angle + now * 0.002 * particleData[i].rotSpeed;
            posAttr[i*3] = Math.cos(angle) * particleData[i].radius;
            posAttr[i*3+2] = Math.sin(angle) * particleData[i].radius;
        }
        geometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(animateRise);
    }
    requestAnimationFrame(animateRise);
    
    tl.eventCallback('onComplete', () => {
        gsap.killTweensOf(vortexGroup.rotation);
        geometry.dispose(); material.dispose(); texture.dispose();
        if (vortexGroup.parent) state.scene.remove(vortexGroup);
        const idx = state.tempGroups.indexOf(vortexGroup);
        if (idx > -1) state.tempGroups.splice(idx, 1);
    });
    state.cloneTweens.push(tl);
    return tl;
}

function playCloneClaw(clone) {
    const tl = gsap.timeline();
    tl.to(clone.position, { x: clone.position.x + 0.07, duration: 0.045, repeat: 8, yoyo: true, ease: 'none' }, 0)
      .to(clone.rotation, { z: -0.13, duration: 0.045, repeat: 8, yoyo: true, ease: 'none' }, 0)
      .to(clone.scale, { x: clone.userData.baseScale * 1.2, y: clone.userData.baseScale * 1.2, duration: 0.1, repeat: 3, yoyo: true }, 0)
      .call(() => spawnClawSlash(6, clone), null, 0.1)
      .call(() => spawnDarkSparks(clone.position, 8), null, 0.15)
      .to({}, { duration: 0.7 });
    state.cloneTweens.push(tl);
    return tl;
}

function getRoundAction() {
    if (!state.nextCloneAction) {
        const actions = ['jump', 'spin', 'claw'];
        state.nextCloneAction = actions[Math.floor(Math.random() * actions.length)];
        state.nextCloneActionReaders = 1;
    } else {
        state.nextCloneActionReaders++;
    }
    const action = state.nextCloneAction;
    if (state.nextCloneActionReaders >= 4) {
        state.currentSequence++;
        const disp = document.getElementById('seqDisplay');
        if (disp) disp.textContent = state.currentSequence;
        if (state.danceSequencesTarget > 0 && state.currentSequence >= state.danceSequencesTarget) {
            // stop soon
        }
        state.nextCloneAction = null;
        state.nextCloneActionReaders = 0;
    }
    return action;
}

function performActionThenMove(clone, currentIdx, actionType) {
    // Local positions relative to cloneGroup (which is already at groundY in world space)
    const positions = [
        new THREE.Vector3( 2.6, 0,  2.6),
        new THREE.Vector3(-2.6, 0,  2.6),
        new THREE.Vector3(-2.6, 0, -2.6),
        new THREE.Vector3( 2.6, 0, -2.6),
    ];

    // Ensure clone is exactly at local Y=0 before any action
    clone.position.y = 0;
    
    const centre = state.claw.position.clone();
    centre.y = groundY; // ignore vertical offset for facing direction
    const toCentre = new THREE.Vector3().subVectors(centre, clone.position);
    const centreAngle = Math.atan2(toCentre.x, toCentre.z);
    const rotToCentre = gsap.to(clone.rotation, { y: centreAngle, duration: 0.3, ease: 'power2.out' });
    state.cloneTweens.push(rotToCentre);
    
    rotToCentre.eventCallback('onComplete', () => {
        let actionTL;
        switch (actionType) {
            case 'jump': actionTL = playCloneJump(clone); break;
            case 'spin': actionTL = playCloneSpin(clone); break;
            case 'claw': actionTL = playCloneClaw(clone); break;
            default: actionTL = playCloneJump(clone);
        }
        actionTL.eventCallback('onComplete', () => {
            if (state.danceSequencesTarget > 0 && state.currentSequence >= state.danceSequencesTarget) {
                stopStorm();
                clearDanceClones();
                if (state.mainDanceTL) state.mainDanceTL.kill();
                state.currentAnim = null;
                state.activeTimeline = null;
                return;
            }
            const nextAction = getRoundAction();
            const nextIdx = (currentIdx + 1) % 4;
            const targetPos = positions[nextIdx].clone();
            // local Y stays 0 (group handles world offset)
            targetPos.y = 0;
            
            const direction = new THREE.Vector3().subVectors(targetPos, clone.position);
            const targetAngle = Math.atan2(direction.x, direction.z);
            let curAngle = clone.rotation.y % (Math.PI * 2);
            let delta = targetAngle - curAngle;
            if (delta > Math.PI) delta -= Math.PI * 2;
            if (delta < -Math.PI) delta += Math.PI * 2;
            const finalAngle = curAngle + delta;
            
            const rotToDest = gsap.to(clone.rotation, { y: finalAngle, duration: 0.3, ease: 'power2.out' });
            state.cloneTweens.push(rotToDest);
            
            rotToDest.eventCallback('onComplete', () => {
                // Move horizontally only, Y stays at groundY
                gsap.killTweensOf(clone.position);
                const moveTL = gsap.to(clone.position, {
                    x: targetPos.x,
                    z: targetPos.z,
                    duration: 3,
                    ease: 'power2.inOut',
                    onUpdate: () => {
                        clone.position.y = 0; // keep exactly on ground (local)
                    },
                    onComplete: () => {
                        clone.position.y = 0;
                        performActionThenMove(clone, nextIdx, nextAction);
                    }
                });
                state.cloneTweens.push(moveTL);
            });
        });
    });
}

export function clearDanceClones() {
    state.cloneTweens.forEach(t => t.kill());
    state.cloneTweens = [];
    if (state.cloneGroup) {
        state.scene.remove(state.cloneGroup);
        state.cloneGroup.traverse(c => {
            if (c.material) { if(Array.isArray(c.material)) c.material.forEach(m=>m.dispose()); else c.material.dispose(); }
            if (c.geometry) c.geometry.dispose();
        });
        state.cloneGroup = null;
    }
    state.danceClones = [];
    state.nextCloneAction = null;
    state.nextCloneActionReaders = 0;
    state.danceSequencesTarget = 0;
}

export function spawnDanceClones() {
    if (!state.claw) return;
    setGroundY(); // update groundY from main character
    clearDanceClones();
    state.cloneGroup = new THREE.Group();
    // Position group at claw's XZ, Y = groundY so clones with local Y=0 land exactly on ground
    state.cloneGroup.position.set(
        state.claw.position.x,
        state.claw.userData.baseY ?? 0,
        state.claw.position.z
    );
    state.scene.add(state.cloneGroup);

    // Local positions (relative to group) – Y=0 means exactly at ground level
    const positions = [
        new THREE.Vector3( 2.6, 0,  2.6),
        new THREE.Vector3(-2.6, 0,  2.6),
        new THREE.Vector3(-2.6, 0, -2.6),
        new THREE.Vector3( 2.6, 0, -2.6),
    ];
    const firstAction = getRoundAction();
    for (let i = 0; i < 4; i++) {
        const clone = state.claw.clone(true);
        clone.position.copy(positions[i]);
        clone.scale.setScalar(0.55);
        clone.rotation.set(0, 0, 0);
        clone.userData.baseY = 0;   // local Y relative to group
        clone.userData.baseScale = 0.55;
        clone.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
        state.cloneGroup.add(clone);
        state.danceClones.push({ mesh: clone, index: i });
        performActionThenMove(clone, i, firstAction);
    }
}

export function danceClaw(loop = false, sequences = 1) {
    if (state.activeTimeline) { state.activeTimeline.kill(); state.activeTimeline = null; }
    stopDanceMusic();
    stopStorm();
    clearDanceClones();
    setGroundY();
    state.currentAnim = 'dance';
    startDanceMusic();
    startStorm();
    state.danceSequencesTarget = loop ? 0 : sequences;
    state.currentSequence = 0;
    const disp = document.getElementById('seqDisplay');
    if (disp) disp.textContent = '0';
    spawnDanceClones();
    if (state.mainDanceTL) state.mainDanceTL.kill();
    const base = state.claw.userData.baseY ?? groundY;
    state.mainDanceTL = gsap.timeline({ repeat: -1, yoyo: true });
    state.mainDanceTL
        .to(state.claw.rotation, { z: 0.12, duration: 0.5, ease: 'sine.inOut' }, 0)
        .to(state.claw.position, { y: base + 0.22, duration: 0.38, ease: 'power1.out' }, 0)
        .to(state.claw.position, { y: base, duration: 0.38, ease: 'power1.in' }, 0.38)
        .to(state.claw.rotation, { z: -0.12, duration: 0.5, ease: 'sine.inOut' }, 0.6);
    state.activeTimeline = state.mainDanceTL;
}