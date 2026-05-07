import * as THREE from 'three';
import { state } from './state.js';
import { RIVER_Z, RIVER_WIDTH } from './waterBridge.js';

let drones = [];
let animHandle = null;
let running = false;

const DRONE_COUNT = 14;
const FLEE_RADIUS = 4.0;
const SPAWN_RADIUS = 14;

// -------- DRONE MODEL --------
function createDrone() {
    const group = new THREE.Group();

    // Body (metallic box)
    const bodyMat = new THREE.MeshStandardMaterial({
        color: '#8899aa',
        roughness: 0.3,
        metalness: 0.9,
        emissive: new THREE.Color('#112233'),
        emissiveIntensity: 0.0
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.35), bodyMat);
    body.castShadow = true;
    group.add(body);

    // Propeller ring (spinning torus)
    const propMat = new THREE.MeshStandardMaterial({
        color: '#aaccff',
        roughness: 0.4,
        metalness: 0.8,
        emissive: new THREE.Color('#224466'),
        emissiveIntensity: 0.0
    });
    const propRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 16), propMat);
    propRing.rotation.x = Math.PI / 2;
    propRing.position.y = 0.12;
    group.add(propRing);

    // Two blades (cross)
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#cccccc', roughness: 0.5, metalness: 0.6 });
    for (let r = 0; r < 2; r++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.06), bladeMat);
        blade.position.y = 0.12;
        blade.rotation.y = r * Math.PI / 2;
        group.add(blade);
    }

    // Eyes (two glowing spheres)
    const eyeMat = new THREE.MeshStandardMaterial({
        color: '#88ffff',
        roughness: 0.1,
        metalness: 0.2,
        emissive: new THREE.Color('#44ffff'),
        emissiveIntensity: 0.3   // dim by default
    });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8), eyeMat);
    eyeL.position.set(0.08, 0.03, 0.15);
    group.add(eyeL);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8), eyeMat);
    eyeR.position.set(-0.08, 0.03, 0.15);
    group.add(eyeR);

    // Store material references for day/night toggle
    group.userData = {
        bodyMat,
        propMat,
        eyeMat,
        propRing,
    };

    return group;
}

// -------- SPAWN / GROUND CHECK --------
function isOnGround(x, z) {
    const halfRiver = RIVER_WIDTH / 2;
    if (z > RIVER_Z - halfRiver && z < RIVER_Z + halfRiver) return false;
    const bounds = state.groundBounds;
    if (x < bounds.xMin || x > bounds.xMax || z < bounds.zMin || z > bounds.zMax) return false;
    return true;
}

function randomGroundPosition() {
    for (let attempt = 0; attempt < 50; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * SPAWN_RADIUS;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        if (isOnGround(x, z)) return new THREE.Vector3(x, 0.02, z);
    }
    return new THREE.Vector3(0, 0.02, -8);
}

function spawnDrone() {
    const pos = randomGroundPosition();
    const drone = createDrone();
    drone.position.copy(pos);
    // Start at a random flying height
    drone.position.y = 2 + Math.random() * 4;
    state.scene.add(drone);
    return {
        mesh: drone,
        state: 'idle',
        baseY: drone.position.y,
        speed: 1.0 + Math.random() * 1.5,
        targetY: 6 + Math.random() * 6,  // flee height
        opacity: 1.0,
    };
}

// -------- ANIMATION LOOP --------
let lastTime = performance.now();
function tick() {
    if (!running) return;
    animHandle = requestAnimationFrame(tick);
    const now = performance.now();
    const delta = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    const charPos = state.claw ? new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z) : null;

    for (let i = drones.length - 1; i >= 0; i--) {
        const d = drones[i];
        const drone = d.mesh;
        const ud = drone.userData;

        // Spin propeller continuously
        if (ud.propRing) {
            ud.propRing.rotation.z += delta * 10;
        }

        if (d.state === 'idle') {
            // Gentle bobbing
            drone.position.y = d.baseY + Math.sin(now * 0.003 + i) * 0.2;
            // Random slow drift
            drone.position.x += (Math.sin(now * 0.002 + i) * 0.3) * delta;
            drone.position.z += (Math.cos(now * 0.002 + i) * 0.3) * delta;

            if (charPos) {
                const dist = new THREE.Vector3(drone.position.x, 0, drone.position.z).distanceTo(charPos);
                if (dist < FLEE_RADIUS) {
                    d.state = 'fleeing';
                    d.fleeStartTime = now;
                    d.startY = drone.position.y;
                }
            }
        } else if (d.state === 'fleeing') {
            const elapsed = (now - d.fleeStartTime) / 1000;
            const progress = Math.min(1, elapsed * d.speed);
            drone.position.y = d.startY + progress * d.targetY;
            // Fade out the whole drone
            drone.traverse(obj => {
                if (obj.material && obj.material.opacity !== undefined) {
                    obj.material.transparent = true;
                    obj.material.opacity = Math.max(0, 1 - progress);
                }
            });
            // Drift away
            drone.position.x += (Math.sin(elapsed * 5 + i) * 0.02) * delta;
            drone.position.z += (Math.cos(elapsed * 5 + i) * 0.02) * delta;

            if (progress >= 1 || drone.material?.opacity <= 0.01) {
                state.scene.remove(drone);
                // Dispose materials
                drone.traverse(obj => {
                    if (obj.material) obj.material.dispose();
                });
                drones.splice(i, 1);
                // Respawn after a delay
                setTimeout(() => {
                    if (running && drones.length < DRONE_COUNT) {
                        drones.push(spawnDrone());
                    }
                }, 3000 + Math.random() * 4000);
            }
        }
    }

    // Maintain drone count
    while (drones.length < DRONE_COUNT && running) {
        drones.push(spawnDrone());
    }
}

// -------- PUBLIC API --------
export function startBirds() {
    if (running) return;
    running = true;
    // Initial spawn
    for (let i = 0; i < DRONE_COUNT; i++) drones.push(spawnDrone());
    lastTime = performance.now();
    tick();
}

export function stopBirds() {
    running = false;
    if (animHandle) { cancelAnimationFrame(animHandle); animHandle = null; }
    drones.forEach(d => {
        state.scene.remove(d.mesh);
        d.mesh.traverse(obj => {
            if (obj.material) obj.material.dispose();
        });
    });
    drones = [];
    state.birds = null;
}

// -------- DAY/NIGHT TOGGLE (called from dayNightManager) --------
export function setDroneTimeOfDay(time) {
    drones.forEach(d => {
        const ud = d.mesh.userData;
        if (!ud.bodyMat || !ud.eyeMat) return;
        if (time === 'night') {
            ud.bodyMat.emissiveIntensity = 0.5;
            ud.bodyMat.emissive.set('#224466');
            ud.propMat.emissiveIntensity = 0.7;
            ud.propMat.emissive.set('#44aaff');
            ud.eyeMat.emissiveIntensity = 2.0;
            ud.eyeMat.emissive.set('#88ffff');
        } else {
            ud.bodyMat.emissiveIntensity = 0.0;
            ud.propMat.emissiveIntensity = 0.0;
            ud.eyeMat.emissiveIntensity = 0.3;
            ud.eyeMat.emissive.set('#44ffff');
        }
    });
}