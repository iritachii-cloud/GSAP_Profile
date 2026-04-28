import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';

import { state }          from './state.js';
import { danceClaw, clearDanceClones } from './dance.js';
import { jumpClaw }      from './jump.js';
import { spinClaw }      from './spin.js';
import { clawAttack }    from './claw.js';
import { resetPose }      from './reset.js';
import { createDarkEnergyMesh, spawnFloatingDarkParticles } from './utils.js';

// DOM refs
const canvas   = document.getElementById('c');
const overlay  = document.getElementById('overlay');
const loading  = document.getElementById('loading');
state.cardEl   = document.querySelector('.card');

let config;
let sequenceDisplay;

// Spawn a single jagged lightning bolt line in the scene
function spawnLightningArc(scene) {
    const x      = (Math.random() - 0.5) * 16;
    const z      = -3 + (Math.random() - 0.5) * 10;
    const topY   = 2.5 + Math.random() * 4.5;
    const botY   = -0.3 + Math.random() * 1.2;
    const segs   = 5 + Math.floor(Math.random() * 7);

    // Build jagged points from top down
    const points = [];
    let cx = x;
    points.push(new THREE.Vector3(cx, topY, z));
    for (let i = 1; i < segs; i++) {
        const t = i / segs;
        cx += (Math.random() - 0.5) * 1.1;
        const cy = topY - (topY - botY) * t + (Math.random() - 0.5) * 0.25;
        points.push(new THREE.Vector3(cx, cy, z + (Math.random() - 0.5) * 0.15));
    }
    points.push(new THREE.Vector3(cx + (Math.random() - 0.5) * 0.3, botY, z));

    const geo    = new THREE.BufferGeometry().setFromPoints(points);
    const mat    = new THREE.LineBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending });
    const bolt   = new THREE.Line(geo, mat);
    scene.add(bolt);

    // Soft glow halo (slightly wider colour)
    const glowMat = new THREE.LineBasicMaterial({ color: 0xaaffc8, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending });
    const glow    = new THREE.Line(geo, glowMat);
    scene.add(glow);

    // Fade out quickly – lightning is brief
    const dur = 0.08 + Math.random() * 0.22;
    gsap.to([mat, glowMat], {
        opacity: 0,
        duration: dur,
        ease: 'power2.in',
        onComplete: () => {
            scene.remove(bolt);
            scene.remove(glow);
            geo.dispose();
            mat.dispose();
            glowMat.dispose();
        }
    });

    // Branch lightning ~55% of the time
    if (Math.random() > 0.45 && points.length > 2) {
        const branchFrom = points[1 + Math.floor(Math.random() * (points.length - 2))].clone();
        const bpts = [branchFrom];
        let bx = branchFrom.x, by = branchFrom.y;
        const bSegs = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < bSegs; i++) {
            bx += (Math.random() - 0.5) * 0.9;
            by -= 0.25 + Math.random() * 0.35;
            bpts.push(new THREE.Vector3(bx, by, branchFrom.z + (Math.random() - 0.5) * 0.2));
        }
        const bGeo = new THREE.BufferGeometry().setFromPoints(bpts);
        const bMat = new THREE.LineBasicMaterial({ color: 0x88ffbb, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending });
        const branch = new THREE.Line(bGeo, bMat);
        scene.add(branch);
        gsap.to(bMat, {
            opacity: 0, duration: dur * 0.8, ease: 'power2.in',
            onComplete: () => { scene.remove(branch); bGeo.dispose(); bMat.dispose(); }
        });
    }

    // Tiny ground-impact glow at bolt base
    const impactGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 6, 6);
    const impactMat = new THREE.MeshBasicMaterial({ color: 0x88ffaa, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
    const impact    = new THREE.Mesh(impactGeo, impactMat);
    impact.position.set(cx, botY, z);
    scene.add(impact);
    gsap.to(impact.scale, { x: 3, y: 0.4, z: 3, duration: 0.25, ease: 'power2.out' });
    gsap.to(impactMat,    { opacity: 0, duration: 0.28, ease: 'power2.in',
        onComplete: () => { scene.remove(impact); impactGeo.dispose(); impactMat.dispose(); }
    });
}

// Continuously schedule background lightning arcs
function startBackgroundLightning(scene) {
    function fire() {
        if (!scene) return;
        // Burst of 1-3 near-simultaneous bolts (like a real lightning strike)
        const count = Math.random() > 0.65 ? 1 + Math.floor(Math.random() * 2) : 1;
        for (let i = 0; i < count; i++) {
            setTimeout(() => spawnLightningArc(scene), i * (30 + Math.random() * 80));
        }
        // Next strike in 0.6 – 3.5 s
        setTimeout(fire, 600 + Math.random() * 2900);
    }
    fire();
}

// Dark sky + lightning background
function createDarkBackground() {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 512;
    bgCanvas.height = 512;
    const ctx = bgCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#060310');
    grad.addColorStop(0.5, '#0e0620');
    grad.addColorStop(1, '#020004');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    // Very faint star-like dots
    for (let i = 0; i < 900; i++) {
        const alpha = Math.random() * 0.07;
        ctx.fillStyle = `rgba(100, 255, 140, ${alpha})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }
    const texture = new THREE.CanvasTexture(bgCanvas);
    texture.needsUpdate = true;

    const geo = new THREE.SphereGeometry(35, 64, 64);
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthWrite: false });
    const sky = new THREE.Mesh(geo, mat);
    sky.name = 'darkSkySphere';
    state.skySphere = sky;
    state.scene.add(sky);

    // Start the lightning arc system
    startBackgroundLightning(state.scene);
}

// Realistic ground: dark cobblestone/gravel texture
function createRealisticGround() {
    const width = 12;
    const depth = 12;
    
    // Create a canvas for procedural ground texture
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Base dark grey
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add noise and cracks
    for (let i = 0; i < 15000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const brightness = 30 + Math.random() * 60;
        ctx.fillStyle = `rgb(${brightness}, ${brightness * 0.6}, ${brightness * 0.4})`;
        ctx.fillRect(x, y, 2, 2);
    }
    
    // Draw random cracks
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 3;
    for (let i = 0; i < 400; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
    }
    
    // Greenish dark spots (moss/glow)
    for (let i = 0; i < 800; i++) {
        ctx.fillStyle = `rgba(60, 120, 60, ${Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 4 + 1, 0, Math.PI*2);
        ctx.fill();
    }
    
    const groundTexture = new THREE.CanvasTexture(canvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(3, 3);
    
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: groundTexture,
        roughness: 0.85,
        metalness: 0.1,
        color: 0x888888,
        emissive: 0x112211,
        emissiveIntensity: 0.12
    });
    
    const groundPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(width, depth),
        groundMaterial
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.05; // slightly below character feet to avoid z-fighting
    groundPlane.receiveShadow = true;
    state.scene.add(groundPlane);
    
    // Optional: add a subtle rim light on ground edges
    const edgeGlow = new THREE.PointLight(0x44aa44, 0.4, 8);
    edgeGlow.position.set(0, 0.5, 0);
    state.scene.add(edgeGlow);
    state.tempGroups.push(edgeGlow);
    
    return groundPlane;
}

function initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020005);
    scene.fog = new THREE.FogExp2(0x020005, 0.025);
    state.scene = scene;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.position.set(0, 1.4, 5.2);
    state.camera = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = config.toneMappingExposure ?? 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer = renderer;

    // Darker lighting setup
    const ambient = new THREE.AmbientLight(0x221133, 0.8);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0x88aaff, 1.6);
    key.position.set(2, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(config.shadowMapSize || 2048, config.shadowMapSize || 2048);
    key.shadow.radius = 2;
    scene.add(key);
    const fill = new THREE.PointLight(0x44aa66, 0.7, 12);
    fill.position.set(-3, 2, 2);
    scene.add(fill);
    const rim = new THREE.PointLight(0xaa44ff, 1.2);
    rim.position.set(0, 2.5, -4);
    scene.add(rim);
    const hemi = new THREE.HemisphereLight(0x331144, 0x224422, 0.6);
    scene.add(hemi);

    state.lights = { ambient, key, fill, rim, hemi };

    // Realistic ground (cobblestone/gravel)
    createRealisticGround();

    createDarkBackground();

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = config.orbitLimits?.min ?? 1.2;
    controls.maxDistance = config.orbitLimits?.max ?? 10;
    state.controls = controls;

    function animate() {
        requestAnimationFrame(animate);
        if (state.claw && !state.currentAnim) {
            state.claw.position.y = (state.claw.userData.baseY ?? 0) + Math.sin(performance.now() * 0.0018) * 0.03;
        }
        if (state.cloneGroup) {
            // Only follow horizontal movement – never copy the claw's animated Y
            state.cloneGroup.position.x = state.claw.position.x;
            state.cloneGroup.position.z = state.claw.position.z;
            state.cloneGroup.position.y = state.claw.userData.baseY ?? 0;
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
        config.modelFile || 'shadow_claw.glb',
        (gltf) => {
            const claw = gltf.scene;
            const box = new THREE.Box3().setFromObject(claw);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = (config.modelScaleTarget || 2.4) / maxDim;

            claw.scale.setScalar(scale);
            claw.position.sub(center.multiplyScalar(scale));
            const box2 = new THREE.Box3().setFromObject(claw);
            // Place feet exactly on ground (Y=0)
            claw.position.y -= box2.min.y;
            claw.userData.baseY = claw.position.y;

            claw.traverse(obj => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                    if (obj.material) {
                        obj.material.roughness = 0.45;
                        obj.material.metalness = 0.25;
                    }
                }
            });
            state.scene.add(claw);
            state.claw = claw;

            const mid = new THREE.Box3().setFromObject(claw).getCenter(new THREE.Vector3());
            state.controls.target.copy(mid);
            state.camera.position.set(mid.x, mid.y + 0.5, mid.z + 5.0);
            state.controls.update();

            loading.classList.add('hidden');
        },
        xhr => {
            if (xhr.total) {
                loading.querySelector('p').textContent = `Summoning… ${Math.round(xhr.loaded / xhr.total * 100)}%`;
            }
        },
        err => {
            console.error(err);
            loading.querySelector('p').textContent = '❌ Shadow Claw model missing. Place shadow_claw.glb in folder.';
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

function updateSequenceDisplay() {
    if (sequenceDisplay) sequenceDisplay.textContent = state.currentSequence;
}

function handleAnimBtn(id) {
    if (!state.claw) return;
    if (handleAnimBtn._stopTimer) {
        clearTimeout(handleAnimBtn._stopTimer);
        handleAnimBtn._stopTimer = null;
    }
    resetPose(0.2, id === 'reset');
    document.querySelectorAll('.btns button').forEach(b => b.classList.remove('active'));
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
            case 'dance':  danceClaw(loop, sequences); break;
            case 'jump':   jumpClaw(loop, sequences); break;
            case 'spin':   spinClaw(loop, sequences); break;
            case 'claw':   clawAttack(loop, sequences); break;
        }
    }, 180);
}

function createLoopUI() {
    const div = document.createElement('div');
    div.id = 'loopControls';
    div.style.cssText = 'margin-top:0.5rem;display:flex;justify-content:center;gap:1rem;align-items:center;flex-wrap:wrap;';
    div.innerHTML = `
        <label style="font-size:0.72rem;color:#8f6fbf;cursor:pointer;">
            <input type="checkbox" id="loopCheck" style="vertical-align:middle;"> Loop ∞
        </label>
        <label style="font-size:0.72rem;color:#8f6fbf;">
            Sequences <input type="number" id="sequencesInput" value="1" min="1" max="20" step="1"
            style="width:48px;border-radius:0px;border:1px solid #4aff4a;background:#0a0515;color:#c0ffc0;padding:2px 4px;font-family:inherit;text-align:center;">
        </label>
        <span style="font-size:0.72rem;color:#8f6fbf;">
            Now: <span id="seqDisplay" style="font-weight:bold;color:#4aff4a;">0</span>
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
    resetPose(0.25, false);
    overlay.classList.remove('open');
    document.querySelectorAll('.btns button').forEach(b => b.classList.remove('active'));
    state.currentSequence = 0;
    updateSequenceDisplay();
}

async function initApp() {
    try {
        const resp = await fetch('shadow-claw-config.json');
        config = await resp.json();
    } catch (e) {
        config = {
            particleBackground: ['⚡','🌙','🐾'],
            particleCount: 20,
            animations: [
                { id:'dance', label:'🌩️ Storm Dance' },
                { id:'jump',  label:'🦇 Shadow Leap' },
                { id:'spin',  label:'🌀 Abyss Twister' },
                { id:'claw',  label:'🐾 Claw Slash' },
                { id:'reset', label:'↩ Dark Reset' }
            ],
            modelFile: 'shadow_claw.glb',
            modelScaleTarget: 2.4,
            cameraFov: 38,
            cameraDistance: 5,
            orbitLimits: { min:1, max:12 },
            shadowMapSize: 2048,
            toneMappingExposure: 1.2
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