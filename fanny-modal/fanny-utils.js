import * as THREE from 'three';
import { state } from './state.js';

// ── Slash mark sprite ─────────────────────────────────────────────
export function createSlashMesh(angle = 0, color = '#00d4ff') {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(angle);

    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 32;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(-52, -52); ctx.lineTo(52, 52); ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.lineWidth = 6;
    ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(-50, -50); ctx.lineTo(50, 50); ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(-44, -44); ctx.lineTo(30, 30); ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(52, -52); ctx.lineTo(-20, 20); ctx.stroke();

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.55, 0.55, 1);
    return sprite;
}

// ── Single cable/wire sprite ──────────────────────────────────────
export function createCableSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 16; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0,   'rgba(200,120,40,0)');
    grad.addColorStop(0.15,'rgba(200,120,40,0.95)');
    grad.addColorStop(0.5, 'rgba(255,210,120,1)');
    grad.addColorStop(0.85,'rgba(200,120,40,0.95)');
    grad.addColorStop(1,   'rgba(200,120,40,0)');

    ctx.shadowColor = '#c87dff';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = grad;
    ctx.fillRect(4, 0, 8, 256);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(6, 0, 4, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.06, 1.4, 1);
    return sprite;
}

// ── Spark particle — accepts optional LOD (purple/amber) mode ─────
export function createSparkMesh(lodColors = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
    if (lodColors) {
        // Purple / amber Land of Dawn palette
        const palette = [
            ['rgb(255, 140, 140)', 'rgba(200,80,255,0.9)',  'rgba(100,0,200,0)'],
            ['rgba(255,220,120,1)', 'rgba(200,120,60,0.85)', 'rgba(100,40,0,0)'],
            ['rgba(180,120,255,1)', 'rgba(120,40,220,0.8)',  'rgba(50,0,150,0)'],
        ];
        const p = palette[Math.floor(Math.random() * palette.length)];
        grad.addColorStop(0,   p[0]);
        grad.addColorStop(0.3, p[1]);
        grad.addColorStop(1,   p[2]);
    } else {
        grad.addColorStop(0,   'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(200,160,255,0.9)');
        grad.addColorStop(1,   'rgba(80,0,160,0)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.14, 0.14, 1);
    return sprite;
}

// ── Spawn slashes around kitty ────────────────────────────────────
export function spawnSlashEffects(count = 5, rMin = 0.2, rMax = 1.6) {
    const k = state.kitty;
    if (!k) return;

    const slashColors = ['#f0c060', '#e0a0ff', '#ffffff', '#c87dff'];

    for (let i = 0; i < count; i++) {
        const color  = slashColors[Math.floor(Math.random() * slashColors.length)];
        const angle  = Math.random() * Math.PI;
        const slash  = createSlashMesh(angle, color);
        const dir    = Math.random() * Math.PI * 2;
        const radius = rMin + Math.random() * (rMax - rMin);

        slash.position.set(
            k.position.x + Math.cos(dir) * radius,
            k.position.y + 0.3 + Math.random() * 1.1,
            k.position.z + Math.sin(dir) * radius
        );
        slash.scale.setScalar(0.05);
        state.scene.add(slash);
        state.heartsPool.push(slash);

        gsap.to(slash.scale, { x: 0.7, y: 0.7, duration: 0.1, ease: 'power3.out' });
        gsap.to(slash.material, {
            opacity: 0,
            duration: 0.35 + Math.random() * 0.25,
            delay: 0.08,
            ease: 'power2.in',
            onComplete: () => {
                state.scene.remove(slash);
                slash.material.dispose();
                slash.material.map?.dispose();
                const idx = state.heartsPool.indexOf(slash);
                if (idx > -1) state.heartsPool.splice(idx, 1);
            }
        });
    }
}

// ── Spawn sparks ──────────────────────────────────────────────────
export function spawnSparks(target, count = 10) {
    for (let i = 0; i < count; i++) {
        const spark = createSparkMesh();
        spark.position.set(
            target.position.x + (Math.random() - 0.5) * 0.4,
            target.position.y + 0.2 + Math.random() * 0.6,
            target.position.z + (Math.random() - 0.5) * 0.4
        );
        state.scene.add(spark);
        state.heartsPool.push(spark);

        const vx = (Math.random() - 0.5) * 1.2;
        const vy = 0.4 + Math.random() * 0.9;
        const vz = (Math.random() - 0.5) * 1.2;

        gsap.to(spark.position, { x: `+=${vx}`, y: `+=${vy}`, z: `+=${vz}`, duration: 0.5 + Math.random() * 0.3, ease: 'power2.out' });
        gsap.to(spark.material, {
            opacity: 0,
            duration: 0.4 + Math.random() * 0.3,
            delay: 0.05,
            ease: 'power2.in',
            onComplete: () => {
                state.scene.remove(spark);
                spark.material.dispose();
                spark.material.map?.dispose();
                const idx = state.heartsPool.indexOf(spark);
                if (idx > -1) state.heartsPool.splice(idx, 1);
            }
        });
    }
}

// ── Cable ring (for spin/dance) ───────────────────────────────────
export function createCableRing(count = 8, radius = 0.7) {
    const group = new THREE.Group();
    if (state.kitty) group.position.copy(state.kitty.position);
    state.scene.add(group);
    state.tempGroups.push(group);

    const cables = [];
    for (let i = 0; i < count; i++) {
        const cable = createCableSprite();
        const angle = (i / count) * Math.PI * 2;
        cable.position.set(Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius);
        cable.material.rotation = angle + Math.PI / 2;
        cable.material.opacity  = 0;
        group.add(cable);
        cables.push({ sprite: cable, angle });
    }

    return { group, cables };
}

export function clearAllTempEffects() {
    state.tempGroups.forEach(group => {
        if (group.parent) state.scene.remove(group);
        if (group.material) {
            if (Array.isArray(group.material)) group.material.forEach(m => m.dispose());
            else group.material.dispose();
        }
        if (group.geometry) group.geometry.dispose();
        group.traverse(obj => {
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
            if (obj.geometry) obj.geometry.dispose();
        });
    });
    state.tempGroups = [];
    state.heartsPool.forEach(h => {
        if (h.parent) state.scene.remove(h);
        if (h.material) {
            h.material.dispose();
            if (h.material.map) h.material.map.dispose();
        }
    });
    state.heartsPool.length = 0;
}