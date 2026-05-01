import { state } from './state.js';

let container = null;
let hayabusaBox = null;
let kaguraBox = null;
let idleThoughtBox = null;
let statsBox = null;
let distanceBar = null;
let escapeCountEl = null;
let distanceTextEl = null;
let visible = false;

const KAGURA_ICON = 'kaguraicon.png';
const HAYABUSA_ICON = 'hayabusaicon.png';

// ─── Helper ────────────────────────────────────────────────────────────────
function createEl(tag, styles) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    return el;
}

// ─── Initialise structure once ─────────────────────────────────────────────
function buildHUD() {
    if (container) return;
    const wrap = document.querySelector('.canvas-wrap') || document.body;

    container = createEl('div', {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '300',
        fontFamily: 'Quicksand, sans-serif',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(0.5rem, 3vw, 1.5rem)',
        boxSizing: 'border-box',
    });
    wrap.appendChild(container);

    // ── Top row: stats (left) + idle thoughts (right) ────────────────────
    const topRow = createEl('div', {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.6rem',
        flexWrap: 'nowrap',
    });
    container.appendChild(topRow);

    // Stats panel (upper‑left)
    statsBox = createEl('div', {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        padding: '0.5rem 0.75rem',
        background: 'rgba(15,15,30,0.8)',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        width: 'clamp(120px, 35vw, 170px)',
        flexShrink: '0',
    });
    topRow.appendChild(statsBox);

    escapeCountEl = createEl('div', {
        fontSize: 'clamp(0.7rem, 2.2vw, 0.9rem)',
        fontWeight: '600',
        color: '#ffccdd',
    });
    escapeCountEl.textContent = 'Escaped: 0';
    statsBox.appendChild(escapeCountEl);

    const barWrap = createEl('div', {
        width: '100%',
        height: 'clamp(8px, 1.8vw, 14px)',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
    });
    statsBox.appendChild(barWrap);
    distanceBar = createEl('div', {
        width: '0%',
        height: '100%',
        background: 'linear-gradient(90deg, #ff7eb3, #ffcc88)',
        borderRadius: '8px',
        transition: 'width 0.4s ease',
    });
    barWrap.appendChild(distanceBar);
    distanceTextEl = createEl('div', {
        fontSize: 'clamp(0.55rem, 1.6vw, 0.75rem)',
        color: '#ccddff',
        textAlign: 'center',
        marginTop: '0.2rem',
    });
    statsBox.appendChild(distanceTextEl);

    // Idle thought bubble (upper‑right)
    idleThoughtBox = createEl('div', {
        // display: 'inline-block',
        padding: '0.6rem 0.9rem',
        background: 'rgba(20,20,30,0.85)',
        backdropFilter: 'blur(10px)',
        borderRadius: '18px 18px 4px 18px',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#ffffffee',
        fontSize: 'clamp(0.65rem, 2vw, 0.85rem)',
        lineHeight: '1.4',
        opacity: '0',
        transform: 'translateY(-12px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        wordBreak: 'break-word',
        textShadow: '0 0 8px rgba(0,0,0,0.6)',
        flex: '1 1 auto',
        maxWidth: '100%',
    });
    topRow.appendChild(idleThoughtBox);

    // ── Bottom row: chat boxes ──────────────────────────────────────────
    const bottomRow = createEl('div', {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: '1rem',
        flexWrap: 'wrap',
    });
    container.appendChild(bottomRow);

    // Hayabusa chat (lower‑left)
    hayabusaBox = createChatBox('#aaddff', HAYABUSA_ICON);
    hayabusaBox.style.alignSelf = 'flex-end';
    bottomRow.appendChild(hayabusaBox);

    // Kagura chat (lower‑right)
    kaguraBox = createChatBox('#ff99bb', KAGURA_ICON);
    kaguraBox.style.alignSelf = 'flex-end';
    bottomRow.appendChild(kaguraBox);
}

function createChatBox(borderColor, iconUrl) {
    const box = createEl('div', {
        maxWidth: 'clamp(180px, 45vw, 260px)',
        minWidth: '120px',
        padding: '0.5rem',
        background: 'rgba(10,10,20,0.85)',
        border: `2px solid ${borderColor}`,
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        opacity: '0',
        transform: 'translateY(12px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        backdropFilter: 'blur(12px)',
    });

    const icon = createEl('img', {
        width: 'clamp(28px, 7vw, 40px)',
        height: 'clamp(28px, 7vw, 40px)',
        borderRadius: '50%',
        objectFit: 'cover',
        border: `1px solid ${borderColor}`,
        flexShrink: '0',
    });
    icon.src = iconUrl;
    icon.onerror = () => { icon.style.display = 'none'; };
    box.appendChild(icon);

    const textEl = createEl('div', {
        color: '#ffffff',
        fontSize: 'clamp(0.65rem, 2vw, 0.9rem)',
        lineHeight: '1.35',
        flex: '1',
        wordBreak: 'break-word',
        textShadow: '0 0 6px rgba(0,0,0,0.4)',
    });
    box.appendChild(textEl);

    box._textEl = textEl;
    return box;
}

// ─── Public functions ──────────────────────────────────────────────────────
export function showFPVHUD() {
    buildHUD();
    visible = true;
    container.style.display = 'flex';
}

export function hideFPVHUD() {
    visible = false;
    if (container) container.style.display = 'none';
    if (idleThoughtBox) {
        idleThoughtBox.style.opacity = '0';
        idleThoughtBox.style.transform = 'translateY(-12px)';
    }
    if (hayabusaBox) {
        hayabusaBox.style.opacity = '0';
        hayabusaBox.style.transform = 'translateY(12px)';
    }
    if (kaguraBox) {
        kaguraBox.style.opacity = '0';
        kaguraBox.style.transform = 'translateY(12px)';
    }
}

export function showIdleThought(text, holdMs = 4000) {
    if (!visible || !idleThoughtBox) return;
    idleThoughtBox.textContent = text;
    idleThoughtBox.style.opacity = '1';
    idleThoughtBox.style.transform = 'translateY(0)';
    clearTimeout(idleThoughtBox._hideTimer);
    idleThoughtBox._hideTimer = setTimeout(() => {
        idleThoughtBox.style.opacity = '0';
        idleThoughtBox.style.transform = 'translateY(-12px)';
    }, holdMs);
}

/** Hide the idle thought bubble immediately (e.g. when a custom chat appears). */
export function clearIdleThought() {
    if (idleThoughtBox) {
        clearTimeout(idleThoughtBox._hideTimer);
        idleThoughtBox.style.opacity = '0';
        idleThoughtBox.style.transform = 'translateY(-12px)';
    }
}

export function showCharacterMessage(who, text, holdMs = 3500) {
    if (!visible) return;
    // Clear any existing idle thought so they don't overlap
    clearIdleThought();

    const box = who === 'hayabusa' ? hayabusaBox : kaguraBox;
    if (!box) return;
    box._textEl.textContent = text;
    box.style.opacity = '1';
    box.style.transform = 'translateY(0)';
    clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translateY(12px)';
    }, holdMs);

    // Set the cooldown – idle thoughts must wait until this timestamp + 3.5s
    state.fpvCustomMessageEndTime = performance.now() + holdMs;
}

export function updateEscapeCount(count) {
    if (escapeCountEl) escapeCountEl.textContent = `Escaped: ${count}`;
}

export function updateDistance(distance) {
    if (!distanceBar || !distanceTextEl) return;
    const maxDist = 20;
    const percent = Math.min(100, Math.max(0, (1 - distance / maxDist) * 100));
    distanceBar.style.width = `${percent}%`;
    distanceTextEl.textContent = `${distance.toFixed(1)} m`;
}