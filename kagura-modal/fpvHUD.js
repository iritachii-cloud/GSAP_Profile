import { state } from './state.js';

let container      = null;
let hayabusaBox    = null;
let kaguraBox      = null;
let idleThoughtBox = null;
let idleTextEl     = null;   // inner span for typewriter
let statsBox       = null;
let distanceBar    = null;
let escapeCountEl  = null;
let distanceTextEl = null;
let visible        = false;

let idleTypeTimer  = null;   // typewriter tick handle

const KAGURA_ICON   = 'kaguraicon.png';
const HAYABUSA_ICON = 'hayabusaicon.png';

// ─── Emotion styles (mirrors speechBubble.js exactly) ─────────────────────
const emotionStyle = {
    happy:   { bg: 'rgba(255,240,248,0.97)', border: '#ff99bb', color: '#b30047' },
    excited: { bg: 'rgba(255,245,220,0.97)', border: '#ffaa00', color: '#7a4400' },
    curious: { bg: 'rgba(235,240,255,0.97)', border: '#8899ff', color: '#2233aa' },
    peaceful:{ bg: 'rgba(235,250,240,0.97)', border: '#66cc99', color: '#1a6644' },
    playful: { bg: 'rgba(255,235,255,0.97)', border: '#cc66ff', color: '#6600aa' },
};

// ─── Helper ────────────────────────────────────────────────────────────────
function createEl(tag, styles) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    return el;
}

// ─── Apply emotion to the idle thought box ────────────────────────────────
function applyIdleEmotion(emotion) {
    const s = emotionStyle[emotion] || emotionStyle.happy;
    idleThoughtBox.style.background  = s.bg;
    idleThoughtBox.style.borderColor = s.border;
    idleThoughtBox.style.color       = s.color;
    // Soft glow matching the border colour
    idleThoughtBox.style.boxShadow   =
        `0 3px 14px rgba(0,0,0,0.35), 0 0 10px ${s.border}55`;
}

// ─── Typewriter for idle thought ──────────────────────────────────────────
function typeWriteIdle(text) {
    if (idleTypeTimer) { clearTimeout(idleTypeTimer); idleTypeTimer = null; }
    if (!idleTextEl) return;
    idleTextEl.textContent = '';
    let i = 0;
    function tick() {
        if (!visible) return;
        idleTextEl.textContent = text.slice(0, i + 1);
        i++;
        if (i < text.length) {
            const ch    = text[i - 1];
            const delay = /[.,!?…~]/.test(ch)
                ? 110 + Math.random() * 70
                :  26 + Math.random() * 20;
            idleTypeTimer = setTimeout(tick, delay);
        }
    }
    idleTypeTimer = setTimeout(tick, 30);
}

// ─── Initialise DOM structure once ────────────────────────────────────────
function buildHUD() {
    if (container) return;
    const wrap = document.querySelector('.canvas-wrap') || document.body;

    container = createEl('div', {
        position:      'absolute',
        inset:         '0',
        pointerEvents: 'none',
        zIndex:        '300',
        fontFamily:    'Quicksand, sans-serif',
        color:         '#fff',
        display:       'flex',
        flexDirection: 'column',
        justifyContent:'space-between',
        padding:       'clamp(0.5rem, 3vw, 1.5rem)',
        boxSizing:     'border-box',
    });
    wrap.appendChild(container);

    // ── Top row: stats (left) + idle thought (right, content-sized) ──────
    const topRow = createEl('div', {
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        gap:            '0.6rem',
        flexWrap:       'nowrap',
    });
    container.appendChild(topRow);

    // Stats panel (upper-left) — unchanged
    statsBox = createEl('div', {
        display:        'flex',
        flexDirection:  'column',
        gap:            '0.3rem',
        padding:        '0.5rem 0.75rem',
        background:     'rgba(15,15,30,0.8)',
        borderRadius:   '14px',
        border:         '1px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(8px)',
        width:          'clamp(120px, 35vw, 170px)',
        flexShrink:     '0',
    });
    topRow.appendChild(statsBox);

    escapeCountEl = createEl('div', {
        fontSize:   'clamp(0.7rem, 2.2vw, 0.9rem)',
        fontWeight: '600',
        color:      '#ffccdd',
    });
    escapeCountEl.textContent = 'Escaped: 0';
    statsBox.appendChild(escapeCountEl);

    const barWrap = createEl('div', {
        width:        '100%',
        height:       'clamp(8px, 1.8vw, 14px)',
        background:   'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        overflow:     'hidden',
    });
    statsBox.appendChild(barWrap);
    distanceBar = createEl('div', {
        width:        '0%',
        height:       '100%',
        background:   'linear-gradient(90deg, #ff7eb3, #ffcc88)',
        borderRadius: '8px',
        transition:   'width 0.4s ease',
    });
    barWrap.appendChild(distanceBar);
    distanceTextEl = createEl('div', {
        fontSize:   'clamp(0.55rem, 1.6vw, 0.75rem)',
        color:      '#ccddff',
        textAlign:  'center',
        marginTop:  '0.2rem',
    });
    statsBox.appendChild(distanceTextEl);

    // ── Idle thought bubble (upper-right) ─────────────────────────────────
    // KEY FIX: flex:'0 1 auto' + maxWidth cap → box only grows to fit content,
    // never stretches to fill remaining row space on wide screens.
    idleThoughtBox = createEl('div', {
        padding:        '0.4rem 0.75rem',
        background:     emotionStyle.happy.bg,
        backdropFilter: 'blur(10px)',
        borderRadius:   '16px 16px 4px 16px',
        border:         `2px solid ${emotionStyle.happy.border}`,
        color:          emotionStyle.happy.color,
        fontSize:       'clamp(0.62rem, 1.8vw, 0.82rem)',
        fontWeight:     '600',
        lineHeight:     '1.4',
        opacity:        '0',
        // pop-in uses scale so it feels like the speech bubble
        transform:      'translateY(-10px) scale(0.88)',
        transformOrigin:'top right',
        transition:     'opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.28,0.64,1)',
        wordBreak:      'break-word',
        textAlign:      'left',
        // ← content-sized: don't grow, shrink if needed, capped width
        flex:           '0 1 auto',
        maxWidth:       'clamp(150px, 28vw, 260px)',
        alignSelf:      'flex-start',
        boxSizing:      'border-box',
        boxShadow:      `0 3px 14px rgba(0,0,0,0.3), 0 0 10px ${emotionStyle.happy.border}55`,
    });

    // Inner span so typewriter writes into it without touching box styles
    idleTextEl = document.createElement('span');
    idleThoughtBox.appendChild(idleTextEl);

    topRow.appendChild(idleThoughtBox);

    // ── Bottom row: character chat boxes ─────────────────────────────────
    const bottomRow = createEl('div', {
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-end',
        gap:            '1rem',
        flexWrap:       'wrap',
    });
    container.appendChild(bottomRow);

    hayabusaBox = createChatBox('#aaddff', HAYABUSA_ICON);
    hayabusaBox.style.alignSelf = 'flex-end';
    bottomRow.appendChild(hayabusaBox);

    kaguraBox = createChatBox('#ff99bb', KAGURA_ICON);
    kaguraBox.style.alignSelf = 'flex-end';
    bottomRow.appendChild(kaguraBox);
}

function createChatBox(borderColor, iconUrl) {
    const box = createEl('div', {
        maxWidth:       'clamp(180px, 45vw, 260px)',
        minWidth:       '120px',
        padding:        '0.5rem',
        background:     'rgba(10,10,20,0.85)',
        border:         `2px solid ${borderColor}`,
        borderRadius:   '16px',
        display:        'flex',
        alignItems:     'flex-start',
        gap:            '0.5rem',
        opacity:        '0',
        transform:      'translateY(12px)',
        transition:     'opacity 0.35s ease, transform 0.35s ease',
        backdropFilter: 'blur(12px)',
    });

    const icon = createEl('img', {
        width:      'clamp(28px, 7vw, 40px)',
        height:     'clamp(28px, 7vw, 40px)',
        borderRadius:'50%',
        objectFit:  'cover',
        border:     `1px solid ${borderColor}`,
        flexShrink: '0',
    });
    icon.src = iconUrl;
    icon.onerror = () => { icon.style.display = 'none'; };
    box.appendChild(icon);

    const textEl = createEl('div', {
        color:      '#ffffff',
        fontSize:   'clamp(0.65rem, 2vw, 0.9rem)',
        lineHeight: '1.35',
        flex:       '1',
        wordBreak:  'break-word',
        textShadow: '0 0 6px rgba(0,0,0,0.4)',
    });
    box.appendChild(textEl);

    box._textEl = textEl;
    return box;
}

// ─── Public API ────────────────────────────────────────────────────────────
export function showFPVHUD() {
    buildHUD();
    visible = true;
    container.style.display = 'flex';
}

export function hideFPVHUD() {
    visible = false;
    if (container) container.style.display = 'none';
    if (idleTypeTimer) { clearTimeout(idleTypeTimer); idleTypeTimer = null; }
    if (idleThoughtBox) {
        idleThoughtBox.style.opacity   = '0';
        idleThoughtBox.style.transform = 'translateY(-10px) scale(0.88)';
    }
    if (hayabusaBox) {
        hayabusaBox.style.opacity   = '0';
        hayabusaBox.style.transform = 'translateY(12px)';
    }
    if (kaguraBox) {
        kaguraBox.style.opacity   = '0';
        kaguraBox.style.transform = 'translateY(12px)';
    }
}

/**
 * showIdleThought(text, holdMs, emotion)
 *
 * Now accepts an optional emotion string matching speechBubble.js's
 * emotionStyle keys: 'happy' | 'excited' | 'curious' | 'peaceful' | 'playful'
 * Colours, border, and glow update to match.  Text is typewritten in.
 */
export function showIdleThought(text, holdMs = 4000, emotion = 'happy') {
    if (!visible || !idleThoughtBox) return;

    // Stop any in-progress typewrite
    if (idleTypeTimer) { clearTimeout(idleTypeTimer); idleTypeTimer = null; }

    // Apply emotion styling
    applyIdleEmotion(emotion);

    // Pop in
    idleThoughtBox.style.opacity   = '1';
    idleThoughtBox.style.transform = 'translateY(0) scale(1)';

    // Typewrite the text
    typeWriteIdle(text);

    // Schedule pop-out
    clearTimeout(idleThoughtBox._hideTimer);
    idleThoughtBox._hideTimer = setTimeout(() => {
        idleThoughtBox.style.opacity   = '0';
        idleThoughtBox.style.transform = 'translateY(-10px) scale(0.88)';
        // Clear text after transition so it doesn't flash old content on re-show
        setTimeout(() => {
            if (idleTextEl) idleTextEl.textContent = '';
        }, 300);
    }, holdMs);
}

/** Immediately hide the idle thought (e.g. custom chat takes over). */
export function clearIdleThought() {
    if (idleTypeTimer) { clearTimeout(idleTypeTimer); idleTypeTimer = null; }
    if (idleThoughtBox) {
        clearTimeout(idleThoughtBox._hideTimer);
        idleThoughtBox.style.opacity   = '0';
        idleThoughtBox.style.transform = 'translateY(-10px) scale(0.88)';
        setTimeout(() => {
            if (idleTextEl) idleTextEl.textContent = '';
        }, 300);
    }
}

export function showCharacterMessage(who, text, holdMs = 3500) {
    if (!visible) return;
    clearIdleThought();

    const box = who === 'hayabusa' ? hayabusaBox : kaguraBox;
    if (!box) return;
    box._textEl.textContent = text;
    box.style.opacity       = '1';
    box.style.transform     = 'translateY(0)';
    clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
        box.style.opacity   = '0';
        box.style.transform = 'translateY(12px)';
    }, holdMs);

    state.fpvCustomMessageEndTime = performance.now() + holdMs;
}

export function updateEscapeCount(count) {
    if (escapeCountEl) escapeCountEl.textContent = `Escaped: ${count}`;
}

export function updateDistance(distance) {
    if (!distanceBar || !distanceTextEl) return;
    const maxDist  = 20;
    const percent  = Math.min(100, Math.max(0, (1 - distance / maxDist) * 100));
    distanceBar.style.width      = `${percent}%`;
    distanceTextEl.textContent   = `${distance.toFixed(1)} m`;
}