import * as THREE from 'three';
import { state } from './state.js';

export function createDarkEnergyMesh() {
    // Create a soft glowing particle (green/purple gradient)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, '#aaffaa');
    gradient.addColorStop(0.4, '#88ff88');
    gradient.addColorStop(0.7, '#44aa44');
    gradient.addColorStop(1, '#226622');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(180, 255, 180, ${Math.random() * 0.8})`;
        ctx.fillRect(Math.random() * 32, Math.random() * 32, 1.5, 1.5);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.18, 0.18, 1);
    return sprite;
}

export function spawnClawSlash(count = 8, origin = null) {
    const pos = origin ? origin.position : state.claw.position;
    for (let i=0; i<count; i++) {
        const slash = createDarkEnergyMesh();
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.4 + Math.random() * 0.9;
        slash.position.set(
            pos.x + Math.cos(angle) * radius,
            pos.y + 0.2 + Math.random() * 0.7,
            pos.z + Math.sin(angle) * radius
        );
        slash.scale.set(0.18, 0.18, 1);
        state.scene.add(slash);
        state.darkEffectsPool.push(slash);
        gsap.to(slash.scale, { x: 0.45, y: 0.45, duration: 0.45, ease: 'backOut' });
        gsap.to(slash.material, {
            opacity: 0,
            duration: 0.6,
            ease: 'power2.in',
            onComplete: () => {
                state.scene.remove(slash);
                slash.material.dispose();
                const idx = state.darkEffectsPool.indexOf(slash);
                if (idx > -1) state.darkEffectsPool.splice(idx, 1);
            }
        });
        gsap.to(slash.position, {
            x: slash.position.x + (Math.random() - 0.5) * 0.6,
            y: slash.position.y + 0.4,
            z: slash.position.z + (Math.random() - 0.5) * 0.6,
            duration: 0.5
        });
    }
}

export function spawnDarkSparks(pos, count = 12) {
    for (let i=0; i<count; i++) {
        const spark = createDarkEnergyMesh();
        spark.material.color = new THREE.Color(0x88ff88);
        spark.scale.setScalar(0.09 + Math.random()*0.1);
        spark.position.copy(pos);
        spark.position.x += (Math.random() - 0.5) * 0.8;
        spark.position.z += (Math.random() - 0.5) * 0.8;
        spark.position.y += Math.random() * 0.7;
        state.scene.add(spark);
        state.darkEffectsPool.push(spark);
        gsap.to(spark.position, {
            y: spark.position.y + 0.6,
            x: spark.position.x + (Math.random() - 0.5)*0.5,
            z: spark.position.z + (Math.random() - 0.5)*0.5,
            duration: 0.6,
            ease: 'power2.out'
        });
        gsap.to(spark.material, { opacity: 0, duration: 0.5, onComplete: () => {
            state.scene.remove(spark);
            spark.material.dispose();
        }});
    }
}

export function spawnDarkImpactSplash(pos, count = 8) {
    for (let i=0; i<count; i++) {
        const ring = createDarkEnergyMesh();
        ring.scale.setScalar(0.1);
        ring.position.copy(pos);
        ring.position.y -= 0.1;
        state.scene.add(ring);
        gsap.to(ring.scale, { x: 0.7, y: 0.7, duration: 0.5, ease: 'backOut' });
        gsap.to(ring.material, { opacity: 0, duration: 0.55, onComplete: () => {
            state.scene.remove(ring);
            ring.material.dispose();
        }});
    }
    spawnDarkSparks(pos, count*2);
}

export function clearAllDarkEffects() {
    state.darkEffectsPool.forEach(e => {
        if (e.parent) state.scene.remove(e);
        if (e.material) e.material.dispose();
    });
    state.darkEffectsPool = [];
    state.tempGroups.forEach(group => {
        if (group.parent) state.scene.remove(group);
        if (group.traverse) group.traverse(obj => {
            if (obj.material) obj.material.dispose();
            if (obj.geometry) obj.geometry.dispose();
        });
    });
    state.tempGroups = [];
}

export function spawnThreeClawMark(position, slashDir = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.shadowColor = slashDir > 0 ? '#66ffaa' : '#aaffcc';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // 3 parallel diagonal scratch marks, slightly curved/tapered
    const spacing = 20;
    for (let i = 0; i < 3; i++) {
        const off = (i - 1) * spacing;
        // Fade each line: middle is brightest
        const alpha = i === 1 ? 1.0 : 0.72;
        ctx.strokeStyle = `rgba(100, 255, 160, ${alpha})`;
        ctx.beginPath();
        if (slashDir > 0) {
            // Upper-left to lower-right
            ctx.moveTo(18 + off,  8);
            ctx.bezierCurveTo(40 + off, 35, 85 + off, 85, 110 + off, 120);
        } else {
            // Upper-right to lower-left
            ctx.moveTo(110 - off,  8);
            ctx.bezierCurveTo(88 - off, 35,  43 - off, 85,  18 - off, 120);
        }
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
        map: texture, transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.55, 0.55, 1);
    sprite.position.copy(position);
    sprite.position.x += (Math.random() - 0.5) * 0.35;
    sprite.position.y += 0.5 + Math.random() * 0.75;
    sprite.position.z += 0.5;
    state.scene.add(sprite);
    state.darkEffectsPool.push(sprite);

    // Expand outward then fade
    gsap.to(sprite.scale, { x: 1.6, y: 1.6, duration: 0.45, ease: 'power2.out' });
    gsap.to(mat, {
        opacity: 0, duration: 0.5, delay: 0.08, ease: 'power2.in',
        onComplete: () => {
            state.scene.remove(sprite);
            texture.dispose();
            mat.dispose();
            const idx = state.darkEffectsPool.indexOf(sprite);
            if (idx > -1) state.darkEffectsPool.splice(idx, 1);
        }
    });
}
// Stub kept for shadow-claw.js import compatibility
export function spawnFloatingDarkParticles(count) {}