import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { state } from './state.js';
import { setupEnvironment, updateEnvironment, applyTimeOfDay } from './environment.js';
import { jumpClaw } from './jump.js';
import { spinClaw } from './spin.js';
import { attackClaw } from './attack.js';
import { stopAICleanup, isBlocked, aStar } from './aiMode.js';
import { startFamilyChase, stopFamilyChase, preloadFamily } from './familyChase.js';
import { resetPose } from './reset.js';
import { groundCharacter } from './utils.js';
import { updateSpeechBubble } from './speechBubble.js';
import { initCameraManager, setCameraMode, updateCamera, disposeCameraManager } from './cameramovement.js';

const canvas = document.getElementById('c');
const overlay = document.getElementById('overlay');
const loading = document.getElementById('loading');
const loadingText = loading.querySelector('p');
state.cardEl = document.querySelector('.card');

let config;
let sequenceDisplay;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// ========== AUTO‑WALK SYSTEM ==========
let walkTarget = null;
let walkCancelFlag = false;
const WALK_SPEED = 1.8;

export function setLaylaTarget(targetPos) {
    if (!state.claw) return;
    walkTarget = targetPos.clone();
    walkCancelFlag = false;
    gsap.killTweensOf(state.claw.position);
    gsap.killTweensOf(state.claw.rotation, 'z');
    gsap.killTweensOf(state.claw.position, 'y');
    walkTowardsTarget();
}

export function clearLaylaTarget() {
    walkTarget = null;
    walkCancelFlag = true;
    if (state.claw) {
        gsap.killTweensOf(state.claw.position);
        gsap.killTweensOf(state.claw.rotation, 'z');
        gsap.killTweensOf(state.claw.position, 'y');
        state.claw.rotation.z = 0;
        state.claw.position.y = state.claw.userData.baseY ?? 0;
    }
}

async function walkTowardsTarget() {
    while (walkTarget && state.claw && !walkCancelFlag) {
        if (!state.claw) break;
        const startPos = new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z);
        const targetPos = walkTarget.clone();
        const distance = startPos.distanceTo(targetPos);
        if (distance < 0.3) {
            clearLaylaTarget();
            break;
        }

        const direction = targetPos.clone().sub(startPos).normalize();
        const step = direction.clone().multiplyScalar(Math.min(WALK_SPEED * 0.2, distance));
        const newPos = startPos.clone().add(step);

        if (isBlocked(newPos.x, newPos.z)) {
            const path = aStar(startPos, targetPos);
            if (!path || path.length < 2) {
                clearLaylaTarget();
                break;
            }
            for (let i = 1; i < path.length; i++) {
                if (!walkTarget || walkCancelFlag) break;
                await walkSegment(path[i]);
            }
            if (walkTarget && !walkCancelFlag) {
                const d = targetPos.distanceTo(new THREE.Vector3(state.claw.position.x, 0, state.claw.position.z));
                if (d < 0.3) {
                    clearLaylaTarget();
                    break;
                }
            }
        } else {
            await walkSegment(newPos);
        }
    }
}

function walkSegment(targetPos) {
    return new Promise(resolve => {
        if (!state.claw || walkCancelFlag) { resolve(); return; }
        const dx = targetPos.x - state.claw.position.x;
        const dz = targetPos.z - state.claw.position.z;
        const distance = Math.sqrt(dx*dx + dz*dz);
        if (distance < 0.05) { resolve(); return; }

        const speed = WALK_SPEED;
        const duration = distance / speed;
        const rotY = Math.atan2(dx, dz);
        let rotDiff = rotY - state.claw.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;

        const tl = gsap.timeline({
            onComplete: resolve,
            onInterrupt: resolve,
            onUpdate: () => {
                if (walkCancelFlag || !state.claw) { tl.kill(); resolve(); }
            }
        });

        tl.to(state.claw.rotation, {
            y: state.claw.rotation.y + rotDiff,
            duration: Math.min(0.15, duration * 0.25),
            ease: 'power2.out'
        }, 0);

        const bobAmt = 0.04;
        const bobDur = 0.20;

        tl.to(state.claw.position, {
            x: targetPos.x, z: targetPos.z,
            duration, ease: 'none',
            onStart: () => {
                if (!state.claw) return;
                gsap.killTweensOf(state.claw.rotation, 'z');
                gsap.killTweensOf(state.claw.position, 'y');
                gsap.to(state.claw.rotation, { z: 0.06, duration: bobDur, yoyo: true, repeat: -1, ease: 'sine.inOut' });
                gsap.to(state.claw.position, { y: (state.claw.userData.baseY ?? 0) + bobAmt, duration: bobDur, yoyo: true, repeat: -1, ease: 'sine.inOut' });
            }
        }, 0.05);

        tl.call(() => {
            if (!state.claw) return;
            gsap.killTweensOf(state.claw.rotation, 'z');
            gsap.killTweensOf(state.claw.position, 'y');
            state.claw.rotation.z = 0;
            state.claw.position.y = state.claw.userData.baseY ?? 0;
        });
    });
}

// ========== CANVAS RESIZE ==========
function onResize() {
    const wrap = document.querySelector('.canvas-wrap');
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h);
}

// ========== INIT ==========
function initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a2a');
    scene.fog = new THREE.FogExp2('#0a0a2a', 0.005);
    state.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
    camera.position.set(0, 1.4, 5);
    state.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer = renderer;

    setupEnvironment();
    initCameraManager(camera, canvas, { min: 1, max: 12 });

    let lastTime = performance.now();
    function animate() {
        requestAnimationFrame(animate);
        const now = performance.now();
        const delta = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        if (state.waterMaterial) {
            state.waterMaterial.map.offset.x += delta * 0.02;
        }

        updateEnvironment(delta);
        updateSpeechBubble();
        updateCamera();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', onResize);
    onResize();
}

// ========== LOADING ==========
function makeProgressBar() {
    const bar = document.createElement('div');
    Object.assign(bar.style, {
        position: 'absolute', bottom: '0', left: '0',
        height: '3px', width: '0%',
        background: 'linear-gradient(90deg, #88aaff, #ffcc88)',
        transition: 'width 0.25s ease',
        borderRadius: '0 2px 2px 0',
        pointerEvents: 'none', zIndex: '2'
    });
    loading.appendChild(bar);
    return bar;
}

function makeSecondaryBar() {
    const wrap = document.createElement('div');
    wrap.id = 'familyPreloadBar';
    Object.assign(wrap.style, {
        position: 'absolute', bottom: '3px', left: '0',
        height: '2px', width: '0%',
        background: 'linear-gradient(90deg, #ffaa88, #ff66aa)',
        transition: 'width 0.4s ease',
        borderRadius: '0 2px 2px 0',
        pointerEvents: 'none', zIndex: '2', opacity: '0.7'
    });
    loading.appendChild(wrap);
    return wrap;
}

function loadModel() {
    const bar = makeProgressBar();

    gltfLoader.load(
        config.modelFile || 'models/layla.glb',
        (gltf) => {
            bar.style.width = '100%';
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = (config.modelScaleTarget || 2.4) / maxDim;

            model.scale.setScalar(scale);
            model.position.sub(center.multiplyScalar(scale));
            const box2 = new THREE.Box3().setFromObject(model);
            model.position.y -= box2.min.y;
            model.userData.baseY = model.position.y;

            model.traverse(obj => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                    if (obj.material) {
                        obj.material.roughness = 0.45;
                        obj.material.metalness = 0.1;
                        if (obj.material.map) obj.material.map.colorSpace = THREE.SRGBColorSpace;
                    }
                }
            });

            state.scene.add(model);
            state.claw = model;
            groundCharacter();

            const mid = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
            state.camera.position.set(mid.x, mid.y + 0.5, mid.z + config.cameraDistance);

            loading.classList.add('hidden');

            setTimeout(() => {
                const hBar = makeSecondaryBar();
                preloadFamily(
                    (pct) => { hBar.style.width = `${pct}%`; },
                    () => { hBar.remove(); }
                );
            }, 800);
        },
        (xhr) => {
            if (xhr.lengthComputable) {
                bar.style.width = `${Math.round((xhr.loaded / xhr.total) * 100)}%`;
                loadingText.textContent = `Charging energy crystals… ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
            } else {
                loadingText.textContent = `Charging energy crystals… ${(xhr.loaded / 1_048_576).toFixed(1)} MB`;
            }
        },
        (err) => {
            console.error(err);
            loadingText.textContent = '❌ Layla model missing.';
        }
    );
}

// ========== BUTTON HANDLING ==========
function updateSequenceDisplay() {
    if (sequenceDisplay) sequenceDisplay.textContent = state.currentSequence;
}

function handleAnimBtn(id) {
    if (!state.claw) return;
    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    stopAICleanup();
    stopFamilyChase();
    clearLaylaTarget();

    document.querySelectorAll('.btns button').forEach(b => b.classList.remove('active'));
    state.currentSequence = 0;
    updateSequenceDisplay();

    if (id === 'reset') {
        resetPose(0.25, true);
        return;
    }

    const btn = document.querySelector(`button[data-anim="${id}"]`);
    if (btn) btn.classList.add('active');

    const loop = state.animationLoop.enabled;
    const sequences = state.animationLoop.sequences || 1;

    const resetTL = resetPose(0.15, false);
    resetTL.eventCallback('onComplete', () => {
        switch (id) {
            case 'jump': jumpClaw(loop, sequences); break;
            case 'spin': spinClaw(loop, sequences); break;
            case 'attack': attackClaw(loop, sequences); break;
            case 'ai':
                startFamilyChase(); // calls the new chase, which will use setLaylaTarget
                const aiBtn = document.querySelector('button[data-anim="ai"]');
                if (aiBtn) aiBtn.classList.remove('active');
                break;
        }
    });
}

// ========== UI CREATION ==========
function createLoopUI() { /* ... same as original but with target display removed ... */ }
function createCameraModeButtons() { /* ... same ... */ }
function createDayNightToggle() { /* ... same ... */ }

// ========== MODAL ==========
let ready = false;
function openModal() {
    overlay.classList.add('open');
    if (!ready) {
        ready = true;
        initScene();
        loadModel();
    } else {
        onResize();
    }
}
function closeModal() {
    resetPose(0.25, true);
    stopAICleanup();
    stopFamilyChase();
    clearLaylaTarget();
    overlay.classList.remove('open');
    document.querySelectorAll('.btns button').forEach(b => b.classList.remove('active'));
    state.currentSequence = 0;
    updateSequenceDisplay();
}

// ========== INIT APP ==========
async function initApp() {
    try {
        const resp = await fetch('layla-config.json');
        config = await resp.json();
    } catch (e) {
        config = {
            particleBackground: ['⚡', '🔋', '✨'],
            particleCount: 24,
            animations: [
                { id: 'jump', label: '⚡ Energy Leap' },
                { id: 'spin', label: '🌀 Cannon Twirl' },
                { id: 'attack', label: '💥 Blast!' },
                { id: 'ai', label: '🤖 Family Chase' },
                { id: 'reset', label: '↩ Calm Reset' }
            ],
            modelFile: 'models/layla.glb',
            modelScaleTarget: 2.2,
            cameraFov: 38,
            cameraDistance: 5,
            orbitLimits: { min: 1, max: 12 },
            shadowMapSize: 2048,
            toneMappingExposure: 1.0
        };
    }

    const btnsCont = document.querySelector('.btns');
    btnsCont.innerHTML = '';
    config.animations.forEach(a => {
        const btn = document.createElement('button');
        btn.dataset.anim = a.id;
        btn.textContent = a.label;
        btn.addEventListener('click', () => handleAnimBtn(a.id));
        btnsCont.appendChild(btn);
    });
    createLoopUI();
    createCameraModeButtons();
    createDayNightToggle();
    document.getElementById('openBtn').addEventListener('click', openModal);
    document.getElementById('closeBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
}
initApp();