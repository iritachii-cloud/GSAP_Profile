import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';

import { state }          from './state.js';
import { danceKitty, clearDanceClones } from './dance.js';
import { jumpKitty }      from './jump.js';
import { spinKitty }      from './spin.js';
import { attackKitty }    from './attack.js';
import { resetPose }      from './reset.js';
import { createHeartMesh } from './utils.js';

// ── DOM refs ───────────────────────────────────────────────────────
const canvas   = document.getElementById('c');
const overlay  = document.getElementById('overlay');
const loading  = document.getElementById('loading');
state.cardEl   = document.querySelector('.card');

let config;
let sequenceDisplay;   // <span> to show current sequence

// ── 3D background (pastel sky + floating hearts) ───────────────────
function createBackground() {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 512;
    bgCanvas.height = 512;
    const ctx = bgCanvas.getContext('2d');

    const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 400);
    grad.addColorStop(0, '#ffe4ef');
    grad.addColorStop(0.5, '#fff0f6');
    grad.addColorStop(1, '#fffaf0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(bgCanvas);
    texture.needsUpdate = true;

    const geo = new THREE.SphereGeometry(30, 64, 64);
    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        depthWrite: false
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.name = 'skySphere';
    state.skySphere = sky;
    state.scene.add(sky);

    const bgHearts = new THREE.Group();
    bgHearts.name = 'bgHearts';
    state.scene.add(bgHearts);

    for (let i = 0; i < 18; i++) {
        const heart = createHeartMesh();
        const angle = Math.random() * Math.PI * 2;
        const radius = 4 + Math.random() * 6;
        const height = -0.5 + Math.random() * 2.5;

        heart.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );
        heart.scale.setScalar(0.15 + Math.random() * 0.3);
        bgHearts.add(heart);

        const startTime = Math.random() * 10;
        gsap.to(heart.position, {
            y: `+=${0.4 + Math.random() * 0.8}`,
            duration: 3 + Math.random() * 4,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            delay: startTime
        });
        gsap.to(heart.material, {
            opacity: 0.35 + Math.random() * 0.25,
            duration: 1.5 + Math.random() * 2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: startTime
        });
    }
}

// ── Three.js scene setup ──────────────────────────────────────────
function initScene() {
    const scene = new THREE.Scene();
    state.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 200);
    camera.position.set(0, 1.5, 5);
    state.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = config.toneMappingExposure ?? 1.25;
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    state.renderer = renderer;

    const ambient = new THREE.AmbientLight(0xfff4fa, 1.4);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffeef8, 3.0);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(config.shadowMapSize || 2048, config.shadowMapSize || 2048);
    key.shadow.bias = -0.001;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffd6ec, 1.1);
    fill.position.set(-4, 3, 2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xbbccff, 0.7);
    rim.position.set(0, 2, -4);
    scene.add(rim);

    const hemi = new THREE.HemisphereLight(0xffd6ec, 0xffffff, 0.8);
    scene.add(hemi);

    state.lights = { ambient, key, fill, rim, hemi };

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.ShadowMaterial({ opacity: 0.13 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    createBackground();

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.07;
    controls.autoRotate     = false;
    controls.enablePan      = false;
    controls.minDistance    = config.orbitLimits?.min ?? 1;
    controls.maxDistance    = config.orbitLimits?.max ?? 12;
    state.controls = controls;

    (function loop() {
        requestAnimationFrame(loop);
        if (state.kitty && !state.currentAnim) {
            state.kitty.position.y = (state.kitty.userData.baseY ?? 0) + Math.sin(performance.now() * 0.0014) * 0.05;
        }
        if (state.cloneGroup) {
            state.cloneGroup.position.copy(state.kitty.position);
        }
        controls.update();
        renderer.render(scene, camera);
    })();

    window.addEventListener('resize', onResize);
    onResize();
}

function loadModel() {
    new GLTFLoader().load(
        config.modelFile || 'hello_kitty.glb',
        (gltf) => {
            const kitty = gltf.scene;
            const box = new THREE.Box3().setFromObject(kitty);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = (config.modelScaleTarget || 2.4) / maxDim;

            kitty.scale.setScalar(scale);
            kitty.position.sub(center.multiplyScalar(scale));

            const box2 = new THREE.Box3().setFromObject(kitty);
            kitty.position.y -= box2.min.y;
            kitty.userData.baseY = kitty.position.y;

            kitty.traverse(obj => {
                if (obj.isMesh) obj.castShadow = obj.receiveShadow = true;
            });
            state.scene.add(kitty);
            state.kitty = kitty;

            const mid = new THREE.Box3().setFromObject(kitty).getCenter(new THREE.Vector3());
            state.controls.target.copy(mid);
            state.camera.position.set(mid.x, mid.y + 0.4, mid.z + 4.5);
            state.controls.update();

            loading.classList.add('hidden');
        },
        xhr => {
            if (xhr.total) {
                loading.querySelector('p').textContent = `Loading… ${Math.round(xhr.loaded / xhr.total * 100)}%`;
            }
        },
        err => {
            console.error(err);
            loading.querySelector('p').textContent = '⚠️ Could not load model. Ensure ' + (config.modelFile || 'hello_kitty.glb') + ' is in the same folder.';
        }
    );
}

function onResize() {
    const wrap = document.querySelector('.canvas-wrap');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h);
}

// ── Helper to update the sequence display ─────────────────────────
function updateSequenceDisplay() {
    if (sequenceDisplay) {
        sequenceDisplay.textContent = state.currentSequence;
    }
}

// ── Button handling & UI ──────────────────────────────────────────
function handleAnimBtn(id) {
    if (!state.kitty) return;

    if (handleAnimBtn._stopTimer) {
        clearTimeout(handleAnimBtn._stopTimer);
        handleAnimBtn._stopTimer = null;
    }

    resetPose(0.18, id === 'reset');
    document.querySelectorAll('.btns button').forEach(b => b.classList.remove('active'));
    if (id === 'reset') {
        state.currentSequence = 0;
        updateSequenceDisplay();
        return;
    }

    const btn = document.querySelector(`button[data-anim="${id}"]`);
    if (btn) btn.classList.add('active');

    state.currentSequence = 0;   // reset for new animation
    updateSequenceDisplay();

    const loop = state.animationLoop.enabled;
    const sequences = state.animationLoop.sequences || 1;

    setTimeout(() => {
        switch (id) {
            case 'dance':  danceKitty(loop, sequences); break;
            case 'jump':   jumpKitty(loop, sequences); break;
            case 'spin':   spinKitty(loop, sequences); break;
            case 'attack': attackKitty(loop, sequences); break;
        }
    }, 200);
}

function createLoopUI() {
    const div = document.createElement('div');
    div.id = 'loopControls';
    div.style.cssText = 'margin-top:0.5rem;display:flex;justify-content:center;gap:1rem;align-items:center;flex-wrap:wrap;';

    div.innerHTML = `
        <label style="font-size:0.78rem;color:#ff69b4;cursor:pointer;">
            <input type="checkbox" id="loopCheck" style="vertical-align:middle;"> Loop ∞
        </label>
        <label style="font-size:0.78rem;color:#ff69b4;">
            Sequences <input type="number" id="sequencesInput" value="1" min="1" max="20" step="1"
            style="width:48px;border-radius:6px;border:1px solid #ffb6c1;padding:2px 4px;font-family:inherit;text-align:center;">
        </label>
        <span style="font-size:0.78rem;color:#ff69b4;">
            Now: <span id="seqDisplay" style="font-weight:bold;">0</span>
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

// ── Modal open / close ────────────────────────────────────────────
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
    resetPose(0.2, false);
    overlay.classList.remove('open');
    document.querySelectorAll('.btns button').forEach(b => b.classList.remove('active'));
    state.currentSequence = 0;
    updateSequenceDisplay();
}

// ── Bootstrap ──────────────────────────────────────────────────────
async function initApp() {
    try {
        const resp = await fetch('hk-config.json');
        config = await resp.json();
    } catch (e) {
        config = {
            emojiBackground: ['🎀'],
            emojiCount: 10,
            animations: [
                { id:'dance', label:'💃 Dance' },
                { id:'jump',  label:'🦘 Jump' },
                { id:'spin',  label:'🌀 Spin' },
                { id:'attack',label:'💖 Heart Attack' },
                { id:'reset', label:'↩ Reset' }
            ],
            modelFile: 'hello_kitty.glb',
            modelScaleTarget: 2.4,
            cameraFov: 38,
            cameraDistance: 5,
            orbitLimits: { min:1, max:12 },
            shadowMapSize: 2048,
            toneMappingExposure: 1.25
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

    document.getElementById('openBtn').addEventListener('click', openModal);
    document.getElementById('closeBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
}

initApp();