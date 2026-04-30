import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { state } from './state.js';
import { danceFanny, clearDanceFanny } from './fanny-dance.js';
import { jumpFanny } from './fanny-jump.js';
import { spinFanny } from './fanny-spin.js';
import { attackFanny } from './fanny-attack.js';
import { resetPose } from './reset.js';
import { createSlashMesh, createSparkMesh } from './fanny-utils.js';

// ── DOM references ─────────────────────────────────────────────────
const canvas = document.getElementById('fannyCanvas');
const overlay = document.getElementById('fannyModal');
const loading = document.getElementById('fannyLoading');
state.cardEl = document.querySelector('.card');

let config;
let sequenceDisplay;

// ── Land of Dawn background ────────────────────────────────────────
function createBackground() {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1024;
    bgCanvas.height = 1024;
    const ctx = bgCanvas.getContext('2d');

    // Deep mystical sky gradient — purple/magenta/dark blue
    const grad = ctx.createRadialGradient(512, 300, 40, 512, 512, 900);
    grad.addColorStop(0, '#2a0a4a');   // deep violet centre
    grad.addColorStop(0.3, '#1a0535');   // dark purple mid
    grad.addColorStop(0.65, '#0e0228');   // near-black blue
    grad.addColorStop(1, '#030010');   // absolute dark edge
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Ethereal glow streaks — mist of dawn
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * 1024;
        const y = 100 + Math.random() * 500;
        const r = 60 + Math.random() * 180;
        const streakGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
        const hue = 260 + Math.random() * 80; // purple to magenta
        streakGrad.addColorStop(0, `hsla(${hue},90%,60%,0.18)`);
        streakGrad.addColorStop(0.5, `hsla(${hue},80%,40%,0.07)`);
        streakGrad.addColorStop(1, `hsla(${hue},70%,20%,0)`);
        ctx.fillStyle = streakGrad;
        ctx.fillRect(0, 0, 1024, 1024);
    }

    // Distant "dawn" horizon shimmer
    const horizonGrad = ctx.createLinearGradient(0, 700, 0, 1024);
    horizonGrad.addColorStop(0, 'rgba(160,60,255,0.12)');
    horizonGrad.addColorStop(0.4, 'rgba(80,20,180,0.08)');
    horizonGrad.addColorStop(1, 'rgba(10,0,40,0.0)');
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    const texture = new THREE.CanvasTexture(bgCanvas);

    const geo = new THREE.SphereGeometry(30, 64, 64);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthWrite: false });
    const sky = new THREE.Mesh(geo, mat);
    sky.name = 'skySphere';
    state.skySphere = sky;
    state.scene.add(sky);

    // ── Land of Dawn floor: ancient stone/rune pattern ──
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512; floorCanvas.height = 512;
    const fc = floorCanvas.getContext('2d');

    // Dark stone base
    fc.fillStyle = '#0d0820';
    fc.fillRect(0, 0, 512, 512);

    // Glowing rune circle
    fc.save();
    fc.translate(256, 256);
    fc.strokeStyle = 'rgba(160,60,255,0.55)';
    fc.lineWidth = 3;
    fc.shadowColor = '#a020ff';
    fc.shadowBlur = 18;
    fc.beginPath(); fc.arc(0, 0, 200, 0, Math.PI * 2); fc.stroke();
    fc.beginPath(); fc.arc(0, 0, 140, 0, Math.PI * 2); fc.stroke();
    fc.beginPath(); fc.arc(0, 0, 80, 0, Math.PI * 2); fc.stroke();

    // Rune lines radiating outward
    fc.strokeStyle = 'rgba(130,40,220,0.45)';
    fc.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        fc.beginPath();
        fc.moveTo(Math.cos(ang) * 80, Math.sin(ang) * 80);
        fc.lineTo(Math.cos(ang) * 200, Math.sin(ang) * 200);
        fc.stroke();
    }

    // Inner star
    fc.strokeStyle = 'rgba(200,100,255,0.5)';
    fc.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const ang2 = ((i + 3) / 6) * Math.PI * 2;
        fc.beginPath();
        fc.moveTo(Math.cos(ang) * 140, Math.sin(ang) * 140);
        fc.lineTo(Math.cos(ang2) * 140, Math.sin(ang2) * 140);
        fc.stroke();
    }

    // Grid lines
    fc.strokeStyle = 'rgba(80,20,140,0.25)';
    fc.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
        fc.beginPath(); fc.moveTo(i, 0); fc.lineTo(i, 512); fc.stroke();
        fc.beginPath(); fc.moveTo(0, i); fc.lineTo(512, i); fc.stroke();
    }
    fc.restore();

    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(2, 2);

    // Replace plain shadow floor with textured one
    const oldFloor = state.scene.getObjectByName('shadowFloor');
    if (oldFloor) state.scene.remove(oldFloor);

    const stoneMat = new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.85,
        metalness: 0.05,
        emissive: new THREE.Color(0x2a0050),
        emissiveIntensity: 0.3
    });
    const stoneFloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), stoneMat);
    stoneFloor.rotation.x = -Math.PI / 2;
    stoneFloor.position.y = -0.02;   // ← pushed below Fanny's feet
    stoneFloor.receiveShadow = true;
    stoneFloor.name = 'stoneFloor';
    state.scene.add(stoneFloor);

    // Floating mystical sparks — LOD amber/purple tones instead of cyan
    const particleGroup = new THREE.Group();
    particleGroup.name = 'bgParticles';
    state.scene.add(particleGroup);

    for (let i = 0; i < 28; i++) {
        const spark = createSparkMesh(true); // true = LOD color
        const angle = Math.random() * Math.PI * 2;
        const radius = 2.5 + Math.random() * 7;
        const height = 0.1 + Math.random() * 3.5;
        spark.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        spark.scale.setScalar(0.10 + Math.random() * 0.18);
        particleGroup.add(spark);

        gsap.to(spark.position, {
            y: `+=${0.4 + Math.random() * 0.9}`,
            duration: 3 + Math.random() * 5,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: Math.random() * 10
        });
        gsap.to(spark.material, {
            opacity: 0.35 + Math.random() * 0.45,
            duration: 1.5 + Math.random() * 3,
            repeat: -1,
            yoyo: true,
            delay: Math.random() * 8
        });
    }
}

// ── Three.js scene setup ─────────────────────────────────────────
function initScene() {
    const scene = new THREE.Scene();
    // Subtle purple-tinted fog for depth
    scene.fog = new THREE.FogExp2(0x0d0020, 0.045);
    state.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 200);
    camera.position.set(0, 1.6, 5.2);
    state.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = config.toneMappingExposure ?? 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer = renderer;

    // LOD-style lighting: purple/magenta key, cool rim
    const ambient = new THREE.AmbientLight(0x1a0535, 1.4);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xd0a0ff, 2.6);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(config.shadowMapSize || 2048, config.shadowMapSize || 2048);
    key.shadow.bias = -0.0005;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x6020cc, 1.1);
    fill.position.set(-3, 2, 2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xcc44ff, 0.9);
    rim.position.set(0, 2, -4);
    scene.add(rim);

    const hemi = new THREE.HemisphereLight(0x5010a0, 0x0a0318, 0.8);
    scene.add(hemi);

    state.lights = { ambient, key, fill, rim, hemi };

    // Shadow-receiving floor (will be replaced by textured in createBackground)
    const shadowFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 18),
        new THREE.ShadowMaterial({ opacity: 0.25, color: 0x6600aa, transparent: true })
    );
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = -0.02;   // ← match stone floor depth
    shadowFloor.receiveShadow = true;
    shadowFloor.name = 'shadowFloor';
    scene.add(shadowFloor);

    createBackground();

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.autoRotate = false;
    controls.enablePan = false;
    controls.minDistance = config.orbitLimits?.min ?? 1.5;
    controls.maxDistance = config.orbitLimits?.max ?? 12;
    state.controls = controls;

    function animate() {
        requestAnimationFrame(animate);
        if (state.kitty && !state.currentAnim) {
            state.kitty.position.y = (state.kitty.userData.baseY ?? 0) + Math.sin(performance.now() * 0.0015) * 0.04;
        }
        if (state.cloneGroup) {
            state.cloneGroup.position.copy(state.kitty.position);
        }
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', onResize);
    onResize();
}

function loadModel() {
    new GLTFLoader().load(
        config.modelFile,
        (gltf) => {
            const fanny = gltf.scene;
            const box = new THREE.Box3().setFromObject(fanny);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = (config.modelScaleTarget || 2.4) / maxDim;
            fanny.scale.setScalar(scale);
            fanny.position.sub(center.multiplyScalar(scale));

            // ── FIX: Snap model to floor — baseY is always 0 ──
            const box2 = new THREE.Box3().setFromObject(fanny);
            fanny.position.y -= box2.min.y;
            fanny.position.y += 0.02;         // ← tiny lift above floor surface
            fanny.userData.baseY = fanny.position.y;   // ← baseY follows the lift     // anchor is always 0, not floating

            fanny.traverse(obj => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });
            state.scene.add(fanny);
            state.kitty = fanny;

            const mid = new THREE.Box3().setFromObject(fanny).getCenter(new THREE.Vector3());
            state.controls.target.copy(mid);
            state.camera.position.set(mid.x, mid.y + 0.45, mid.z + 4.8);
            state.controls.update();

            if (loading) loading.classList.add('hidden');
        },
        (xhr) => {
            if (loading && xhr.total) {
                const percent = Math.round(xhr.loaded / xhr.total * 100);
                const p = loading.querySelector('p');
                if (p) p.textContent = `Loading Fanny… ${percent}%`;
            }
        },
        (err) => {
            console.error(err);
            if (loading) {
                const p = loading.querySelector('p');
                if (p) p.textContent = '⚠️ Failed to load fanny.glb. Check file path.';
            }
        }
    );
}

function onResize() {
    const wrap = document.querySelector('.canvas-wrap');
    if (!wrap) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(w, h);
}

function updateSequenceDisplay() {
    if (sequenceDisplay) sequenceDisplay.textContent = state.currentSequence;
}

function handleAnimBtn(id) {
    if (!state.kitty) return;
    if (handleAnimBtn._stopTimer) clearTimeout(handleAnimBtn._stopTimer);

    resetPose(0.18, id === 'reset');
    document.querySelectorAll('.btns button').forEach(btn => btn.classList.remove('active'));

    if (id === 'reset') {
        state.currentSequence = 0;
        updateSequenceDisplay();
        return;
    }

    const btn = document.querySelector(`button[data-anim="${id}"]`);
    if (btn) btn.classList.add('active');

    state.currentSequence = 0;
    updateSequenceDisplay();

    const loop = state.animationLoop.enabled;
    const sequences = state.animationLoop.sequences || 1;

    setTimeout(() => {
        switch (id) {
            case 'dance': danceFanny(loop, sequences); break;
            case 'jump': jumpFanny(loop, sequences); break;
            case 'spin': spinFanny(loop, sequences); break;
            case 'attack': attackFanny(loop, sequences); break;
        }
    }, 200);
}

function createLoopUI() {
    const div = document.createElement('div');
    div.id = 'loopControls';
    div.style.cssText = 'margin-top:0.6rem;display:flex;justify-content:center;gap:1rem;align-items:center;flex-wrap:wrap;';
    div.innerHTML = `
        <label style="font-size:0.75rem;color:#8aa8c8;cursor:pointer;">
            <input type="checkbox" id="loopCheck" style="vertical-align:middle;"> Loop ∞
        </label>
        <label style="font-size:0.75rem;color:#8aa8c8;">
            Sequences <input type="number" id="sequencesInput" value="1" min="1" max="20" step="1"
            style="width:48px;border-radius:4px;border:1px solid #2a4a80;background:#0a1428;color:#0af;padding:2px 4px;">
        </label>
        <span style="font-size:0.75rem;color:#8aa8c8;">
            Now: <span id="seqDisplay" style="font-weight:bold;color:#0af;">0</span>
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
    document.querySelectorAll('.btns button').forEach(btn => btn.classList.remove('active'));
    state.currentSequence = 0;
    updateSequenceDisplay();
}

// ── Bootstrap ─────────────────────────────────────────────────────
async function initApp() {
    try {
        const resp = await fetch('fanny-config.json');
        config = await resp.json();
    } catch (e) {
        console.warn('Using fallback config');
        config = {
            animations: [
                { id: 'dance', label: '🌀 Aerial Dance' },
                { id: 'jump', label: '⚡ Cable Dash' },
                { id: 'spin', label: '🗡️ Pinate Spin' },
                { id: 'attack', label: '⚔️ Cut Throat' },
                { id: 'reset', label: '↩ Reset' }
            ],
            modelFile: 'fanny.glb',
            modelScaleTarget: 2.4,
            cameraFov: 38,
            cameraDistance: 5,
            orbitLimits: { min: 1, max: 12 },
            shadowMapSize: 2048,
            toneMappingExposure: 1.15
        };
    }

    const btnsContainer = document.querySelector('.btns');
    if (btnsContainer) {
        btnsContainer.innerHTML = '';
        config.animations.forEach(anim => {
            const btn = document.createElement('button');
            btn.dataset.anim = anim.id;
            btn.textContent = anim.label;
            btn.addEventListener('click', () => handleAnimBtn(anim.id));
            btnsContainer.appendChild(btn);
        });
    }

    createLoopUI();

    const openBtn = document.getElementById('openFannyBtn');
    const closeBtn = document.getElementById('closeFannyBtn');
    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
}

initApp();