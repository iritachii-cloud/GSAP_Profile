import * as THREE from 'three';
import { state } from './state.js';

export function createPetalSprite(color = '#ff365e', size = 0.15) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(16, 8, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(24, 16, 5, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, 16, 5, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(16, 22, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
        map: texture, transparent: true, opacity: 0.9,
        blending: THREE.NormalBlending, depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    return sprite;
}

export function spawnPetalBurst(position, count = 20, color = '#ff365e') {
    const group = new THREE.Group();
    group.position.copy(position);
    state.scene.add(group);
    state.tempGroups.push(group);
    for (let i=0; i<count; i++) {
        const petal = createPetalSprite(color, 0.12 + Math.random()*0.1);
        petal.position.set(
            (Math.random()-0.5)*0.8, Math.random()*0.8, (Math.random()-0.5)*0.8
        );
        group.add(petal);
        state.darkEffectsPool.push(petal);

        gsap.to(petal.position, {
            x: petal.position.x + (Math.random()-0.5)*1.5,
            y: petal.position.y + 1.4,
            z: petal.position.z + (Math.random()-0.5)*1.5,
            duration: 0.8, ease: 'power2.out'
        });
        gsap.to(petal.material, {
            opacity: 0, duration: 0.7, delay: 0.2,
            onComplete: () => {
                group.remove(petal);
                petal.material.dispose();
                const idx = state.darkEffectsPool.indexOf(petal);
                if (idx > -1) state.darkEffectsPool.splice(idx, 1);
            }
        });
    }
    gsap.to({}, { duration: 1.2, onComplete: () => {
        if (group.parent) state.scene.remove(group);
        const idx = state.tempGroups.indexOf(group);
        if (idx > -1) state.tempGroups.splice(idx, 1);
    }});
}

export function spawnGroundBash(position) {
    const ring = createPetalSprite('#ff99bb', 0.3);
    ring.position.copy(position);
    ring.position.y = -0.05;
    state.scene.add(ring);
    gsap.to(ring.scale, { x: 2.5, y: 2.5, duration: 0.5, ease: 'backOut' });
    gsap.to(ring.material, { opacity: 0, duration: 0.6, onComplete: () => {
        state.scene.remove(ring); ring.material.dispose();
    }});
    spawnPetalBurst(position, 30);
}

export function clearAllEffects() {
    state.darkEffectsPool.forEach(e => {
        if (e.parent) e.parent.remove(e);
        if (e.material) {
            if (e.material.map) e.material.map.dispose();
            e.material.dispose();
        }
    });
    state.darkEffectsPool = [];
    state.tempGroups.forEach(group => {
        if (group.parent) state.scene.remove(group);
        group.traverse(obj => {
            if (obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
            if (obj.geometry) obj.geometry.dispose();
        });
    });
    state.tempGroups = [];
}

export function groundCharacter() {
    if (!state.claw) return;
    const box = new THREE.Box3().setFromObject(state.claw);
    const minY = box.min.y;
    state.claw.position.y -= minY;
    state.claw.userData.baseY = state.claw.position.y;
}