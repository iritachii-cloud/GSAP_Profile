import * as THREE from 'three';
import { state } from './state.js';
import { RIVER_Z, RIVER_WIDTH } from './waterBridge.js';

// ─── Module state ──────────────────────────────────────────────────────────
let birds        = [];
let animHandle   = null;
let running      = false;

const BIRD_COUNT   = 18;
const FLEE_RADIUS  = 3.5;
const SPAWN_RADIUS = 12;

// ─── Bird sprite ──────────────────────────────────────────────────────────
function createBirdSprite() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.52);
    ctx.quadraticCurveTo(size * 0.25, size * 0.30, size * 0.02, size * 0.42);
    ctx.quadraticCurveTo(size * 0.25, size * 0.58, size * 0.5, size * 0.52);
    ctx.moveTo(size * 0.5, size * 0.52);
    ctx.quadraticCurveTo(size * 0.75, size * 0.30, size * 0.98, size * 0.42);
    ctx.quadraticCurveTo(size * 0.75, size * 0.58, size * 0.5, size * 0.52);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.52, size * 0.06, size * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        color: 0x222222
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.2, 0.2 * 0.5, 1);
    return sprite;
}

// ─── Helper: check if point is on walkable ground (not water) ─────────────
function isOnGround(x, z) {
    const halfRiver = RIVER_WIDTH / 2;
    if (z > RIVER_Z - halfRiver && z < RIVER_Z + halfRiver) return false;
    const bounds = state.groundBounds;
    if (x < bounds.xMin || x > bounds.xMax || z < bounds.zMin || z > bounds.zMax) return false;
    return true;
}

// ─── Get a random ground position ─────────────────────────────────────────
function randomGroundPosition() {
    for (let attempt = 0; attempt < 50; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const r     = Math.random() * SPAWN_RADIUS;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        if (isOnGround(x, z)) return new THREE.Vector3(x, 0.02, z);
    }
    return new THREE.Vector3(0, 0.02, -8);
}

// ─── Spawn a bird at a random ground spot ─────────────────────────────────
function spawnBird() {
    const pos = randomGroundPosition();
    const sprite = createBirdSprite();
    sprite.position.copy(pos);
    sprite.material.opacity = 0.85;
    state.scene.add(sprite);

    return {
        sprite,
        state: 'idle',
        speed: 1.5 + Math.random() * 2.0,
        targetY: 3 + Math.random() * 5,
        opacity: 0.85
    };
}

// ─── Main loop ─────────────────────────────────────────────────────────────
let lastTime = performance.now();

function tick() {
    if (!running) return;
    animHandle = requestAnimationFrame(tick);

    const now   = performance.now();
    const delta = Math.min(0.05, (now - lastTime) / 1000);
    lastTime    = now;

    const charPos = state.claw ? new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z) : null;

    for (let i = birds.length - 1; i >= 0; i--) {
        const b = birds[i];

        if (b.state === 'idle') {
            b.sprite.position.y = 0.02 + Math.sin(now * 0.005 + i) * 0.01;

            if (charPos) {
                const dist = b.sprite.position.distanceTo(charPos);
                if (dist < FLEE_RADIUS) {
                    b.state = 'fleeing';
                    b.fleeStartTime = now;
                    b.startY = b.sprite.position.y;
                }
            }
        } else if (b.state === 'fleeing') {
            const elapsed = (now - b.fleeStartTime) / 1000;
            const progress = Math.min(1, elapsed * b.speed);
            b.sprite.position.y = b.startY + progress * b.targetY;
            b.opacity = Math.max(0, 0.85 * (1 - progress));
            b.sprite.material.opacity = b.opacity;

            b.sprite.position.x += (Math.sin(elapsed * 5 + i) * 0.008) * delta;
            b.sprite.position.z += (Math.cos(elapsed * 5 + i) * 0.008) * delta;

            if (progress >= 1 || b.opacity <= 0.01) {
                state.scene.remove(b.sprite);
                b.sprite.material.map.dispose();
                b.sprite.material.dispose();
                birds.splice(i, 1);

                setTimeout(() => {
                    if (running) birds.push(spawnBird());
                }, 2000 + Math.random() * 3000);
            }
        }
    }
}

// ─── Public API ────────────────────────────────────────────────────────────
export function startBirds() {
    if (running) return;
    running = true;

    for (let i = 0; i < BIRD_COUNT; i++) {
        birds.push(spawnBird());
    }
    lastTime = performance.now();
    tick();
}

export function stopBirds() {
    running = false;
    if (animHandle) { cancelAnimationFrame(animHandle); animHandle = null; }
    birds.forEach(b => {
        state.scene.remove(b.sprite);
        b.sprite.material.map?.dispose();
        b.sprite.material.dispose();
    });
    birds = [];
    state.birds = null;
}