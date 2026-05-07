import { state } from './state.js';
import { showIdleThought, clearIdleThought } from './fpvHUD.js';
import { LAYLA_IDLE_DAY, LAYLA_IDLE_NIGHT } from './laylaDialogue.js';

// ========== EMOTION STYLES ==========
const emotionStyle = {
    happy:      { bg: 'rgba(20,30,50,0.85)', border: '#88ccff', color: '#cceeff', glow: '#88aaff' },
    excited:    { bg: 'rgba(40,20,10,0.85)', border: '#ffaa66', color: '#ffddcc', glow: '#ffaa66' },
    curious:    { bg: 'rgba(10,20,40,0.85)', border: '#aaccff', color: '#ddeeff', glow: '#aaccff' },
    peaceful:   { bg: 'rgba(10,30,20,0.85)', border: '#66ffaa', color: '#ddffee', glow: '#66ffaa' },
    playful:    { bg: 'rgba(30,10,40,0.85)', border: '#ff88dd', color: '#ffccff', glow: '#ff88dd' },
    flirty:     { bg: 'rgba(40,10,30,0.85)', border: '#ff99cc', color: '#ffddee', glow: '#ff99cc' },
    protective: { bg: 'rgba(10,10,40,0.85)', border: '#aaaaff', color: '#ddddff', glow: '#aaaaff' },
    worried:    { bg: 'rgba(30,20,10,0.85)', border: '#ffaa88', color: '#ffeedd', glow: '#ffaa88' },
    annoyed:    { bg: 'rgba(40,10,10,0.85)', border: '#ff8888', color: '#ffdddd', glow: '#ff8888' },
    techy:      { bg: 'rgba(0,30,30,0.85)', border: '#44cccc', color: '#ccffff', glow: '#44cccc' },
    proud:      { bg: 'rgba(30,30,10,0.85)', border: '#cccc66', color: '#ffffdd', glow: '#cccc66' },
    embarrassed:{ bg: 'rgba(30,15,15,0.85)', border: '#ffaaaa', color: '#ffe0e0', glow: '#ffaaaa' },
    determined: { bg: 'rgba(15,15,35,0.85)', border: '#9999ff', color: '#ddddff', glow: '#9999ff' },
    cheeky:     { bg: 'rgba(35,25,10,0.85)', border: '#ffcc88', color: '#ffeedd', glow: '#ffcc88' },
};

// ========== SHUFFLE DECK ==========
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
const dayDeck   = createDeck(LAYLA_IDLE_DAY);
const nightDeck = createDeck(LAYLA_IDLE_NIGHT);
function pickMessage() {
    return (state.timeOfDay === 'night' ? nightDeck : dayDeck).drawNext();
}

// ========== BUBBLE MANAGEMENT ==========
const bubbles = {}; // charName -> DOM element

function createBubbleElement() {
    const wrap = document.querySelector('.canvas-wrap') || document.body;
    const div = document.createElement('div');
    div.className = 'char-bubble';
    Object.assign(div.style, {
        position: 'absolute',
        maxWidth: '200px',
        minWidth: '80px',
        padding: '0.3rem 0.8rem',
        borderRadius: '4px',
        border: '2px solid #88aaff',
        background: 'rgba(10,15,25,0.88)',
        boxShadow: '0 0 15px rgba(100,150,255,0.4), inset 0 0 5px rgba(100,150,255,0.2)',
        fontFamily: '"Quicksand", monospace',
        fontSize: '0.62rem',
        fontWeight: '600',
        lineHeight: '1.4',
        color: '#cceeff',
        pointerEvents: 'none',
        zIndex: '200',
        opacity: '0',
        transform: 'translateX(-50%) translateY(-100%) scale(0.85)',
        transformOrigin: 'bottom center',
        transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.4,0.64,1)',
        whiteSpace: 'normal',
        textAlign: 'center',
        willChange: 'transform, opacity',
        clipPath: 'polygon(0% 8px, 8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%)',
    });
    const textEl = document.createElement('span');
    div.appendChild(textEl);
    div._textEl = textEl;
    div._hideTimer = null;
    wrap.appendChild(div);
    return div;
}

function getBubbleFor(charName) {
    if (!bubbles[charName]) {
        bubbles[charName] = createBubbleElement();
    }
    return bubbles[charName];
}

function applyEmotion(bubble, emotion) {
    const s = emotionStyle[emotion] || emotionStyle.happy;
    bubble.style.background = s.bg;
    bubble.style.borderColor = s.border;
    bubble.style.color = s.color;
    bubble.style.boxShadow = `0 0 15px ${s.glow}66, inset 0 0 5px ${s.glow}33`;
}

function popIn(bubble) {
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(1)';
}

function popOut(bubble) {
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(0.85)';
}

function positionBubbleAbove(bubble, model) {
    if (!model || !state.camera) return;
    const wrapper = document.querySelector('.canvas-wrap');
    if (!wrapper) return;

    const worldPos = model.position.clone();
    worldPos.y += (model.userData?.baseY ?? 0) + 1.0;
    const vector = worldPos.project(state.camera);
    if (vector.z > 1) {
        bubble.style.opacity = '0';
        return;
    }
    const rect = wrapper.getBoundingClientRect();
    const x = (vector.x * 0.5 + 0.5) * rect.width;
    const y = (vector.y * -0.5 + 0.5) * rect.height;
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;

    const half = bubble.offsetWidth / 2;
    const clampedX = Math.max(half + 8, Math.min(rect.width - half - 8, x));
    if (clampedX !== x) {
        bubble.style.left = `${clampedX}px`;
    }
}

/**
 * Show a message near a specific 3D model.
 * @param {string} charName - 'layla', 'nolan', 'lillian', 'clint'
 * @param {THREE.Object3D} model - the 3D object
 * @param {string} text - message
 * @param {string} emotion - emotion key
 * @param {number} holdMs - display duration
 */
export function showCharacterBubble(charName, model, text, emotion = 'happy', holdMs = 3500) {
    const bubble = getBubbleFor(charName);
    clearTimeout(bubble._hideTimer);
    applyEmotion(bubble, emotion);
    bubble._textEl.textContent = text;
    bubble._model = model;               // store model reference for repositioning
    positionBubbleAbove(bubble, model);
    popIn(bubble);
    bubble._hideTimer = setTimeout(() => {
        popOut(bubble);
        bubble._active = false;
    }, holdMs);
    bubble._active = true;
}

export function hideCharacterBubble(charName) {
    const bubble = bubbles[charName];
    if (bubble) {
        clearTimeout(bubble._hideTimer);
        popOut(bubble);
        bubble._active = false;
    }
}

// ========== LAYLA IDLE CYCLE ==========
let laylaIdleVisible = false;
let laylaIdleTimer = null;
let typeTimer = null;
const IDLE_MIN_GAP = 6000;
const IDLE_MAX_GAP = 12000;

function typeWriteIdle(bubble, text, onDone) {
    if (typeTimer) clearTimeout(typeTimer);
    bubble._textEl.textContent = '';
    let i = 0;
    function tick() {
        if (!laylaIdleVisible) return;
        bubble._textEl.textContent = text.slice(0, i + 1);
        i++;
        if (i < text.length) {
            const ch = text[i - 1];
            const delay = /[.,!?…~<>]/.test(ch) ? 110 + Math.random() * 70 : 26 + Math.random() * 20;
            typeTimer = setTimeout(tick, delay);
        } else {
            if (onDone) onDone();
        }
    }
    typeTimer = setTimeout(tick, 30);
}

function scheduleNextLaylaIdle() {
    if (!laylaIdleVisible) return;
    const now = Date.now();
    const baseGap = IDLE_MIN_GAP + Math.random() * (IDLE_MAX_GAP - IDLE_MIN_GAP);
    const fireAt = Math.max(now + baseGap, _customEndTime + IDLE_MIN_GAP);
    const delay = fireAt - now;
    laylaIdleTimer = setTimeout(cycleLaylaIdle, delay);
}

function cycleLaylaIdle() {
    if (!laylaIdleVisible || !state.claw) return;
    if (customMessageActive) {
        scheduleNextLaylaIdle();
        return;
    }
    if (state.cameraMode === 'fpv') {
        const { text, emotion } = pickMessage();
        showIdleThought(text, 4500, emotion);
        laylaIdleTimer = setTimeout(cycleLaylaIdle, 4500 + IDLE_MIN_GAP + Math.random() * 4000);
        return;
    }
    const bubble = getBubbleFor('layla');
    const { text, emotion } = pickMessage();
    applyEmotion(bubble, emotion);
    popIn(bubble);
    typeWriteIdle(bubble, text, () => {
        if (!laylaIdleVisible || customMessageActive) return;
        const hold = 2800 + text.length * 32 + Math.random() * 1200;
        laylaIdleTimer = setTimeout(() => {
            if (!laylaIdleVisible) return;
            popOut(bubble);
            scheduleNextLaylaIdle();
        }, hold);
    });
}

export function showSpeechBubble() {
    laylaIdleVisible = true;
    customMessageActive = false;
    _customEndTime = 0;
    clearTimeout(laylaIdleTimer);
    laylaIdleTimer = setTimeout(cycleLaylaIdle, 2000 + Math.random() * 2000);
}

export function hideSpeechBubble() {
    laylaIdleVisible = false;
    clearTimeout(laylaIdleTimer);
    const bubble = bubbles['layla'];
    if (bubble) popOut(bubble);
    clearIdleThought();
}

// ========== CUSTOM MESSAGE ==========
let customMessageActive = false;
let _customEndTime = 0;
let postCustomTimer = null;

/**
 * Show a custom message for any character.
 * For 'layla', if no model is provided, uses state.claw.
 */
export function showCustomMessage(charName, model, text, emotion = 'happy', holdMs = 3500, postDelay = 4000) {
    if (charName === 'layla' && !laylaIdleVisible) return;
    customMessageActive = true;
    clearTimeout(laylaIdleTimer);
    _customEndTime = Date.now() + holdMs + postDelay;

    if (charName === 'layla' && state.cameraMode === 'fpv') {
        import('./fpvHUD.js').then(m => {
            m.showCharacterMessage('layla', text, holdMs);
        });
        postCustomTimer = setTimeout(() => {
            customMessageActive = false;
            if (laylaIdleVisible) scheduleNextLaylaIdle();
        }, holdMs + postDelay);
        return;
    }

    // Determine model
    const targetModel = (charName === 'layla') ? state.claw : model;
    if (!targetModel) return;

    showCharacterBubble(charName, targetModel, text, emotion, holdMs);

    postCustomTimer = setTimeout(() => {
        customMessageActive = false;
        if (charName === 'layla' && laylaIdleVisible) scheduleNextLaylaIdle();
    }, holdMs + postDelay);
}

// ========== UPDATE LOOP ==========
export function updateSpeechBubble() {
    for (const [charName, bubble] of Object.entries(bubbles)) {
        if (bubble._active && bubble._model) {
            positionBubbleAbove(bubble, bubble._model);
        }
    }
}

// ========== SUPPRESSION API ==========
let _suppressCount = 0;

export function suppressIdleBubble() {
    _suppressCount++;
    customMessageActive = true;
    clearTimeout(laylaIdleTimer);
    const bubble = bubbles['layla'];
    if (bubble && bubble._active) popOut(bubble);
    clearIdleThought();
}

export function releaseIdleBubble() {
    _suppressCount = Math.max(0, _suppressCount - 1);
    if (_suppressCount > 0) return;
    customMessageActive = false;
    _customEndTime = 0;
    if (laylaIdleVisible) scheduleNextLaylaIdle();
}

// ========== HIDE ALL ==========
export function hideAllBubbles() {
    for (const bubble of Object.values(bubbles)) {
        clearTimeout(bubble._hideTimer);
        popOut(bubble);
        bubble._active = false;
    }
}