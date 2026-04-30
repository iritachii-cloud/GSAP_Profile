import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { state } from './state.js';
import { getRandomWalkablePosition } from './aiMode.js';
import { spawnPetalBurst } from './utils.js';
import { showCustomMessage } from './speechBubble.js';
import { showCharacterMessage, updateDistance, updateEscapeCount } from './fpvHUD.js';

let hayabusaModel     = null;
let chaseActive       = false;
let teleportAnimId    = null;
let canTeleport       = true;
let teleportPending   = false;
const TELEPORT_COOLDOWN = 2000;

// ─── Regular (non‑FPV) Hayabusa speech bubble ────────────────────────────
let bubble       = null;
let tailEl       = null;
let textEl       = null;
let hideTimer    = null;

function createHayabusaBubble() {
    if (bubble) return;
    const wrap = document.querySelector('.canvas-wrap') || document.body;
    const div = document.createElement('div');
    div.id = 'hayabusaSpeechBubble';
    Object.assign(div.style, {
        position:        'absolute',
        maxWidth:        '180px',
        minWidth:        '70px',
        padding:         '0.25rem 0.6rem',
        borderRadius:    '16px',
        border:          '2px solid #aaddff',
        background:      'rgba(20,20,40,0.94)',
        boxShadow:       '0 3px 12px rgba(0,0,0,0.4)',
        fontFamily:      'Quicksand, sans-serif',
        fontSize:        '0.6rem',
        fontWeight:      '600',
        lineHeight:      '1.4',
        color:           '#d0e0ff',
        pointerEvents:   'none',
        zIndex:          '210',
        opacity:         '0',
        transform:       'translateX(-50%) translateY(-100%) scale(0.85)',
        transformOrigin: 'bottom center',
        transition:      'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.4,0.64,1)',
        whiteSpace:      'normal',
        textAlign:       'center',
        willChange:      'transform, opacity',
    });
    textEl = document.createElement('span');
    div.appendChild(textEl);
    tailEl = document.createElement('div');
    Object.assign(tailEl.style, {
        position:     'absolute',
        bottom:       '-10px',
        left:         '50%',
        transform:    'translateX(-50%)',
        width:        '0',
        height:       '0',
        borderLeft:   '7px solid transparent',
        borderRight:  '7px solid transparent',
        borderTop:    '10px solid #aaddff',
        pointerEvents:'none',
    });
    div.appendChild(tailEl);
    wrap.appendChild(div);
    bubble = div;
}

function updateHayabusaBubblePosition() {
    if (!bubble || !hayabusaModel || !state.camera) return;
    const worldPos = hayabusaModel.position.clone();
    worldPos.y += 0.8;
    const vector = worldPos.project(state.camera);
    if (vector.z > 1) { bubble.style.opacity = '0'; return; }
    const wrapper = document.querySelector('.canvas-wrap');
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const x = (vector.x * 0.5 + 0.5) * rect.width;
    const y = (vector.y * -0.5 + 0.5) * rect.height;
    bubble.style.left = `${x}px`;
    bubble.style.top  = `${y}px`;
    const bw = bubble.offsetWidth, half = bw / 2;
    const clampedX = Math.max(half + 8, Math.min(rect.width - half - 8, x));
    if (clampedX !== x) {
        bubble.style.left = `${clampedX}px`;
        const tailShift = x - clampedX;
        tailEl.style.left = `calc(50% + ${tailShift}px)`;
    } else {
        tailEl.style.left = '50%';
    }
}

function showHayabusaMessage(text, holdMs = 3500) {
    createHayabusaBubble();
    if (hideTimer) clearTimeout(hideTimer);
    textEl.textContent = text;
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(1)';
    hideTimer = setTimeout(() => {
        bubble.style.opacity = '0';
        bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(0.85)';
    }, holdMs);
}

// ─── Cheesy lines ──────────────────────────────────────────────────────────
const HAYABUSA_LINES = [
    "Almost, sweetheart~ Better luck next time! 💕",
    "You're getting warmer, my love! 🥰",
    "So close, yet so far~ 😘",
    "Catch me and I'll give you a kiss, Kagura! 💋",
    "Not yet, my flower~ Try again! 🌺",
    "You're so cute when you try! 😍",
    "I'll make it harder for you, darling~",
    "Faster, my cherry blossom! 🌸",
    "You can't catch the wind, my love~",
    "If you catch me, I'll be yours forever… maybe. 😝",
    "Your smile keeps me running! 💖",
    "Almost had me! Keep going, Kagura! ✨",
    "So near, yet so far… just like our destiny~",
    "You'll never catch a shadow! 😊",
    "I love it when you chase me~ 💗",
    "Too slow, my queen! 😎",
    "You missed me? I missed you more! 💌",
    "Your love is my favourite game~ 🎮",
    "Try again, my radiant moon~ 🌙",
    "I'll always keep you on your toes! 💃"
];
const KAGURA_REPLIES = [
    "Hmmph! I'll definitely catch you! >.<",
    "Just you wait, Hayabusa! 💢",
    "You're so annoying… but so cute! 😤💕",
    "I will catch you if it's the last thing I do! 💪",
    "Stop running! My heart can't take it! 💓",
    "You're such a tease! 😣",
    "Love is not a game… but I'll win anyway! 🏆",
    "I'll prove my love is faster than your shadow! ⚡",
    "Every time you vanish, my love grows stronger! 🌹",
    "One day you'll be in my arms, Hayabusa! 🤗",
    "Stop playing hard to get! 😾",
    "My petals will find you anywhere! 🌸",
    "You think you're so cool… you are, but still! 😅",
    "Your shadow step is cheating! 😤 …but I love it.",
    "I'll chase you to the ends of the earth! 🌏",
    "Your voice makes me want to catch you even more! 🎶",
    "Catch me if you can… No, that's my line! 🙄",
    "I'm not giving up on us! ❤️",
    "You're the only one I'd run after, you know… 🥺",
    "When I catch you, we'll share a sakura mochi! 🍡"
];
const HAYABUSA_FIRST = "Try to catch me if you can, Kagura~ ❤️";
const KAGURA_FIRST   = "Ok, my love Hayabusa… I will find you! 🌸";

// ─── Load model ────────────────────────────────────────────────────────────
function loadModel() {
    return new Promise((resolve, reject) => {
        new GLTFLoader().load('fanny.glb', (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1 / maxDim;
            model.scale.setScalar(scale);
            model.position.sub(center.multiplyScalar(scale));
            const box2 = new THREE.Box3().setFromObject(model);
            model.position.y -= box2.min.y;
            model.userData.baseY = model.position.y;
            model.traverse(obj => {
                if (obj.isMesh && obj.material) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });
            resolve(model);
        }, undefined, reject);
    });
}

// ─── Teleport animation ───────────────────────────────────────────────────
function performTeleport(newPos) {
    teleportPending = false;
    if (!hayabusaModel || !chaseActive) return;

    // Increment escape count
    state.escapeCount++;
    updateEscapeCount(state.escapeCount);

    const tl = gsap.timeline();
    tl.to(hayabusaModel.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.15, ease: 'power2.in' }, 0)
      .call(() => {
          hayabusaModel.position.set(newPos.x, hayabusaModel.userData.baseY, newPos.z);
          state.chaseTarget = newPos.clone();
      }, null, 0.15)
      .to(hayabusaModel.scale, { x: 1, y: 1, z: 1, duration: 0.25, ease: 'back.out(1.7)' }, 0.15)
      .call(() => {
          spawnPetalBurst(hayabusaModel.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 40, '#aa44ff');

          const kLine = KAGURA_REPLIES[Math.floor(Math.random() * KAGURA_REPLIES.length)];
          if (state.cameraMode === 'fpv') {
              showCharacterMessage('kagura', kLine, 3000);
          } else {
              showCustomMessage(kLine, 'excited', 3000, 4000);
          }

          canTeleport = false;
          setTimeout(() => { canTeleport = true; }, TELEPORT_COOLDOWN);
      }, null, 0.4);
}

// ─── Pause + drama ────────────────────────────────────────────────────────
async function triggerCloseEncounter() {
    if (!hayabusaModel || !chaseActive || teleportPending || !canTeleport) return;
    teleportPending = true;
    canTeleport = false;

    state.chasePause = true;
    await new Promise(r => setTimeout(r, 1500));

    const hLine = HAYABUSA_LINES[Math.floor(Math.random() * HAYABUSA_LINES.length)];
    if (state.cameraMode === 'fpv') {
        showCharacterMessage('hayabusa', hLine, 3500);
    } else {
        showHayabusaMessage(hLine, 3500);
    }

    await new Promise(r => setTimeout(r, 1500));
    state.chasePause = false;

    const kaguraPos = state.claw.position.clone();
    let newPos;
    for (let i = 0; i < 30; i++) {
        const candidate = getRandomWalkablePosition();
        if (candidate.distanceTo(kaguraPos) > 4.5) { newPos = candidate; break; }
    }
    if (!newPos) newPos = getRandomWalkablePosition();
    performTeleport(newPos);
}

function teleportCheck() {
    if (!chaseActive || !hayabusaModel || !state.claw || !canTeleport || teleportPending) return;
    const kaguraPos = state.claw.position.clone();
    const hayabusaPos = hayabusaModel.position.clone();
    const dist = kaguraPos.distanceTo(hayabusaPos);

    // Update HUD distance
    updateDistance(dist);

    if (dist < 3.0) {
        triggerCloseEncounter();
    }
}

function updateHayabusaFacing() {
    if (!hayabusaModel || !state.claw) return;
    const targetPos = state.claw.position.clone();
    targetPos.y = hayabusaModel.position.y;
    hayabusaModel.lookAt(targetPos);
}

function chaseTick() {
    if (!chaseActive) return;
    teleportCheck();
    updateHayabusaFacing();
    updateHayabusaBubblePosition();
    teleportAnimId = requestAnimationFrame(chaseTick);
}

// ─── Public API ────────────────────────────────────────────────────────────
export async function startHayabusaChase() {
    if (chaseActive) return;
    chaseActive = true;

    if (!hayabusaModel) {
        try {
            hayabusaModel = await loadModel();
            state.scene.add(hayabusaModel);
        } catch (e) {
            console.error('Hayabusa model load failed:', e);
            chaseActive = false;
            return;
        }
    }

    state.escapeCount = 0;
    updateEscapeCount(0);
    const spawnPos = getRandomWalkablePosition();
    hayabusaModel.position.set(spawnPos.x, hayabusaModel.userData.baseY, spawnPos.z);
    hayabusaModel.visible = true;
    state.chaseTarget = spawnPos.clone();
    state.chasePause = false;

    if (state.cameraMode === 'fpv') {
        showCharacterMessage('hayabusa', HAYABUSA_FIRST, 3500);
    } else {
        showHayabusaMessage(HAYABUSA_FIRST, 3500);
    }
    setTimeout(() => {
        if (!chaseActive) return;
        if (state.cameraMode === 'fpv') {
            showCharacterMessage('kagura', KAGURA_FIRST, 3000);
        } else {
            showCustomMessage(KAGURA_FIRST, 'excited', 3000, 4000);
        }
    }, 3800);

    chaseTick();
}

export function stopHayabusaChase() {
    chaseActive = false;
    state.chaseTarget = null;
    state.chasePause = false;
    teleportPending = false;
    if (teleportAnimId) { cancelAnimationFrame(teleportAnimId); teleportAnimId = null; }
    if (bubble) { bubble.remove(); bubble = null; textEl = null; tailEl = null; }
    if (hideTimer) clearTimeout(hideTimer);
    if (hayabusaModel) { state.scene.remove(hayabusaModel); hayabusaModel = null; }
}