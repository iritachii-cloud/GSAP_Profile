import { state } from './state.js';

// ---- DOM ----
let container = null;
let thoughtBox = null;          // top‑right idle thought
let thoughtTextEl = null;
let chatStack = null;           // bottom‑left (other characters)
let myMessageBox = null;        // bottom‑right (current character)
let myMessageTextEl = null;
let distanceBar = null;
let distanceTextEl = null;
let statsBox = null;
let visible = false;

// ---- TRACKING ----
let currentFPVChar = 'layla';   // who we are currently viewing
const targetDistance = { value: 99 }; // placeholder, updated from outside

// ---- EMOTIONS ----
const emotionStyle = {
    happy:      { bg: 'rgba(20,30,50,0.92)', border: '#88ccff', color: '#cceeff', glow: '#88aaff' },
    excited:    { bg: 'rgba(40,20,10,0.92)', border: '#ffaa66', color: '#ffddcc', glow: '#ffaa66' },
    curious:    { bg: 'rgba(10,20,40,0.92)', border: '#aaccff', color: '#ddeeff', glow: '#aaccff' },
    peaceful:   { bg: 'rgba(10,30,20,0.92)', border: '#66ffaa', color: '#ddffee', glow: '#66ffaa' },
    playful:    { bg: 'rgba(30,10,40,0.92)', border: '#ff88dd', color: '#ffccff', glow: '#ff88dd' },
    flirty:     { bg: 'rgba(40,10,30,0.92)', border: '#ff99cc', color: '#ffddee', glow: '#ff99cc' },
    protective: { bg: 'rgba(10,10,40,0.92)', border: '#aaaaff', color: '#ddddff', glow: '#aaaaff' },
    worried:    { bg: 'rgba(30,20,10,0.92)', border: '#ffaa88', color: '#ffeedd', glow: '#ffaa88' },
    annoyed:    { bg: 'rgba(40,10,10,0.92)', border: '#ff8888', color: '#ffdddd', glow: '#ff8888' },
    techy:      { bg: 'rgba(0,30,30,0.92)', border: '#44cccc', color: '#ccffff', glow: '#44cccc' },
    proud:      { bg: 'rgba(30,30,10,0.92)', border: '#cccc66', color: '#ffffdd', glow: '#cccc66' },
    embarrassed:{ bg: 'rgba(30,15,15,0.92)', border: '#ffaaaa', color: '#ffe0e0', glow: '#ffaaaa' },
    determined: { bg: 'rgba(15,15,35,0.92)', border: '#9999ff', color: '#ddddff', glow: '#9999ff' },
    cheeky:     { bg: 'rgba(35,25,10,0.92)', border: '#ffcc88', color: '#ffeedd', glow: '#ffcc88' },
};

// ---- HELPERS ----
function createEl(tag, styles) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    return el;
}

function applyBoxEmotion(box, emotion) {
    const s = emotionStyle[emotion] || emotionStyle.happy;
    box.style.background = s.bg;
    box.style.borderColor = s.border;
    box.style.color = s.color;
    box.style.boxShadow = `0 0 15px ${s.glow}66, inset 0 0 5px ${s.glow}33`;
}

// ---- BUILD ----
function buildHUD() {
    if (container) return;
    const wrap = document.querySelector('.canvas-wrap') || document.body;

    container = createEl('div', {
        position: 'absolute', inset: '0', pointerEvents: 'none',
        zIndex: '300', fontFamily: '"Quicksand", monospace',
        color: '#fff', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '1rem', boxSizing: 'border-box',
    });
    wrap.appendChild(container);

    // --- TOP ROW: distance + right thought ---
    const topRow = createEl('div', {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: '1rem',
    });
    container.appendChild(topRow);

    // Distance tracker (top left-ish)
    statsBox = createEl('div', {
        display: 'flex', flexDirection: 'column', gap: '0.4rem',
        padding: '0.5rem 0.8rem', background: 'rgba(10,15,25,0.92)',
        borderRadius: '4px', border: '1px solid #ffaa44',
        boxShadow: '0 0 10px rgba(255,170,68,0.3)',
        width: '180px', flexShrink: '0',
    });
    const barWrap = createEl('div', {
        width: '100%', height: '14px', background: 'rgba(255,255,255,0.08)',
        borderRadius: '2px', overflow: 'hidden', border: '1px solid #ff8844',
    });
    distanceBar = createEl('div', {
        width: '0%', height: '100%',
        background: 'linear-gradient(90deg, #ff6622, #ffaa44)',
        borderRadius: '2px', transition: 'width 0.4s ease',
        boxShadow: '0 0 8px #ff8844',
    });
    barWrap.appendChild(distanceBar);
    statsBox.appendChild(barWrap);
    distanceTextEl = createEl('div', {
        fontSize: '0.8rem', color: '#ffcc88', textAlign: 'center',
        fontFamily: '"Quicksand", monospace',
    });
    distanceTextEl.textContent = '99 m';
    statsBox.appendChild(distanceTextEl);
    topRow.appendChild(statsBox);

    // Thought bubble (top right)
    thoughtBox = createEl('div', {
        padding: '0.45rem 0.85rem', background: 'rgba(10,15,25,0.92)',
        borderRadius: '4px', border: '2px solid #88aaff',
        color: '#cceeff', fontSize: '0.85rem', fontWeight: '600',
        lineHeight: '1.4', opacity: '0', transform: 'translateY(-10px) scale(0.88)',
        transformOrigin: 'top right',
        transition: 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.28,0.64,1)',
        wordBreak: 'break-word', maxWidth: '280px', flex: '1',
        clipPath: 'polygon(0% 8px, 8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%)',
    });
    thoughtTextEl = document.createElement('span');
    thoughtBox.appendChild(thoughtTextEl);
    topRow.appendChild(thoughtBox);

    // --- BOTTOM ROW: chat stack (left) + own message (right) ---
    const bottomRow = createEl('div', {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        gap: '1rem',
    });
    container.appendChild(bottomRow);

    // Chat stack (bottom left) – other characters' messages stack up
    chatStack = createEl('div', {
        display: 'flex', flexDirection: 'column-reverse', gap: '0.35rem',
        maxWidth: '320px', flex: '1', overflowY: 'auto', maxHeight: '180px',
        paddingRight: '0.3rem',
    });
    bottomRow.appendChild(chatStack);

    // My message box (bottom right) – current character's own message
    myMessageBox = createEl('div', {
        maxWidth: '280px', minWidth: '140px',
        padding: '0.5rem 0.7rem', background: 'rgba(10,15,25,0.92)',
        border: '2px solid #88aaff', borderRadius: '4px',
        opacity: '0', transform: 'translateY(12px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        wordBreak: 'break-word',
        clipPath: 'polygon(0% 8px, 8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%)',
    });
    myMessageTextEl = document.createElement('span');
    myMessageBox.appendChild(myMessageTextEl);
    bottomRow.appendChild(myMessageBox);
}

// ---- PUBLIC API ----
export function showFPVHUD() {
    buildHUD();
    visible = true;
    if (container) container.style.display = 'flex';
}

export function hideFPVHUD() {
    visible = false;
    if (container) container.style.display = 'none';
    // Clear chat stack
    if (chatStack) chatStack.innerHTML = '';
    if (thoughtBox) {
        thoughtBox.style.opacity = '0';
        thoughtBox.style.transform = 'translateY(-10px) scale(0.88)';
    }
    if (myMessageBox) {
        myMessageBox.style.opacity = '0';
        myMessageBox.style.transform = 'translateY(12px)';
    }
}

/**
 * Show an idle thought in the top‑right bubble.
 * @param {string} text
 * @param {number} holdMs
 * @param {string} emotion
 */
export function showIdleThought(text, holdMs = 4000, emotion = 'happy') {
    if (!visible || !thoughtBox) return;
    applyBoxEmotion(thoughtBox, emotion);
    thoughtTextEl.textContent = text;
    thoughtBox.style.opacity = '1';
    thoughtBox.style.transform = 'translateY(0) scale(1)';
    clearTimeout(thoughtBox._hideTimer);
    thoughtBox._hideTimer = setTimeout(() => {
        thoughtBox.style.opacity = '0';
        thoughtBox.style.transform = 'translateY(-10px) scale(0.88)';
        setTimeout(() => { if (thoughtTextEl) thoughtTextEl.textContent = ''; }, 300);
    }, holdMs);
}

export function clearIdleThought() {
    if (!thoughtBox) return;
    clearTimeout(thoughtBox._hideTimer);
    thoughtBox.style.opacity = '0';
    thoughtBox.style.transform = 'translateY(-10px) scale(0.88)';
    setTimeout(() => { if (thoughtTextEl) thoughtTextEl.textContent = ''; }, 300);
}

/**
 * Adds a message from another character to the chat stack (bottom left).
 * @param {string} who - character name
 * @param {string} text
 * @param {number} holdMs
 */
export function addChatMessage(who, text, holdMs = 4000) {
    if (!visible || !chatStack) return;
    const msg = createEl('div', {
        padding: '0.35rem 0.6rem',
        background: 'rgba(15,20,35,0.92)',
        borderRadius: '4px',
        border: '1px solid #88aaff',
        color: '#cceeff',
        fontSize: '0.75rem',
        lineHeight: '1.35',
        maxWidth: '100%',
        wordBreak: 'break-word',
        opacity: '1',
        transition: 'opacity 0.5s ease',
        clipPath: 'polygon(0% 8px, 8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%)',
    });
    msg.textContent = `${who}: ${text}`;
    chatStack.appendChild(msg);
    // Scroll to bottom (newest)
    chatStack.scrollTop = chatStack.scrollHeight;
    setTimeout(() => {
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 500);
    }, holdMs);
}

/**
 * Show the current FPV character's own message (bottom right).
 * @param {string} who
 * @param {string} text
 * @param {number} holdMs
 */
export function showMyMessage(who, text, holdMs = 3500) {
    if (!visible || !myMessageBox) return;
    myMessageTextEl.textContent = text;
    myMessageBox.style.opacity = '1';
    myMessageBox.style.transform = 'translateY(0)';
    clearTimeout(myMessageBox._hideTimer);
    myMessageBox._hideTimer = setTimeout(() => {
        myMessageBox.style.opacity = '0';
        myMessageBox.style.transform = 'translateY(12px)';
    }, holdMs);
}

/**
 * Update distance bar.
 * @param {number} dist - distance in meters to target
 */
export function updateDistance(dist) {
    if (!distanceBar || !distanceTextEl) return;
    const maxDist = 25;
    const percent = Math.min(100, Math.max(0, (1 - dist / maxDist) * 100));
    distanceBar.style.width = `${percent}%`;
    distanceTextEl.textContent = `${dist.toFixed(1)} m`;
}

/**
 * Switch which character we are viewing in FPV.
 * @param {string} charName - 'layla', 'nolan', 'lillian', 'clint'
 */
export function setFPVCharacter(charName) {
    currentFPVChar = charName;
    // HUD resets when switching
    if (chatStack) chatStack.innerHTML = '';
    clearIdleThought();
    if (myMessageBox) {
        myMessageBox.style.opacity = '0';
        myMessageBox.style.transform = 'translateY(12px)';
    }
}

export function getFPVCharacter() {
    return currentFPVChar;
}

// Legacy compatibility alias
export function showCharacterMessage(who, text, holdMs = 3500) {
    if (who === 'layla' || who === currentFPVChar) {
        showMyMessage(who, text, holdMs);
    } else {
        addChatMessage(who, text, holdMs);
    }
    state.fpvCustomMessageEndTime = performance.now() + holdMs;
}