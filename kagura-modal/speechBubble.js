import { state } from './state.js';

const messages = [
    "Hi, I am Kagura!",
    "Umbrella is my weapon.",
    "I love Cherry Blossom.",
    "Wisteria is my second favorite flower, if you don't know.",
    "The cherry petals are so beautiful today.",
    "Let's dance together!",
    "Have you seen my umbrella?",
    "I feel so alive under the blossoms.",
    "Night time is so peaceful.",
    "Birds are singing in the sky."
];

let bubble = null;
let messageTimer = null;

function createBubble() {
    const div = document.createElement('div');
    div.id = 'speechBubble';
    div.style.cssText = `
        position: absolute;
        background: rgba(255,255,255,0.9);
        color: #b30047;
        font-family: Quicksand, sans-serif;
        font-size: 0.7rem;
        padding: 0.3rem 0.7rem;
        border-radius: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        pointer-events: none;
        white-space: nowrap;
        z-index: 200;
        opacity: 0;
        transition: opacity 0.3s;
    `;
    // Append to the canvas wrapper so coordinates stay relative to it
    const wrapper = document.querySelector('.canvas-wrap');
    if (wrapper) {
        wrapper.appendChild(div);
    } else {
        document.body.appendChild(div);
    }
    return div;
}

function updateBubblePosition() {
    if (!bubble || !state.claw || !state.camera) return;

    const wrapper = document.querySelector('.canvas-wrap');
    if (!wrapper) return;

    // World position of the character’s head (slightly above base)
    const worldPos = state.claw.position.clone();
    worldPos.y += 0.9;   // just above head (was 1.4, now lower)

    // Project to screen
    const vector = worldPos.project(state.camera);
    if (vector.z > 1) {
        // Behind the camera – hide the bubble
        bubble.style.opacity = '0';
        return;
    }

    // Convert NDC (-1..1) to pixel coordinates inside the wrapper
    const rect = wrapper.getBoundingClientRect();
    const x = (vector.x * 0.5 + 0.5) * rect.width;
    const y = (-vector.y * 0.5 + 0.5) * rect.height;

    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
}

function cycleMessage() {
    if (!bubble) return;
    const msg = messages[Math.floor(Math.random() * messages.length)];
    bubble.textContent = msg;
    messageTimer = setTimeout(cycleMessage, 3000 + Math.random() * 2000);
}

export function showSpeechBubble() {
    if (!bubble) {
        bubble = createBubble();
    }
    bubble.style.opacity = '1';
    cycleMessage();
}

export function hideSpeechBubble() {
    if (bubble) {
        bubble.style.opacity = '0';
        if (messageTimer) {
            clearTimeout(messageTimer);
            messageTimer = null;
        }
    }
}

export function updateSpeechBubble() {
    if (bubble && bubble.style.opacity === '1') {
        updateBubblePosition();
    }
}