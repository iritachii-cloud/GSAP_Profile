import * as THREE from 'three';
import { state } from './state.js';
import { getRandomWalkablePosition, isBlocked } from './aiMode.js';
import { showCharacterBubble, hideAllBubbles } from './speechBubble.js';
import { preloadFamily } from './familyChase.js';
import { LAYLA_GREETINGS, LAYLA_FAREWELL } from './laylaDialogue.js';
import {
    NOLAN_IDLE, NOLAN_GREETINGS, NOLAN_FAREWELL
} from './nolan.js';
import {
    LILLIAN_IDLE, LILLIAN_GREETINGS, LILLIAN_FAREWELL
} from './lillian.js';
import {
    CLINT_IDLE, CLINT_GREETINGS, CLINT_FAREWELL
} from './clint.js';

// ---------- NPC STATE ----------
const NPC_SPEED = 1.8;
const INTERACT_DISTANCE = 3.5;
const MOVE_PAUSE_AFTER_INTERACT = 2.5; // seconds
const IDLE_CHAT_MIN = 6000;
const IDLE_CHAT_MAX = 14000;

let npcs = [];
let interactionMap = new Map(); // key: "a-b"

// ---------- INITIALISE ----------
export async function startNPCs() {
    if (npcs.length > 0) return; // already running

    await preloadFamily(); // ensure models loaded

    const defs = [
        { name: 'nolan',   modelKey: 'nolan',   idleLines: NOLAN_IDLE,   greetings: NOLAN_GREETINGS,   farewell: NOLAN_FAREWELL },
        { name: 'lillian', modelKey: 'lillian', idleLines: LILLIAN_IDLE, greetings: LILLIAN_GREETINGS, farewell: LILLIAN_FAREWELL },
        { name: 'clint',   modelKey: 'clint',   idleLines: CLINT_IDLE,   greetings: CLINT_GREETINGS,   farewell: CLINT_FAREWELL },
    ];

    defs.forEach((def) => {
        const baseModel = state.familyModels?.[def.modelKey];
        if (!baseModel) return;
        const model = baseModel.clone();
        const pos = getRandomWalkablePosition();
        model.position.set(pos.x, baseModel.userData.baseY ?? 0, pos.z);
        state.scene.add(model);

        const npc = {
            name: def.name,
            model,
            state: 'idle',
            target: pos.clone(),
            idleChatTimer: null,
            idleLines: def.idleLines,
            greetings: def.greetings,
            farewell: def.farewell,
        };

        npcs.push(npc);
        scheduleIdleChat(npc);
    });
}

export function stopNPCs() {
    npcs.forEach(npc => {
        clearTimeout(npc.idleChatTimer);
        if (npc.model.parent) state.scene.remove(npc.model);
    });
    npcs = [];
    interactionMap.clear();
}

// ---------- UPDATE (call every frame) ----------
export function updateNPCs(delta) {
    if (state.familyActive) return;

    const now = Date.now();

    // Move each NPC
    npcs.forEach(npc => {
        if (npc.state === 'interacting') return;

        const distToTarget = npc.model.position.distanceTo(npc.target);
        if (distToTarget > 0.3) {
            npc.state = 'walking';
            const dir = npc.target.clone().sub(npc.model.position).normalize();
            const speed = NPC_SPEED * delta;
            const moveVec = dir.clone().multiplyScalar(speed);
            const newPos = npc.model.position.clone().add(moveVec);
            if (!isBlocked(newPos.x, newPos.z)) {
                npc.model.position.copy(newPos);
                npc.model.rotation.y = Math.atan2(dir.x, dir.z);
            } else {
                npc.target = getRandomWalkablePosition();
            }
        } else {
            npc.state = 'idle';
            if (Math.random() < 0.02) {
                npc.target = getRandomWalkablePosition();
            }
        }
    });

    // Check for interactions
    for (let i = 0; i < npcs.length; i++) {
        for (let j = i + 1; j < npcs.length; j++) {
            const a = npcs[i];
            const b = npcs[j];
            if (a.state === 'interacting' || b.state === 'interacting') continue;
            const dist = a.model.position.distanceTo(b.model.position);
            if (dist < INTERACT_DISTANCE) {
                const key = `${a.name}-${b.name}`;
                if (interactionMap.has(key)) continue;
                interactionMap.set(key, true);
                startInteraction(a, b, key);
            }
        }
    }
}

// ---------- INTERACTION ----------
async function startInteraction(npcA, npcB, key) {
    npcA.state = 'interacting';
    npcB.state = 'interacting';
    clearTimeout(npcA.idleChatTimer);
    clearTimeout(npcB.idleChatTimer);

    // Face each other
    const dirA = npcB.model.position.clone().sub(npcA.model.position).normalize();
    npcA.model.rotation.y = Math.atan2(dirA.x, dirA.z);
    const dirB = npcA.model.position.clone().sub(npcB.model.position).normalize();
    npcB.model.rotation.y = Math.atan2(dirB.x, dirB.z);

    // Exchange greetings
    const greetA = npcA.greetings?.[npcB.name] || { text: "Hey!", emotion: 'happy' };
    const greetB = npcB.greetings?.[npcA.name] || { text: "Hi there!", emotion: 'happy' };
    showCharacterBubble(npcA.name, npcA.model, greetA.text, greetA.emotion, 3000);
    await wait(1500);
    showCharacterBubble(npcB.name, npcB.model, greetB.text, greetB.emotion, 3000);
    await wait(1500);

    // Chat back and forth (pick 2 random lines each)
    const chatA = pickRandomLines(npcA.idleLines, 2);
    const chatB = pickRandomLines(npcB.idleLines, 2);
    const exchanges = Math.min(chatA.length, chatB.length);
    for (let i = 0; i < exchanges; i++) {
        showCharacterBubble(npcA.name, npcA.model, chatA[i].text, chatA[i].emotion, 3500);
        await wait(1500);
        showCharacterBubble(npcB.name, npcB.model, chatB[i].text, chatB[i].emotion, 3500);
        await wait(1500);
        if (state.familyActive) break;
    }

    // Farewell
    const byeA = npcA.farewell?.[npcB.name] || { text: "See ya!", emotion: 'happy' };
    const byeB = npcB.farewell?.[npcA.name] || { text: "Bye!", emotion: 'happy' };
    showCharacterBubble(npcA.name, npcA.model, byeA.text, byeA.emotion, 2500);
    await wait(1500);
    showCharacterBubble(npcB.name, npcB.model, byeB.text, byeB.emotion, 2500);
    await wait(MOVE_PAUSE_AFTER_INTERACT * 1000);

    interactionMap.delete(key);
    npcA.state = 'idle';
    npcB.state = 'idle';
    npcA.target = getRandomWalkablePosition();
    npcB.target = getRandomWalkablePosition();
    scheduleIdleChat(npcA);
    scheduleIdleChat(npcB);
}

function pickRandomLines(pool, count) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

function scheduleIdleChat(npc) {
    if (npc.idleChatTimer) clearTimeout(npc.idleChatTimer);
    const delay = IDLE_CHAT_MIN + Math.random() * (IDLE_CHAT_MAX - IDLE_CHAT_MIN);
    npc.idleChatTimer = setTimeout(() => {
        if (npc.state === 'interacting' || !npc.model.parent) return;
        if (npc.idleLines.length === 0) return;
        const line = npc.idleLines[Math.floor(Math.random() * npc.idleLines.length)];
        showCharacterBubble(npc.name, npc.model, line.text, line.emotion, 3500);
        scheduleIdleChat(npc);
    }, delay);
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}