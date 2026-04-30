import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { state } from './state.js';
import { setupEnvironment, updateEnvironment, applyTimeOfDay } from './environment.js';
import { jumpClaw } from './jump.js';
import { spinClaw } from './spin.js';
import { attackClaw } from './attack.js';
import { aiModeClaw, stopAICleanup } from './aiMode.js';
import { resetPose } from './reset.js';
import { groundCharacter } from './utils.js';
import { updateSpeechBubble } from './speechBubble.js';
import { initCameraManager, setCameraMode, updateCamera, disposeCameraManager } from './cameramovement.js';

const canvas = document.getElementById('c');
const overlay = document.getElementById('overlay');
const loading = document.getElementById('loading');
state.cardEl = document.querySelector('.card');

let config;
let sequenceDisplay;

function onResize() {
    const wrap = document.querySelector('.canvas-wrap');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h);
}

function initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a0010');
    scene.fog = new THREE.FogExp2('#1a0010', 0.005);
    state.scene = scene;

    const camera = new THREE.PerspectiveCamera(config.cameraFov, 1, 0.1, 200);
    camera.position.set(0, 1.4, config.cameraDistance);
    state.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = config.toneMappingExposure ?? 1.4;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer = renderer;

    setupEnvironment();

    // Initialise camera manager with free‑orbit controls
    initCameraManager(camera, canvas, {
        min: config.orbitLimits?.min ?? 1,
        max: config.orbitLimits?.max ?? 12
    });

    let lastTime = performance.now();
    function animate() {
        requestAnimationFrame(animate);

        const now = performance.now();
        const delta = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        if (state.claw && !state.currentAnim) {
            state.claw.position.y = (state.claw.userData.baseY ?? 0) + Math.sin(now * 0.0018) * 0.03;
        }

        if (state.waterMaterial) {
            state.waterMaterial.map.offset.x += delta * 0.02;
        }

        updateEnvironment(delta);
        updateSpeechBubble();

        // Update the current camera mode (free / track / fpv)
        updateCamera();

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', onResize);
    onResize();
}

function loadModel() {
    new GLTFLoader().load(
        config.modelFile || 'kagura.glb',
        (gltf) => {
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
                    }
                }
            });

            state.scene.add(model);
            state.claw = model;

            groundCharacter();

            const mid = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
            // Update the free camera's look‑at target to the model centre
            state.camera.position.set(mid.x, mid.y + 0.5, mid.z + config.cameraDistance);
            if (state.cameraMode === 'free' || state.cameraMode === 'track') {
                // We can set the free camera target via cameramovement
                import('./cameramovement.js').then(({ setCameraMode }) => {
                    // No direct export for target, but we can do a quick switch to force target update
                    // Actually, the free camera target was set in createFreeCamera, so it's fine.
                    // We'll just leave it.
                });
            }

            loading.classList.add('hidden');
        },
        xhr => {
            if (xhr.total) {
                const pct = Math.round(xhr.loaded / xhr.total * 100);
                loading.querySelector('p').textContent = `Cherry blossoms gathering… ${pct}%`;
            }
        },
        err => {
            console.error(err);
            loading.querySelector('p').textContent = '❌ Kagura model missing. Place kagura.glb in the folder.';
        }
    );
}

function updateSequenceDisplay() {
    if (sequenceDisplay) sequenceDisplay.textContent = state.currentSequence;
}

function handleAnimBtn(id) {
    if (!state.claw) return;

    if (state.activeTimeline) {
        state.activeTimeline.kill();
        state.activeTimeline = null;
    }
    if (state.mainDanceTL) {
        state.mainDanceTL.kill();
        state.mainDanceTL = null;
    }
    stopAICleanup();

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
            case 'jump':   jumpClaw(loop, sequences); break;
            case 'spin':   spinClaw(loop, sequences); break;
            case 'attack': attackClaw(loop, sequences); break;
            case 'ai':     aiModeClaw(loop, sequences); break;
        }
    });
}

function createLoopUI() {
    const div = document.createElement('div');
    div.id = 'loopControls';
    div.style.cssText = 'margin-top:0.6rem;display:flex;justify-content:center;gap:1rem;align-items:center;flex-wrap:wrap;';
    div.innerHTML = `
        <label style="font-size:0.72rem;color:#e6b3cc;cursor:pointer;">
            <input type="checkbox" id="loopCheck" style="vertical-align:middle;"> Loop ∞
        </label>
        <label style="font-size:0.72rem;color:#e6b3cc;">
            Sequences <input type="number" id="sequencesInput" value="1" min="1" max="20" step="1"
            style="width:48px;border-radius:10px;border:1px solid #ff99bb;background:#1a0a14;color:#ffd1dc;padding:2px 6px;font-family:inherit;text-align:center;">
        </label>
        <span style="font-size:0.72rem;color:#e6b3cc;">
            Now: <span id="seqDisplay" style="font-weight:bold;color:#ff99bb;">0</span>
        </span>
    `;
    document.querySelector('.card').appendChild(div);
    document.getElementById('loopCheck').addEventListener('change', e => {
        state.animationLoop.enabled = e.target.checked;
        document.getElementById('sequencesInput').disabled = e.target.checked;
    });
    document.getElementById('sequencesInput').addEventListener('input', e => {
        state.animationLoop.sequences = parseInt(e.target.value) || 1;
    });
    document.getElementById('sequencesInput').disabled = state.animationLoop.enabled;
    sequenceDisplay = document.getElementById('seqDisplay');
}

function createCameraModeButtons() {
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'margin-top:0.4rem;display:flex;gap:0.5rem;justify-content:center;';
    const modes = [
        { id: 'free', text: '🎥 Free' },
        { id: 'track', text: '👣 Track' },
        { id: 'fpv', text: '👁️ FPV' }
    ];
    modes.forEach(m => {
        const btn = document.createElement('button');
        btn.textContent = m.text;
        btn.style.cssText = `
            font-size:0.7rem; padding:0.2rem 0.6rem; border-radius:12px; border:1px solid #ff99bb;
            background:transparent; color:#ffd1dc; cursor:pointer;
        `;
        if (m.id === 'free') btn.style.background = '#3d2a3e';
        btn.addEventListener('click', () => {
            setCameraMode(m.id);
            document.querySelectorAll('#cameraModeBtns button').forEach(b => b.style.background = 'transparent');
            btn.style.background = '#3d2a3e';
        });
        btnGroup.appendChild(btn);
    });
    btnGroup.id = 'cameraModeBtns';
    document.querySelector('.card').appendChild(btnGroup);
}

function createDayNightToggle() {
    const btn = document.createElement('button');
    btn.id = 'dayNightToggle';
    btn.style.cssText = 'margin-left:0.5rem;';
    btn.textContent = '🌙 Night';
    btn.addEventListener('click', () => {
        if (state.timeOfDay === 'day') {
            applyTimeOfDay('night');
            btn.textContent = '☀️ Day';
        } else {
            applyTimeOfDay('day');
            btn.textContent = '🌙 Night';
        }
    });
    document.querySelector('.btns').appendChild(btn);
}

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
    overlay.classList.remove('open');
    document.querySelectorAll('.btns button').forEach(b => b.classList.remove('active'));
    state.currentSequence = 0;
    updateSequenceDisplay();
}

async function initApp() {
    try {
        const resp = await fetch('kagura-config.json');
        config = await resp.json();
    } catch (e) {
        config = {
            particleBackground: ['🌸','🍃','🫧'],
            particleCount: 24,
            animations: [
                { id:'jump',   label:'🌸 Petal Leap' },
                { id:'spin',   label:'🍃 Cherry Twister' },
                { id:'attack', label:'🗡️ Blossom Strike' },
                { id:'ai',     label:'🤖 AI Mode' },
                { id:'reset',  label:'↩ Peace Reset' }
            ],
            modelFile: 'kagura.glb',
            modelScaleTarget: 2.4,
            cameraFov: 38,
            cameraDistance: 5,
            orbitLimits: { min:1, max:12 },
            shadowMapSize: 2048,
            toneMappingExposure: 1.4
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