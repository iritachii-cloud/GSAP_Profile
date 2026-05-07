import * as THREE from 'three';
import { state } from './state.js';

/**
 * Creates a sprite with a cute gear/cog shape and a glowing centre.
 * @param {string} color - CSS color for the gear outline and centre glow.
 * @param {number} size - world size of the sprite.
 * @returns {THREE.Sprite}
 */
export function createPetalSprite(color = '#ffaa44', size = 0.15) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);

    // ---- Draw a gear shape ----
    const cx = 16, cy = 16, outerR = 14, innerR = 9, teeth = 8;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
        const angle = (i / teeth) * Math.PI * 2;
        const nextAngle = ((i + 1) / teeth) * Math.PI * 2;
        const midAngle = (angle + nextAngle) / 2;

        // Tooth outer point
        const toothX = cx + Math.cos(midAngle) * (outerR + 1.5);
        const toothY = cy + Math.sin(midAngle) * (outerR + 1.5);
        // Base points around the inner circle
        const baseX1 = cx + Math.cos(angle) * innerR;
        const baseY1 = cy + Math.sin(angle) * innerR;
        const baseX2 = cx + Math.cos(nextAngle) * innerR;
        const baseY2 = cy + Math.sin(nextAngle) * innerR;

        if (i === 0) ctx.moveTo(baseX1, baseY1);
        ctx.lineTo(toothX, toothY);
        ctx.lineTo(baseX2, baseY2);
    }
    ctx.closePath();
    ctx.fill();

    // Inner bright core
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, innerR - 1);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9,
        blending: THREE.NormalBlending,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    return sprite;
}

/**
 * Spawns a burst of gear sprites that fly outward from a position, spin, and fade.
 * @param {THREE.Vector3} position - centre of the burst.
 * @param {number} count - how many gears to spawn.
 * @param {string} color - CSS colour for the gears.
 */
export function spawnEnergyBurst(position, count = 20, color = '#ffaa44') {
    const group = new THREE.Group();
    group.position.copy(position);
    state.scene.add(group);
    state.tempGroups.push(group);

    for (let i = 0; i < count; i++) {
        const sprite = createPetalSprite(color, 0.12 + Math.random() * 0.1);
        sprite.position.set(
            (Math.random() - 0.5) * 0.8,
            Math.random() * 0.8,
            (Math.random() - 0.5) * 0.8
        );
        group.add(sprite);
        state.darkEffectsPool.push(sprite);

        // Fly outward
        gsap.to(sprite.position, {
            x: sprite.position.x + (Math.random() - 0.5) * 2.0,
            y: sprite.position.y + 1.6,
            z: sprite.position.z + (Math.random() - 0.5) * 2.0,
            duration: 1.0,
            ease: 'power2.out',
        });
        // Spin the sprite
        gsap.to(sprite, {
            // We can't directly tween rotation of a Sprite easily, so we fake it via material.rotation
            // Actually we'll use a custom property
            _spin: 1,
            duration: 0.9,
            ease: 'none',
            onUpdate: function () {
                sprite.material.rotation = (sprite.material.rotation || 0) + 0.1;
            },
        });
        // Fade out
        gsap.to(sprite.material, {
            opacity: 0,
            duration: 0.8,
            delay: 0.3,
            onComplete: () => {
                group.remove(sprite);
                sprite.material.dispose();
                const idx = state.darkEffectsPool.indexOf(sprite);
                if (idx > -1) state.darkEffectsPool.splice(idx, 1);
            },
        });
    }

    // Remove group after all done
    gsap.to({}, {
        duration: 1.5,
        onComplete: () => {
            if (group.parent) state.scene.remove(group);
            const idx = state.tempGroups.indexOf(group);
            if (idx > -1) state.tempGroups.splice(idx, 1);
        },
    });
}

// Backward compatibility alias
export const spawnPetalBurst = spawnEnergyBurst;

/**
 * Grounds the character (sets baseY and adjusts position).
 */
export function groundCharacter() {
    if (!state.claw) return;
    const box = new THREE.Box3().setFromObject(state.claw);
    const minY = box.min.y;
    state.claw.position.y -= minY;
    state.claw.userData.baseY = state.claw.position.y;
}

/**
 * Clears all temporary effects.
 */
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