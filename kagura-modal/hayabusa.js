import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { state } from './state.js';
import { getRandomWalkablePosition, playFinalCatchSequence } from './aiMode.js';
import { spawnPetalBurst } from './utils.js';
import { showCustomMessage } from './speechBubble.js';
import { showCharacterMessage, updateDistance, updateEscapeCount } from './fpvHUD.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const MAX_ESCAPES = 20;          // after this many escapes Kagura catches him

// ═══════════════════════════════════════════════════════════════════════════════
//  SHUFFLE-DECK
// ═══════════════════════════════════════════════════════════════════════════════
function createDeck(items) {
    let queue = [];
    let lastDrawn = null;

    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function refill() {
        queue = shuffle(items);
        if (lastDrawn !== null && queue.length > 1 && queue[0] === lastDrawn) {
            const swap = 1 + Math.floor(Math.random() * (queue.length - 1));
            [queue[0], queue[swap]] = [queue[swap], queue[0]];
        }
    }

    return {
        drawNext() {
            if (queue.length === 0) refill();
            lastDrawn = queue.shift();
            return lastDrawn;
        },
        reset() { queue = []; lastDrawn = null; }
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAIRED DIALOGUE
// ═══════════════════════════════════════════════════════════════════════════════
const DIALOGUE_PAIRS = [
    {
        hayabusa: "Catch me if you can, Kagura~ ❤️",
        kagura:   "Always making me chase. Just you wait, hmmph >.<",
        hEmotion: 'playful',
        kEmotion: 'excited',
    },
    {
        hayabusa: "Almost, sweetheart~ Better luck next time! 💕",
        kagura:   "Hmmph! I'll DEFINITELY catch you! 💢",
        hEmotion: 'happy',
        kEmotion: 'excited',
    },
    {
        hayabusa: "You're getting warmer, my love! 🥰",
        kagura:   "Then stop. Moving. Away!! 😤",
        hEmotion: 'happy',
        kEmotion: 'excited',
    },
    {
        hayabusa: "So close, yet so far~ 😘",
        kagura:   "That's literally your fault!! >.<",
        hEmotion: 'playful',
        kEmotion: 'playful',
    },
    {
        hayabusa: "Catch me and I'll give you a kiss! 💋",
        kagura:   "I— that's not— UGH fine! 😳💨",
        hEmotion: 'excited',
        kEmotion: 'excited',
    },
    {
        hayabusa: "Not yet, my flower~ Try again! 🌺",
        kagura:   "Oh I'll try again alright! With full power!! 💪",
        hEmotion: 'happy',
        kEmotion: 'excited',
    },
    {
        hayabusa: "You're so cute when you try! 😍",
        kagura:   "I'm CUTE?! I mean— I'm DEADLY! 😤",
        hEmotion: 'happy',
        kEmotion: 'playful',
    },
    {
        hayabusa: "I'll make it harder for you, darling~",
        kagura:   "You already make everything hard! 😑",
        hEmotion: 'playful',
        kEmotion: 'playful',
    },
    {
        hayabusa: "Faster, my cherry blossom! 🌸",
        kagura:   "You want faster?! HERE COMES FASTER!! 💨",
        hEmotion: 'excited',
        kEmotion: 'excited',
    },
    {
        hayabusa: "You can't catch the wind, my love~",
        kagura:   "Watch me. I'll bottle the whole sky! ⚡",
        hEmotion: 'playful',
        kEmotion: 'excited',
    },
    {
        hayabusa: "If you catch me, I'll be yours forever~ 😝",
        kagura:   "You'll be mine anyway! I just want the satisfaction! 😤",
        hEmotion: 'playful',
        kEmotion: 'playful',
    },
    {
        hayabusa: "Your smile keeps me running! 💖",
        kagura:   "My smile will keep you RUNNING INTO MY ARMS! 🌸",
        hEmotion: 'happy',
        kEmotion: 'happy',
    },
    {
        hayabusa: "So near, yet so far… just like our destiny~",
        kagura:   "Destiny could move a little faster then! 🙄",
        hEmotion: 'peaceful',
        kEmotion: 'playful',
    },
    {
        hayabusa: "You'll never catch a shadow! 😊",
        kagura:   "Then I'll catch your heart instead!! 💗",
        hEmotion: 'playful',
        kEmotion: 'excited',
    },
    {
        hayabusa: "I love it when you chase me~ 💗",
        kagura:   "I love it when you STOP running! 😤",
        hEmotion: 'happy',
        kEmotion: 'playful',
    },
    {
        hayabusa: "Too slow, my queen! 😎",
        kagura:   "Your Majesty is about to catch you!! 👑💨",
        hEmotion: 'excited',
        kEmotion: 'excited',
    },
    {
        hayabusa: "You missed me? I missed you more! 💌",
        kagura:   "You're literally RIGHT THERE!! 😭",
        hEmotion: 'happy',
        kEmotion: 'excited',
    },
    {
        hayabusa: "Your love is my favourite game~ 🎮",
        kagura:   "This game has no pause button!! 😤",
        hEmotion: 'playful',
        kEmotion: 'playful',
    },
    {
        hayabusa: "Try again, my radiant moon~ 🌙",
        kagura:   "The moon doesn't chase!! But I do!! 🌸",
        hEmotion: 'peaceful',
        kEmotion: 'excited',
    },
    {
        hayabusa: "I'll always keep you on your toes! 💃",
        kagura:   "My toes are tired!! My HEART is tired!! 🥺",
        hEmotion: 'playful',
        kEmotion: 'happy',
    },
];

// First-encounter lines
const HAYABUSA_FIRST = "Try to catch me if you can, Kagura~ ❤️";
const KAGURA_FIRST   = "Okay my love… just you wait. I WILL find you! 🌸";

// Final catch warning lines (shown at 15-19 escapes to hint at ending)
const NEAR_END_PAIRS = [
    {
        hayabusa: "Hmm… you're getting really close! 😅",
        kagura:   "I can FEEL it! This time!! 🌸💨",
    },
    {
        hayabusa: "W-wait, you're actually catching up?! 😳",
        kagura:   "Oh I'm catching up ALRIGHT!! 💪🌸",
    },
    {
        hayabusa: "Maybe I should slow down… just a little~",
        kagura:   "DON'T YOU DARE slow down on purpose!! 😤",
    },
    {
        hayabusa: "I… I think she might actually get me! 💙",
        kagura:   "Almost… ALMOST THERE!! 🏃‍♀️💨",
    },
    {
        hayabusa: "Could this be the last time I run? 🥺",
        kagura:   "Yes. YES IT IS. COME HERE!! 🌸💗",
    },
];

// Idle thoughts Hayabusa has while waiting
const HAYABUSA_IDLE_THOUGHTS = [
    { text: "I hope she finds me soon~ 💭",              color: '#aaddff' },
    { text: "Should I jump so she can see me? 🤔",       color: '#aaddff' },
    { text: "Come on Kagura, this way~! ❤️",            color: '#aaddff' },
    { text: "Her footsteps are getting closer~ 👂",      color: '#aaddff' },
    { text: "Maybe just one more step closer… 😏",       color: '#aaddff' },
    { text: "I missed her already 💙",                   color: '#aaddff' },
    { text: "She's so determined, I love it~ 😍",        color: '#aaddff' },
    { text: "Okay maybe I'm hiding TOO well… 😅",        color: '#aaddff' },
    { text: "Find me find me find me~ 💕",               color: '#aaddff' },
    { text: "I'll let her get close… just a little 😈", color: '#aaddff' },
    { text: "Her petals won't reach me~ ...right? 😬",  color: '#aaddff' },
    { text: "Am I flirting or running? Both. 😎",        color: '#aaddff' },
    { text: "She looks so beautiful when she's mad 💙",  color: '#aaddff' },
    { text: "Ninja rule #1: never get caught 🥷",        color: '#aaddff' },
    { text: "...okay maybe just a tiny peek 👀",         color: '#aaddff' },
];

const dialogueDeck     = createDeck(DIALOGUE_PAIRS);
const idleThoughtDeck  = createDeck(HAYABUSA_IDLE_THOUGHTS);
const nearEndDeck      = createDeck(NEAR_END_PAIRS);

// Idle thought interval: 9-15s (was 7-12s — slowed down)
const IDLE_THOUGHT_MIN = 9000;
const IDLE_THOUGHT_MAX = 15000;

// ═══════════════════════════════════════════════════════════════════════════════
//  MODULE STATE
// ═══════════════════════════════════════════════════════════════════════════════
let hayabusaModel     = null;
let chaseActive       = false;
let teleportAnimId    = null;
let canTeleport       = true;
let teleportPending   = false;
const TELEPORT_COOLDOWN = 2500;

let preloadedModel = null;
let preloadPromise = null;

let idleThoughtTimer = null;
let idleActionTimer  = null;
let idleActionLock   = false;

// ═══════════════════════════════════════════════════════════════════════════════
//  DRACO / GLTF LOADERS
// ═══════════════════════════════════════════════════════════════════════════════
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });
const hayabusaGltfLoader = new GLTFLoader();
hayabusaGltfLoader.setDRACOLoader(dracoLoader);

// ═══════════════════════════════════════════════════════════════════════════════
//  HAYABUSA SPEECH BUBBLE  (non-FPV)
// ═══════════════════════════════════════════════════════════════════════════════
let bubble    = null;
let tailEl    = null;
let textEl    = null;
let hideTimer = null;
let typeTimer = null;

function createHayabusaBubble() {
    if (bubble) return;
    const wrap = document.querySelector('.canvas-wrap') || document.body;
    const div  = document.createElement('div');
    div.id = 'hayabusaSpeechBubble';
    Object.assign(div.style, {
        position:        'absolute',
        maxWidth:        '190px',
        minWidth:        '70px',
        padding:         '0.3rem 0.65rem',
        borderRadius:    '16px',
        border:          '2px solid #aaddff',
        background:      'rgba(10,15,40,0.95)',
        boxShadow:       '0 3px 14px rgba(0,0,0,0.5), 0 0 10px rgba(170,221,255,0.25)',
        fontFamily:      'Quicksand, sans-serif',
        fontSize:        '0.6rem',
        fontWeight:      '600',
        lineHeight:      '1.45',
        color:           '#d0e8ff',
        pointerEvents:   'none',
        zIndex:          '210',
        opacity:         '0',
        transform:       'translateX(-50%) translateY(-100%) scale(0.85)',
        transformOrigin: 'bottom center',
        transition:      'opacity 0.22s ease, transform 0.22s cubic-bezier(0.34,1.4,0.64,1)',
        whiteSpace:      'normal',
        textAlign:       'center',
        willChange:      'transform, opacity',
    });

    textEl = document.createElement('span');
    div.appendChild(textEl);

    tailEl = document.createElement('div');
    Object.assign(tailEl.style, {
        position:      'absolute',
        bottom:        '-10px',
        left:          '50%',
        transform:     'translateX(-50%)',
        width:         '0',
        height:        '0',
        borderLeft:    '7px solid transparent',
        borderRight:   '7px solid transparent',
        borderTop:     '10px solid #aaddff',
        pointerEvents: 'none',
    });
    div.appendChild(tailEl);
    wrap.appendChild(div);
    bubble = div;
}

function updateHayabusaBubblePosition() {
    if (!bubble || !hayabusaModel || !state.camera) return;
    const worldPos = hayabusaModel.position.clone();
    worldPos.y += 0.85;
    const vector = worldPos.project(state.camera);
    if (vector.z > 1) { bubble.style.opacity = '0'; return; }
    const wrapper = document.querySelector('.canvas-wrap');
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const x    = (vector.x * 0.5 + 0.5) * rect.width;
    const y    = (vector.y * -0.5 + 0.5) * rect.height;
    bubble.style.left = `${x}px`;
    bubble.style.top  = `${y}px`;
    const half     = bubble.offsetWidth / 2;
    const clampedX = Math.max(half + 8, Math.min(rect.width - half - 8, x));
    if (clampedX !== x) {
        bubble.style.left = `${clampedX}px`;
        tailEl.style.left = `calc(50% + ${x - clampedX}px)`;
    } else {
        tailEl.style.left = '50%';
    }
}

function typeWriteHayabusa(text, onDone) {
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
    textEl.textContent = '';
    let i = 0;
    function tick() {
        textEl.textContent = text.slice(0, i + 1);
        i++;
        if (i < text.length) {
            const ch    = text[i - 1];
            const delay = /[.,!?…~<>]/.test(ch)
                ? 100 + Math.random() * 60
                :  24 + Math.random() * 18;
            typeTimer = setTimeout(tick, delay);
        } else {
            if (onDone) onDone();
        }
    }
    typeTimer = setTimeout(tick, 25);
}

function showHayabusaMessage(text, holdMs = 3500) {
    createHayabusaBubble();
    if (hideTimer) clearTimeout(hideTimer);
    if (typeTimer)  clearTimeout(typeTimer);
    typeWriteHayabusa(text, () => {});
    bubble.style.opacity   = '1';
    bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(1)';
    hideTimer = setTimeout(() => {
        bubble.style.opacity   = '0';
        bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(0.85)';
    }, holdMs);
}

function showHayabusaIdleThought(thought, holdMs = 3500) {
    createHayabusaBubble();
    if (hideTimer) clearTimeout(hideTimer);
    if (typeTimer)  clearTimeout(typeTimer);
    bubble.style.fontSize      = '0.55rem';
    textEl.style.fontStyle     = 'italic';
    typeWriteHayabusa(thought, () => {});
    bubble.style.opacity   = '0.88';
    bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(0.95)';
    hideTimer = setTimeout(() => {
        bubble.style.opacity       = '0';
        bubble.style.transform     = 'translateX(-50%) translateY(-100%) scale(0.85)';
        bubble.style.fontSize      = '0.6rem';
        textEl.style.fontStyle     = 'normal';
    }, holdMs);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HAYABUSA IDLE ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function startBaseBob() {
    if (!hayabusaModel) return;
    const base = hayabusaModel.userData.baseY ?? 0;
    gsap.to(hayabusaModel.position, {
        y: base + 0.04,
        duration: 1.1,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        id: 'hayabusaBob'
    });
}

function stopBaseBob() {
    gsap.killTweensOf(hayabusaModel?.position, 'y');
    if (hayabusaModel) hayabusaModel.position.y = hayabusaModel.userData.baseY ?? 0;
}

function idleHopefulJump() {
    return new Promise(resolve => {
        if (!hayabusaModel || !chaseActive) { resolve(); return; }
        stopBaseBob();
        const base = hayabusaModel.userData.baseY ?? 0;
        gsap.timeline({ onComplete: () => { startBaseBob(); resolve(); }, onInterrupt: resolve })
            .to(hayabusaModel.scale,    { y: 0.78, duration: 0.07, ease: 'power2.in' })
            .to(hayabusaModel.position, { y: base + 0.55, duration: 0.2, ease: 'power2.out' })
            .to(hayabusaModel.scale,    { y: 1.18, duration: 0.1  }, '-=0.08')
            .to(hayabusaModel.position, { y: base, duration: 0.22, ease: 'bounce.out' })
            .to(hayabusaModel.scale,    { y: 1, duration: 0.14 });
    });
}

async function idleDoubleHop() {
    if (!hayabusaModel || !chaseActive) return;
    await idleHopefulJump();
    await new Promise(r => setTimeout(r, 100));
    await idleHopefulJump();
}

function idleSpinPeek() {
    return new Promise(resolve => {
        if (!hayabusaModel || !chaseActive) { resolve(); return; }
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(hayabusaModel.rotation, { y: `+=${Math.PI}`, duration: 0.35, ease: 'power2.inOut' })
            .to({}, { duration: 0.3 })
            .to(hayabusaModel.rotation, { y: `+=${Math.PI}`, duration: 0.35, ease: 'power2.inOut' });
    });
}

function idleWiggle() {
    return new Promise(resolve => {
        if (!hayabusaModel || !chaseActive) { resolve(); return; }
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(hayabusaModel.rotation, { z:  0.14, duration: 0.15, ease: 'sine.inOut' })
            .to(hayabusaModel.rotation, { z: -0.14, duration: 0.15, ease: 'sine.inOut' })
            .to(hayabusaModel.rotation, { z:  0.10, duration: 0.12, ease: 'sine.inOut' })
            .to(hayabusaModel.rotation, { z: -0.10, duration: 0.12, ease: 'sine.inOut' })
            .to(hayabusaModel.rotation, { z:  0,    duration: 0.1,  ease: 'sine.out'   });
    });
}

function idleLookAround() {
    return new Promise(resolve => {
        if (!hayabusaModel || !chaseActive) { resolve(); return; }
        const startY = hayabusaModel.rotation.y;
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(hayabusaModel.rotation, { y: startY - 0.8, duration: 0.5, ease: 'sine.inOut' })
            .to(hayabusaModel.rotation, { y: startY + 0.8, duration: 0.9, ease: 'sine.inOut' })
            .to(hayabusaModel.rotation, { y: startY,       duration: 0.4, ease: 'sine.out'   });
    });
}

function idleStretchUp() {
    return new Promise(resolve => {
        if (!hayabusaModel || !chaseActive) { resolve(); return; }
        stopBaseBob();
        const base = hayabusaModel.userData.baseY ?? 0;
        gsap.timeline({ onComplete: () => { startBaseBob(); resolve(); }, onInterrupt: resolve })
            .to(hayabusaModel.scale,    { y: 1.22, x: 0.84, z: 0.84, duration: 0.4, ease: 'power2.out' })
            .to(hayabusaModel.position, { y: base + 0.06, duration: 0.4 }, 0)
            .to({}, { duration: 0.35 })
            .to(hayabusaModel.scale,    { y: 1, x: 1, z: 1, duration: 0.3, ease: 'back.out(1.5)' })
            .to(hayabusaModel.position, { y: base, duration: 0.28 }, '-=0.28');
    });
}

function idleWave() {
    return new Promise(resolve => {
        if (!hayabusaModel || !chaseActive) { resolve(); return; }
        const startY = hayabusaModel.rotation.y;
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(hayabusaModel.rotation, { y: startY + 0.35, duration: 0.22, ease: 'power2.out' })
            .to(hayabusaModel.rotation, { y: startY - 0.35, duration: 0.22, ease: 'sine.inOut' })
            .to(hayabusaModel.rotation, { y: startY + 0.20, duration: 0.18, ease: 'sine.inOut' })
            .to(hayabusaModel.rotation, { y: startY,        duration: 0.18, ease: 'sine.out'   });
    });
}

function idleCelebrateSpin() {
    return new Promise(resolve => {
        if (!hayabusaModel || !chaseActive) { resolve(); return; }
        spawnPetalBurst(
            hayabusaModel.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
            16, '#88aaff'
        );
        gsap.timeline({ onComplete: resolve, onInterrupt: resolve })
            .to(hayabusaModel.rotation, { y: `+=${Math.PI * 2}`, duration: 0.65, ease: 'power1.inOut' });
    });
}

const IDLE_ACTION_POOL = [
    { fn: idleHopefulJump,   weight: 4 },
    { fn: idleDoubleHop,     weight: 2 },
    { fn: idleWiggle,        weight: 3 },
    { fn: idleLookAround,    weight: 3 },
    { fn: idleWave,          weight: 3 },
    { fn: idleStretchUp,     weight: 2 },
    { fn: idleSpinPeek,      weight: 2 },
    { fn: idleCelebrateSpin, weight: 1 },
];

function pickIdleAction() {
    const total = IDLE_ACTION_POOL.reduce((s, a) => s + a.weight, 0);
    let r = Math.random() * total;
    for (const a of IDLE_ACTION_POOL) { r -= a.weight; if (r <= 0) return a.fn; }
    return IDLE_ACTION_POOL[0].fn;
}

async function idleActionLoop() {
    while (chaseActive && hayabusaModel) {
        const waitMs = 2500 + Math.random() * 2500;
        await new Promise(r => setTimeout(r, waitMs));
        if (!chaseActive || !hayabusaModel) break;
        if (teleportPending || state.chasePause) continue;
        if (idleActionLock) continue;

        idleActionLock = true;
        const action = pickIdleAction();
        try { await action(); } catch (_) {}
        idleActionLock = false;
    }
}

async function idleThoughtLoop() {
    await new Promise(r => setTimeout(r, 5000 + Math.random() * 3000));

    while (chaseActive && hayabusaModel) {
        if (!teleportPending && !state.chasePause) {
            const thought = idleThoughtDeck.drawNext();
            if (state.cameraMode === 'fpv') {
                showCharacterMessage('hayabusa', thought.text, 3500);
            } else {
                showHayabusaIdleThought(thought.text, 3500);
            }
        }
        const interval = IDLE_THOUGHT_MIN + Math.random() * (IDLE_THOUGHT_MAX - IDLE_THOUGHT_MIN);
        await new Promise(r => setTimeout(r, interval));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MODEL LOADER
// ═══════════════════════════════════════════════════════════════════════════════
function loadModelFromDisk(onProgress) {
    return new Promise((resolve, reject) => {
        hayabusaGltfLoader.load(
            'hayabusa-v1.glb',
            (gltf) => {
                const model  = gltf.scene;
                const box    = new THREE.Box3().setFromObject(model);
                const size   = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale  = 1 / maxDim;

                model.scale.setScalar(scale);
                model.position.sub(center.multiplyScalar(scale));
                const box2 = new THREE.Box3().setFromObject(model);
                model.position.y -= box2.min.y;
                model.userData.baseY = model.position.y;

                model.traverse(obj => {
                    if (obj.isMesh && obj.material) {
                        obj.castShadow    = true;
                        obj.receiveShadow = true;

                        // ✅ Force all textures to sRGB (fixes Android green tint)
                        if (obj.material.map)           obj.material.map.colorSpace = THREE.SRGBColorSpace;
                        if (obj.material.emissiveMap)   obj.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                        if (obj.material.roughnessMap)  obj.material.roughnessMap.colorSpace = THREE.SRGBColorSpace;
                        if (obj.material.metalnessMap)  obj.material.metalnessMap.colorSpace = THREE.SRGBColorSpace;
                        if (obj.material.normalMap)     obj.material.normalMap.colorSpace = THREE.SRGBColorSpace;
                        if (obj.material.aoMap)         obj.material.aoMap.colorSpace = THREE.SRGBColorSpace;
                    }
                });
                resolve(model);
            },
            (xhr) => {
                if (onProgress && xhr.lengthComputable) {
                    onProgress(Math.round((xhr.loaded / xhr.total) * 100));
                }
            },
            reject
        );
    });
}

export function preloadHayabusa(onProgress, onDone) {
    if (preloadedModel || preloadPromise) { if (onDone) onDone(); return; }
    preloadPromise = loadModelFromDisk(onProgress)
        .then(model => {
            preloadedModel = model;
            preloadPromise = null;
            if (onDone) onDone();
        })
        .catch(err => {
            console.warn('Hayabusa background preload failed:', err);
            preloadPromise = null;
            if (onDone) onDone();
        });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FINAL CATCH — triggers after MAX_ESCAPES
// ═══════════════════════════════════════════════════════════════════════════════
async function triggerFinalCatch() {
    if (!hayabusaModel || !chaseActive) return;
    chaseActive     = false;
    teleportPending = false;
    state.chasePause = true;

    gsap.killTweensOf(hayabusaModel.position);
    gsap.killTweensOf(hayabusaModel.rotation);
    gsap.killTweensOf(hayabusaModel.scale);

    if (state.claw) {
        const dir  = state.claw.position.clone().sub(hayabusaModel.position).normalize();
        const rotY = Math.atan2(dir.x, dir.z);
        await new Promise(r => {
            gsap.to(hayabusaModel.rotation, { y: rotY, duration: 0.4, ease: 'power2.out', onComplete: r });
        });
    }

    const catchMsg = "O-okay… you got me, Kagura~ 💙🌸";
    if (state.cameraMode === 'fpv') {
        showCharacterMessage('hayabusa', catchMsg, 4000);
    } else {
        showHayabusaMessage(catchMsg, 4000);
    }

    spawnPetalBurst(
        hayabusaModel.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
        60, '#aaddff'
    );

    await new Promise(r => setTimeout(r, 1000));

    const catchPos = hayabusaModel.position.clone();

    await new Promise(r => setTimeout(r, 1500));
    if (hayabusaModel) {
        gsap.to(hayabusaModel.scale, { x: 0, y: 0, z: 0, duration: 0.4, ease: 'power2.in',
            onComplete: () => {
                if (hayabusaModel) {
                    state.scene.remove(hayabusaModel);
                    hayabusaModel = null;
                }
            }
        });
    }

    if (bubble) { bubble.remove(); bubble = null; textEl = null; tailEl = null; }

    playFinalCatchSequence(catchPos);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TELEPORT
// ═══════════════════════════════════════════════════════════════════════════════
function performTeleport(newPos) {
    teleportPending = false;
    if (!hayabusaModel || !chaseActive) return;

    state.escapeCount++;
    updateEscapeCount(state.escapeCount);

    if (state.escapeCount >= MAX_ESCAPES) {
        triggerFinalCatch();
        return;
    }

    if (state.escapeCount >= MAX_ESCAPES - 5) {
        const nearEnd = nearEndDeck.drawNext();
        if (state.cameraMode === 'fpv') {
            showCharacterMessage('hayabusa', nearEnd.hayabusa, 3000);
        } else {
            showHayabusaMessage(nearEnd.hayabusa, 3000);
        }
        setTimeout(() => {
            if (!chaseActive) return;
            showCustomMessage(nearEnd.kagura, 'excited', 2800, 1500);
        }, 2000);
    }

    gsap.killTweensOf(hayabusaModel.position, 'y');
    gsap.killTweensOf(hayabusaModel.scale);

    gsap.timeline()
        .to(hayabusaModel.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.18, ease: 'power2.in' }, 0)
        .call(() => {
            hayabusaModel.position.set(newPos.x, hayabusaModel.userData.baseY, newPos.z);
            state.chaseTarget = newPos.clone();
        }, null, 0.18)
        .to(hayabusaModel.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(1.7)' }, 0.18)
        .call(() => {
            spawnPetalBurst(
                hayabusaModel.position.clone().add(new THREE.Vector3(0, 0.35, 0)),
                35, '#aa44ff'
            );
            startBaseBob();
            canTeleport = false;
            setTimeout(() => { canTeleport = true; }, TELEPORT_COOLDOWN);
        }, null, 0.48);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CLOSE ENCOUNTER DRAMA
// ═══════════════════════════════════════════════════════════════════════════════
async function triggerCloseEncounter() {
    if (!hayabusaModel || !chaseActive || teleportPending || !canTeleport) return;
    teleportPending = true;
    canTeleport     = false;

    state.chasePause = true;

    await new Promise(r => setTimeout(r, 800));
    if (!hayabusaModel || !chaseActive) { state.chasePause = false; return; }

    if (state.claw && hayabusaModel) {
        const dir  = state.claw.position.clone().sub(hayabusaModel.position).normalize();
        const rotY = Math.atan2(dir.x, dir.z);
        gsap.to(hayabusaModel.rotation, { y: rotY, duration: 0.3, ease: 'power2.out' });
    }

    const pair = dialogueDeck.drawNext();

    if (state.cameraMode === 'fpv') {
        showCharacterMessage('hayabusa', pair.hayabusa, 3500);
    } else {
        showHayabusaMessage(pair.hayabusa, 3500);
    }

    idleActionLock = true;
    setTimeout(async () => {
        if (!hayabusaModel || !chaseActive) { idleActionLock = false; return; }
        await idleWiggle();
        idleActionLock = false;
    }, 300);

    await new Promise(r => setTimeout(r, 2000));
    if (!hayabusaModel || !chaseActive) { state.chasePause = false; return; }

    if (state.cameraMode === 'fpv') {
        showCharacterMessage('kagura', pair.kagura, 3000);
    } else {
        showCustomMessage(pair.kagura, pair.kEmotion, 3000, 2000);
    }

    await new Promise(r => setTimeout(r, 1800));
    state.chasePause = false;

    if (!hayabusaModel || !chaseActive) return;

    const kaguraPos = state.claw?.position.clone() ?? new THREE.Vector3();
    let newPos;
    for (let i = 0; i < 40; i++) {
        const candidate = getRandomWalkablePosition();
        if (candidate.distanceTo(kaguraPos) > 5.0) { newPos = candidate; break; }
    }
    if (!newPos) newPos = getRandomWalkablePosition();

    performTeleport(newPos);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PER-FRAME TICK
// ═══════════════════════════════════════════════════════════════════════════════
function teleportCheck() {
    if (!chaseActive || !hayabusaModel || !state.claw || !canTeleport || teleportPending) return;
    const dist = state.claw.position.distanceTo(hayabusaModel.position);
    updateDistance(dist);
    if (dist < 3.0) triggerCloseEncounter();
}

function updateHayabusaFacing() {
    if (!hayabusaModel || !state.claw || teleportPending || state.chasePause) return;
    const target = state.claw.position.clone();
    target.y = hayabusaModel.position.y;
    const dir  = target.sub(hayabusaModel.position).normalize();
    if (dir.lengthSq() < 0.001) return;
    const desiredRotY = Math.atan2(dir.x, dir.z);
    let diff = desiredRotY - hayabusaModel.rotation.y;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const dist = state.claw.position.distanceTo(hayabusaModel.position);
    const lerpSpeed = dist < 6 ? 0.04 : 0.01;
    hayabusaModel.rotation.y += diff * lerpSpeed;
}

function chaseTick() {
    if (!chaseActive) return;
    teleportCheck();
    updateHayabusaFacing();
    updateHayabusaBubblePosition();
    teleportAnimId = requestAnimationFrame(chaseTick);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  START / STOP
// ═══════════════════════════════════════════════════════════════════════════════
export async function startHayabusaChase() {
    if (chaseActive) return;
    chaseActive = true;

    if (!hayabusaModel) {
        try {
            if (preloadedModel) {
                hayabusaModel  = preloadedModel;
                preloadedModel = null;
            } else if (preloadPromise) {
                hayabusaModel = await preloadPromise;
            } else {
                hayabusaModel = await loadModelFromDisk();
            }
            state.scene.add(hayabusaModel);
        } catch (e) {
            console.error('Hayabusa model load failed:', e);
            chaseActive = false;
            return;
        }
    }

    dialogueDeck.reset();
    idleThoughtDeck.reset();
    nearEndDeck.reset();

    state.escapeCount = 0;
    updateEscapeCount(0);

    const spawnPos = getRandomWalkablePosition();
    hayabusaModel.position.set(spawnPos.x, hayabusaModel.userData.baseY, spawnPos.z);
    hayabusaModel.visible  = true;
    state.chaseTarget      = spawnPos.clone();
    state.chasePause       = false;
    teleportPending        = false;
    canTeleport            = true;
    idleActionLock         = false;

    startBaseBob();

    if (state.cameraMode === 'fpv') {
        showCharacterMessage('hayabusa', HAYABUSA_FIRST, 3500);
    } else {
        showHayabusaMessage(HAYABUSA_FIRST, 3500);
    }
    setTimeout(() => {
        if (!chaseActive) return;
        if (state.cameraMode === 'fpv') {
            showCharacterMessage('kagura', KAGURA_FIRST, 3200);
        } else {
            showCustomMessage(KAGURA_FIRST, 'excited', 3200, 3500);
        }
    }, 3800);

    chaseTick();
    idleActionLoop();
    idleThoughtLoop();
}

export function stopHayabusaChase() {
    chaseActive       = false;
    state.chaseTarget = null;
    state.chasePause  = false;
    teleportPending   = false;
    idleActionLock    = false;

    if (teleportAnimId) { cancelAnimationFrame(teleportAnimId); teleportAnimId = null; }
    if (idleThoughtTimer) { clearTimeout(idleThoughtTimer); idleThoughtTimer = null; }
    if (idleActionTimer)  { clearTimeout(idleActionTimer);  idleActionTimer  = null; }
    if (typeTimer)         { clearTimeout(typeTimer);         typeTimer        = null; }
    if (hideTimer)         clearTimeout(hideTimer);

    if (hayabusaModel) {
        gsap.killTweensOf(hayabusaModel.position);
        gsap.killTweensOf(hayabusaModel.rotation);
        gsap.killTweensOf(hayabusaModel.scale);
    }

    if (bubble) { bubble.remove(); bubble = null; textEl = null; tailEl = null; }
    if (hayabusaModel) {
        state.scene.remove(hayabusaModel);
        hayabusaModel = null;
    }
}