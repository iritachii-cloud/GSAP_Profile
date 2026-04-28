import * as THREE from 'three';
import { state } from './state.js';

export function createHeartMesh() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = '56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❤️', 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.2, 0.2, 1);
    return sprite;
}

export function spawnHeartsFromKitty(count = 8, radiusMin = 0.6, radiusMax = 1.8, yOffset = 0.3) {
    const k = state.kitty;
    if (!k) return;
    for (let i = 0; i < count; i++) {
        const heart = createHeartMesh();
        const angle = Math.random() * Math.PI * 2;
        const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
        heart.position.set(
            k.position.x + Math.cos(angle) * radius,
            k.position.y + yOffset + Math.random() * 0.8,
            k.position.z + Math.sin(angle) * radius
        );
        state.scene.add(heart);
        state.heartsPool.push(heart);

        gsap.to(heart.scale, { x: 0.5, y: 0.5, duration: 0.7 + Math.random() * 0.5, ease: 'power2.out' });
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

export function clearAllHearts() {
    state.heartsPool.forEach(h => {
        if (h.parent) state.scene.remove(h);
        if (h.material) {
            h.material.dispose();
            if (h.material.map) h.material.map.dispose();
        }
    });
    state.heartsPool.length = 0;
}

export function clearAllTempEffects() {
    // Remove any lingering temporary groups (e.g., spin vortex)
    state.tempGroups.forEach(group => {
        if (group.parent) state.scene.remove(group);
        group.traverse(obj => {
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
            if (obj.geometry) obj.geometry.dispose();
        });
    });
    state.tempGroups = [];
    // Also clear all hearts
    clearAllHearts();
}

export function spawnHeartsAroundTarget(target, count = 8, options = {}) {
    const {
        radiusMin = 0.3,
        radiusMax = 1.2,
        yOffset = 0.2,
        scaleStart = 0.15,
        scaleEnd = 0.4,
        life = 0.8,
        opacityFade = true
    } = options;
    for (let i = 0; i < count; i++) {
        const heart = createHeartMesh();
        heart.scale.setScalar(scaleStart);
        const angle = Math.random() * Math.PI * 2;
        const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
        heart.position.set(
            target.position.x + Math.cos(angle) * radius,
            target.position.y + yOffset + Math.random() * 0.5,
            target.position.z + Math.sin(angle) * radius
        );
        state.scene.add(heart);
        state.heartsPool.push(heart);

        gsap.to(heart.scale, { x: scaleEnd, y: scaleEnd, duration: life * 0.7, ease: 'power2.out' });
        if (opacityFade) {
            gsap.to(heart.material, {
                opacity: 0,
                duration: life,
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
}

export function spawnLandingHearts(target, count = 6) {
    for (let i = 0; i < count; i++) {
        const heart = createHeartMesh();
        const angle = Math.random() * Math.PI * 2;
        heart.position.set(
            target.position.x + Math.cos(angle) * 0.3,
            target.position.y - 0.1,
            target.position.z + Math.sin(angle) * 0.3
        );
        heart.scale.set(0.12, 0.12, 1);
        state.scene.add(heart);
        state.heartsPool.push(heart);

        gsap.to(heart.position, {
            x: heart.position.x + Math.cos(angle) * 0.6,
            y: heart.position.y + 0.3 + Math.random() * 0.4,
            z: heart.position.z + Math.sin(angle) * 0.6,
            duration: 0.5 + Math.random() * 0.3,
            ease: 'power2.out'
        });
        gsap.to(heart.material, {
            opacity: 0,
            duration: 0.6 + Math.random() * 0.2,
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

export function createSpinVortex(target) {
    const group = new THREE.Group();
    group.position.copy(target.position);
    state.scene.add(group);
    state.tempGroups.push(group);

    const heartCount = 8;
    const hearts = [];
    for (let i = 0; i < heartCount; i++) {
        const heart = createHeartMesh();
        const angle = (i / heartCount) * Math.PI * 2;
        heart.position.set(Math.cos(angle) * 0.4, 0.1, Math.sin(angle) * 0.4);
        heart.scale.set(0.18, 0.18, 1);
        group.add(heart);
        hearts.push(heart);
    }

    const tl = gsap.timeline();
    tl.to(group.rotation, { y: '-=3.1416', duration: 1.2, ease: 'sine.inOut' }, 0);
    hearts.forEach((h, i) => {
        tl.to(h.scale, { x: 0.3, y: 0.3, duration: 0.4, repeat: 1, yoyo: true, ease: 'power1.out' }, 0.1 + i * 0.03);
        const startAngle = (i / heartCount) * Math.PI * 2;
        const dist = 1.0;
        tl.to(h.position, { x: Math.cos(startAngle) * dist, z: Math.sin(startAngle) * dist, duration: 1.0, ease: 'power2.out' }, 0.2);
    });

    tl.eventCallback('onComplete', () => {
        hearts.forEach(h => {
            h.material.dispose();
            h.material.map?.dispose();
        });
        group.remove(...hearts);
        state.scene.remove(group);
        const idx = state.tempGroups.indexOf(group);
        if (idx > -1) state.tempGroups.splice(idx, 1);
    });

    return group;
}