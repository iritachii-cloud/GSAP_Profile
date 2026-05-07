import * as THREE from 'three';
import { state } from './state.js';
import { getRandomWalkablePosition } from './aiMode.js';
import { spawnEnergyBurst } from './utils.js';
import { showCharacterBubble, hideAllBubbles, suppressIdleBubble, releaseIdleBubble } from './speechBubble.js';
import { showCharacterMessage } from './fpvHUD.js';
import {
    LAYLA_CHASE_NOLAN, LAYLA_CHASE_LILLIAN, LAYLA_CHASE_CLINT,
    LAYLA_CELEBRATION
} from './laylaDialogue.js';
import {
    NOLAN_IDLE, NOLAN_CHASE, NOLAN_FLEE, NOLAN_CAUGHT, NOLAN_SUGGEST_LILLIAN, NOLAN_CHEER
} from './nolan.js';
import {
    LILLIAN_IDLE, LILLIAN_CHASE, LILLIAN_FLEE, LILLIAN_CAUGHT, LILLIAN_CHEER
} from './lillian.js';
import {
    CLINT_IDLE, CLINT_CHASE, CLINT_FLEE, CLINT_CAUGHT
} from './clint.js';
import { stopNPCs, startNPCs } from './npcIdle.js';
import { setLaylaTarget, clearLaylaTarget } from './layla.js';

// ========== MODELS REFERENCE ==========
let activeNolan = null;
let activeLillian = null;
let activeClint = null;

let nolanIdleTween = null;
let lillianIdleTween = null;
let clintIdleTween = null;

let nolanChatTimer = null;
let lillianChatTimer = null;
let clintChatTimer = null;

let confettiInterval = null;
let pinFrameId = null;

// ========== UTILS ==========
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function faceToward(model, targetPos) {
    if (!model) return;
    const dx = targetPos.x - model.position.x;
    const dz = targetPos.z - model.position.z;
    model.rotation.y = Math.atan2(dx, dz);
}

function pinToGround(model) {
    if (model) model.position.y = model.userData?.baseY ?? 0;
}

function spawnCharacter(modelRef, pos) {
    const clone = modelRef.clone();
    clone.position.set(pos.x, modelRef.userData.baseY, pos.z);
    clone.userData.baseY = clone.position.y;
    state.scene.add(clone);
    return clone;
}

function removeCharacter(model) {
    if (model && model.parent) state.scene.remove(model);
}

function startPinLoop() {
    if (pinFrameId) return;
    function loop() {
        pinToGround(activeNolan);
        pinToGround(activeLillian);
        pinToGround(activeClint);
        if (activeNolan || activeLillian || activeClint) {
            pinFrameId = requestAnimationFrame(loop);
        } else {
            pinFrameId = null;
        }
    }
    pinFrameId = requestAnimationFrame(loop);
}

function stopPinLoop() {
    if (pinFrameId) { cancelAnimationFrame(pinFrameId); pinFrameId = null; }
}

function idleAnim(model, charName) {
    if (!model) return null;
    if (charName === 'nolan')
        return gsap.to(model.rotation, { y: '+=0.35', duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    else if (charName === 'lillian')
        return gsap.to(model.rotation, { z: 0.08, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    else // clint
        return gsap.to(model.rotation, { y: '+=0.8', duration: 0.6, yoyo: true, repeat: -1, ease: 'power1.inOut' });
}

function startIdleChat(charName, model, lines, intervalMin, intervalMax) {
    let idx = 0;
    function cycle() {
        if (!model || !model.parent || !state.familyActive) return null;
        const line = lines[idx % lines.length];
        idx++;
        showCharacterBubble(charName, model, line.text, line.emotion, 3000);
        return setTimeout(cycle, intervalMin + Math.random() * (intervalMax - intervalMin));
    }
    return setTimeout(cycle, 2000 + Math.random() * 1500);
}

function stopIdleChat(timer) {
    if (timer) clearTimeout(timer);
}

function celebrationBurst(model, color) {
    if (!model) return;
    spawnEnergyBurst(model.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 35, color);
    gsap.to(model.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.2, yoyo: true, repeat: 1 });
}

function fleeModel(model) {
    if (!model) return;
    const oldPos = model.position.clone();
    spawnEnergyBurst(oldPos.clone().add(new THREE.Vector3(0, 0.3, 0)), 12, '#ffcc88');
    const newPos = getRandomWalkablePosition();
    model.position.set(newPos.x, model.userData.baseY, newPos.z);
    spawnEnergyBurst(model.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 12, '#88aaff');
    faceToward(model, state.claw ? state.claw.position : new THREE.Vector3(0,0,0));
}

// ========== COUNTDOWN ==========
function showCountdown(from = 3) {
    return new Promise(resolve => {
        const wrap = document.querySelector('.canvas-wrap') || document.body;
        const div = document.createElement('div');
        Object.assign(div.style, {
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'Quicksand, monospace', fontSize: '5.5rem', fontWeight: '700',
            color: '#ffaa44', textShadow: '0 0 30px #ffaa44, 0 0 60px #ff6622',
            pointerEvents: 'none', zIndex: '500',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
        });
        wrap.appendChild(div);
        let n = from;
        function tick() {
            if (n <= 0) {
                div.textContent = 'GO! ⚡';
                div.style.color = '#ffcc88';
                div.style.textShadow = '0 0 30px #ffcc88, 0 0 60px #ff8800';
                div.style.fontSize = '4.5rem';
                setTimeout(() => {
                    div.style.opacity = '0';
                    setTimeout(() => { div.remove(); resolve(); }, 300);
                }, 700);
                return;
            }
            div.textContent = n;
            div.style.opacity = '1';
            div.style.transform = 'translate(-50%, -50%) scale(1.3)';
            setTimeout(() => {
                div.style.transform = 'translate(-50%, -50%) scale(0.85)';
                div.style.opacity = '0.6';
                setTimeout(() => { n--; tick(); }, 450);
            }, 550);
        }
        tick();
    });
}

// ========== CONFETTI ==========
function startConfetti() {
    stopConfetti();
    confettiInterval = setInterval(() => {
        for (let i = 0; i < 6; i++) spawnConfettiParticle();
    }, 80);
}

function stopConfetti() {
    if (confettiInterval) { clearInterval(confettiInterval); confettiInterval = null; }
}

function spawnConfettiParticle() {
    const wrap = document.querySelector('.canvas-wrap') || document.body;
    const div = document.createElement('div');
    const colors = ['#ffaa44','#ffcc88','#ff88dd','#66ffaa','#ffaaff','#ffffaa','#ffaacc'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 6 + Math.random() * 10;
    Object.assign(div.style, {
        position: 'absolute', width: `${size}px`, height: `${size}px`,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        background: color, left: `${Math.random() * 100}%`, top: '-10px',
        pointerEvents: 'none', zIndex: '499', opacity: '1',
    });
    wrap.appendChild(div);
    gsap.to(div, {
        y: wrap.clientHeight + 20, x: (Math.random() - 0.5) * 200,
        rotation: Math.random() * 720, opacity: 0,
        duration: 1.8 + Math.random() * 1.5, ease: 'power1.in',
        onComplete: () => div.remove(),
    });
}

// ========== MAIN CHASE SEQUENCE ==========
export async function startFamilyChase() {
    if (state.familyActive) return;
    state.familyActive = true;

    // Stop roaming NPCs
    stopNPCs();

    // Ensure family models are loaded
    if (!state.familyModels) {
        await preloadFamily();
    }

    try {
        await runNolanPhase();
        if (!state.familyActive) return;

        await runLillianPhase();
        if (!state.familyActive) return;

        await runClintPhase();
        if (!state.familyActive) return;

        await runFinalSequence();
    } catch (e) {
        console.warn('[FamilyChase] Narrative error:', e);
        stopFamilyChase();
    }
}

// ========== NOLAN PHASE (3 rounds) ==========
async function runNolanPhase() {
    await showCountdown(3);
    await wait(300);
    activeNolan = spawnCharacter(state.familyModels.nolan, pos);
setLaylaTarget(activeNolan.position); // <-- start walking

    showCharacterBubble('layla', state.claw, LAYLA_CHASE_NOLAN[0].onSummon.text, LAYLA_CHASE_NOLAN[0].onSummon.emotion, 3200);
    await wait(3500);

    for (let round = 0; round < 3; round++) {
        if (!state.familyActive) return;

        const pos = getRandomWalkablePosition();
        activeNolan = spawnCharacter(state.familyModels.nolan, pos);
        startPinLoop();
        nolanIdleTween = idleAnim(activeNolan, 'nolan');
        faceToward(activeNolan, state.claw.position);

        await wait(2500);

        const nolanGreet = NOLAN_CHASE[round % NOLAN_CHASE.length];
        showCharacterBubble('nolan', activeNolan, nolanGreet.text, nolanGreet.emotion, 3000);
        await wait(3000 + 500);

        nolanChatTimer = startIdleChat('nolan', activeNolan, NOLAN_IDLE, 5000, 9000);

        await waitUntilNear(activeNolan, 2.5);
        if (!state.familyActive) return;

        stopIdleChat(nolanChatTimer);
        await wait(2500);

        if (round < 2) {
            const fleeLine = NOLAN_FLEE[round % NOLAN_FLEE.length];
            showCharacterBubble('nolan', activeNolan, fleeLine.text, fleeLine.emotion, 2200);
            await wait(2500);
            fleeModel(activeNolan);

            showCharacterBubble('layla', state.claw, LAYLA_CHASE_NOLAN[(round + 1) * 2].onSummon.text, LAYLA_CHASE_NOLAN[(round + 1) * 2].onSummon.emotion, 2200);
            await wait(2500);

            if (nolanIdleTween) { nolanIdleTween.kill(); nolanIdleTween = null; }
            removeCharacter(activeNolan);
            activeNolan = null;
            await wait(2500);
        } else {
            celebrationBurst(activeNolan, '#aaffcc');
            const caught = NOLAN_CAUGHT[0];
            showCharacterBubble('nolan', activeNolan, caught.text, caught.emotion, 3200);
            await wait(3500);
            showCharacterBubble('layla', state.claw, LAYLA_CHASE_NOLAN[5].onCatch.text, LAYLA_CHASE_NOLAN[5].onCatch.emotion, 2800);
            await wait(3000);
            if (nolanIdleTween) { nolanIdleTween.kill(); nolanIdleTween = null; }
        }
    }
}

// ========== LILLIAN PHASE (3 rounds) ==========
async function runLillianPhase() {
    const suggest = NOLAN_SUGGEST_LILLIAN[0];
    showCharacterBubble('nolan', activeNolan, suggest.text, suggest.emotion, 3200);
    await wait(3500);
    showCharacterBubble('layla', state.claw, LAYLA_CHASE_LILLIAN[0].onSummon.text, LAYLA_CHASE_LILLIAN[0].onSummon.emotion, 2800);
    await wait(3000);

    for (let round = 0; round < 3; round++) {
        if (!state.familyActive) return;

        const pos = getRandomWalkablePosition();
        activeLillian = spawnCharacter(state.familyModels.lillian, pos);
        startPinLoop();
        lillianIdleTween = idleAnim(activeLillian, 'lillian');
        faceToward(activeLillian, state.claw.position);

        await wait(2500);

        const greet = LILLIAN_CHASE[round % LILLIAN_CHASE.length];
        showCharacterBubble('lillian', activeLillian, greet.text, greet.emotion, 3000);
        await wait(3500);

        lillianChatTimer = startIdleChat('lillian', activeLillian, LILLIAN_IDLE, 5000, 9000);

        await waitUntilNear(activeLillian, 2.5);
        if (!state.familyActive) return;

        stopIdleChat(lillianChatTimer);
        await wait(2500);

        if (round < 2) {
            const fleeLine = LILLIAN_FLEE[round % LILLIAN_FLEE.length];
            showCharacterBubble('lillian', activeLillian, fleeLine.text, fleeLine.emotion, 2200);
            await wait(2500);
            fleeModel(activeLillian);

            showCharacterBubble('layla', state.claw, LAYLA_CHASE_LILLIAN[(round + 1) * 2].onSummon.text, LAYLA_CHASE_LILLIAN[(round + 1) * 2].onSummon.emotion, 2200);
            await wait(2500);

            if (lillianIdleTween) { lillianIdleTween.kill(); lillianIdleTween = null; }
            removeCharacter(activeLillian);
            activeLillian = null;
            await wait(2500);
        } else {
            celebrationBurst(activeLillian, '#ffcc88');
            const caught = LILLIAN_CAUGHT[0];
            showCharacterBubble('lillian', activeLillian, caught.text, caught.emotion, 3000);
            await wait(3200);
            if (lillianIdleTween) { lillianIdleTween.kill(); lillianIdleTween = null; }
        }
    }

    await wait(700);
    showCharacterBubble('layla', state.claw, "We're all finally together… Dad, Mom – I need one more favour.", 'happy', 3000);
    await wait(3000 + 400);
    showCharacterBubble('nolan', activeNolan, "Anything for you, my little light! What do you need?", 'happy', 3000);
    await wait(3000 + 400);
    showCharacterBubble('lillian', activeLillian, "My sensors are detecting a familiar energy signature nearby~", 'techy', 2800);
    await wait(2800 + 400);
    showCharacterBubble('layla', state.claw, "It's Clint! Help me find him! 💙", 'excited', 2600);
    await wait(2600 + 400);
    showCharacterBubble('nolan', activeNolan, "That boyfriend of yours? Say no more – let's go!", 'excited', 2600);
    await wait(2600 + 400);
    showCharacterBubble('lillian', activeLillian, "I've got a lock on his energy trail already. This way!", 'determined', 2800);
    await wait(2800 + 800);
}

// ========== CLINT PHASE (7 rounds) ==========
async function runClintPhase() {
    for (let round = 0; round < 7; round++) {
        if (!state.familyActive) return;

        const pos = getRandomWalkablePosition();
        activeClint = spawnCharacter(state.familyModels.clint, pos);
        startPinLoop();
        clintIdleTween = idleAnim(activeClint, 'clint');
        faceToward(activeClint, state.claw.position);

        await wait(2500);

        const greet = CLINT_CHASE[round % CLINT_CHASE.length];
        showCharacterBubble('clint', activeClint, greet.text, greet.emotion, 3000);
        await wait(3500);

        clintChatTimer = startIdleChat('clint', activeClint, CLINT_IDLE, 4000, 7000);

        if (round > 0 && round % 2 === 1 && activeNolan) {
            const cheer = NOLAN_CHEER[round % NOLAN_CHEER.length];
            setTimeout(() => {
                if (activeNolan && state.familyActive) showCharacterBubble('nolan', activeNolan, cheer.text, cheer.emotion, 2500);
            }, 1800);
        }
        if (round > 0 && round % 2 === 0 && activeLillian) {
            const cheer = LILLIAN_CHEER[round % LILLIAN_CHEER.length];
            setTimeout(() => {
                if (activeLillian && state.familyActive) showCharacterBubble('lillian', activeLillian, cheer.text, cheer.emotion, 2500);
            }, 2200);
        }

        await waitUntilNear(activeClint, 2.5);
        if (!state.familyActive) return;

        stopIdleChat(clintChatTimer);
        await wait(2500);

        if (round < 6) {
            const fleeLine = CLINT_FLEE[round % CLINT_FLEE.length];
            showCharacterBubble('clint', activeClint, fleeLine.text, fleeLine.emotion, 2200);
            await wait(2500);
            fleeModel(activeClint);

            showCharacterBubble('layla', state.claw, LAYLA_CHASE_CLINT[(round + 1) * 2].onSummon.text, LAYLA_CHASE_CLINT[(round + 1) * 2].onSummon.emotion, 2200);
            await wait(2500);

            if (clintIdleTween) { clintIdleTween.kill(); clintIdleTween = null; }
            removeCharacter(activeClint);
            activeClint = null;
            await wait(2500);
        } else {
            celebrationBurst(activeClint, '#ffaaee');
            const caught = CLINT_CAUGHT[0];
            showCharacterBubble('clint', activeClint, caught.text, caught.emotion, 3200);
            await wait(3500);
            if (clintIdleTween) { clintIdleTween.kill(); clintIdleTween = null; }
        }
    }
}

// ========== FINAL SEQUENCE ==========
async function runFinalSequence() {
    const celebLine = LAYLA_CELEBRATION[0];
    showCharacterBubble('layla', state.claw, celebLine.text, celebLine.emotion, 3500);
    await wait(3500 + 500);
    showCharacterBubble('nolan', activeNolan, "Layla, you're our light. We'd chase you to the edge of the energy world~ 💙", 'happy', 3500);
    await wait(3500 + 400);
    showCharacterBubble('lillian', activeLillian, "My sensors confirm: this family's happiness rating is astronomically off the charts! ⚡", 'techy', 3200);
    await wait(3200 + 400);
    showCharacterBubble('clint', activeClint, "I guess I'm officially part of the family now? I absolutely take it! 😍", 'flirty', 3200);
    await wait(3200 + 400);
    showCharacterBubble('layla', state.claw, "You always were, silly. Now stay still so I can hug you all! 🌟", 'happy', 3500);
    await wait(3500 + 700);

    if (state.claw)    spawnEnergyBurst(state.claw.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 80, '#ffaaee');
    if (activeNolan)   spawnEnergyBurst(activeNolan.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 40, '#aaffcc');
    if (activeLillian) spawnEnergyBurst(activeLillian.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 40, '#ffcc88');
    if (activeClint)   spawnEnergyBurst(activeClint.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 40, '#ffaaff');

    startConfetti();
    await wait(3500);
    stopConfetti();

    showCharacterBubble('nolan', activeNolan, "Who's hungry? Dad's buying! Ice cream for everyone! 🍦", 'excited', 2800);
    await wait(2800 + 400);
    showCharacterBubble('lillian', activeLillian, "I'm already calculating the optimal ice cream route. Let's go.", 'techy', 2800);
    await wait(2800 + 400);
    showCharacterBubble('clint', activeClint, "Ice cream AND a family selfie. This is the perfect ending. 📸", 'playful', 2800);
    await wait(2800 + 400);
    showCharacterBubble('layla', state.claw, "I love you all so much. Let's go! ⚡💙", 'peaceful', 3200);
    await wait(3200 + 800);

    await runResetSequence();
}

async function runResetSequence() {
    [activeNolan, activeLillian, activeClint].filter(Boolean).forEach(model => {
        model.traverse(obj => {
            if (obj.isMesh && obj.material) {
                obj.material.transparent = true;
                gsap.to(obj.material, { opacity: 0, duration: 3.5, ease: 'power2.in' });
            }
        });
    });

    if (state.claw) {
        const base = state.claw.userData.baseY;
        gsap.to(state.claw.position, { x: 0, y: base, z: 0, duration: 4.5, ease: 'power2.inOut' });
        gsap.to(state.claw.rotation, { y: `+=${Math.PI * 2}`, duration: 4.5, ease: 'none' });
    }

    await wait(4500);

    hideAllBubbles();
    [activeNolan, activeLillian, activeClint].filter(Boolean).forEach(m => removeCharacter(m));
    activeNolan = activeLillian = activeClint = null;
    stopFamilyChase();
}

export function stopFamilyChase() {
    state.familyActive = false;
    stopPinLoop();
    stopConfetti();

    nolanChatTimer = stopIdleChat(nolanChatTimer);
    lillianChatTimer = stopIdleChat(lillianChatTimer);
    clintChatTimer = stopIdleChat(clintChatTimer);

    if (nolanIdleTween)   { nolanIdleTween.kill();   nolanIdleTween = null; }
    if (lillianIdleTween) { lillianIdleTween.kill(); lillianIdleTween = null; }
    if (clintIdleTween)   { clintIdleTween.kill();   clintIdleTween = null; }

    if (activeNolan)   { removeCharacter(activeNolan);   activeNolan = null; }
    if (activeLillian) { removeCharacter(activeLillian); activeLillian = null; }
    if (activeClint)   { removeCharacter(activeClint);   activeClint = null; }

    hideAllBubbles();
    releaseIdleBubble();

    // Restart NPC roaming
    import('./npcIdle.js').then(m => m.startNPCs()).catch(() => {});
}

// ========== PRELOAD FAMILY (with model storage) ==========
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const FAMILY_SCALE_TARGET = 1.0;
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' });
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

let models = { nolan: null, lillian: null, clint: null };
let preloadPromise = null;

function createPlaceholderModel(color) {
    const geometry = new THREE.BoxGeometry(0.4, FAMILY_SCALE_TARGET, 0.4);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.position.y = FAMILY_SCALE_TARGET / 2;
    cube.userData.baseY = FAMILY_SCALE_TARGET / 2;
    return cube;
}

function loadModel(url, fallbackColor) {
    return new Promise((resolve) => {
        loader.load(url, (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = FAMILY_SCALE_TARGET / maxDim;
            model.scale.setScalar(scale);
            const box2 = new THREE.Box3().setFromObject(model);
            model.position.y -= box2.min.y;
            model.userData.baseY = model.position.y;
            model.traverse(obj => {
                if (obj.isMesh) {
                    obj.castShadow = obj.receiveShadow = true;
                    if (obj.material) obj.material.roughness = 0.5;
                }
            });
            resolve(model);
        }, undefined, (err) => {
            console.warn(`Failed to load ${url}, using fallback.`, err);
            resolve(createPlaceholderModel(fallbackColor));
        });
    });
}

export function preloadFamily(onProgress, onDone) {
    if (preloadPromise) { if (onDone) preloadPromise.then(onDone); return; }
    preloadPromise = Promise.all([
        loadModel('models/nolan.glb',   0xffaa66),
        loadModel('models/lillian.glb', 0xff88aa),
        loadModel('models/clint.glb',   0xaaffaa),
    ]).then(([nolan, lillian, clint]) => {
        models = { nolan, lillian, clint };
        state.familyModels = models;
        if (onDone) onDone();
    }).catch(err => {
        console.warn('Family preload error, using placeholders:', err);
        models = {
            nolan:   createPlaceholderModel(0xffaa66),
            lillian: createPlaceholderModel(0xff88aa),
            clint:   createPlaceholderModel(0xaaffaa),
        };
        state.familyModels = models;
        if (onDone) onDone();
    });
}

// ========== PROXIMITY HELPER ==========
function waitUntilNear(model, radius = 2.5) {
    return new Promise(resolve => {
        function check() {
            if (!state.familyActive) { resolve(); return; }
            if (state.claw && model) {
                const dx = state.claw.position.x - model.position.x;
                const dz = state.claw.position.z - model.position.z;
                if (Math.sqrt(dx*dx + dz*dz) < radius) { resolve(); return; }
            }
            setTimeout(check, 150);
        }
        check();
    });
}