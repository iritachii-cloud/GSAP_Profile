import { state } from './state.js';

let container      = null;
let hayabusaBox    = null;
let kaguraBox      = null;
let idleThoughtBox = null;
let idleTextEl     = null;
let statsBox       = null;
let distanceBar    = null;
let escapeCountEl  = null;
let distanceTextEl = null;
let visible        = false;
let idleTypeTimer  = null;

const KAGURA_ICON   = 'kaguraicon.png';
const HAYABUSA_ICON = 'hayabusaicon.png';

const emotionStyle = {
    happy:   { bg: 'rgba(255,240,248,0.97)', border: '#ff99bb', color: '#b30047' },
    excited: { bg: 'rgba(255,245,220,0.97)', border: '#ffaa00', color: '#7a4400' },
    curious: { bg: 'rgba(235,240,255,0.97)', border: '#8899ff', color: '#2233aa' },
    peaceful:{ bg: 'rgba(235,250,240,0.97)', border: '#66cc99', color: '#1a6644' },
    playful: { bg: 'rgba(255,235,255,0.97)', border: '#cc66ff', color: '#6600aa' },
};

function createEl(tag, styles) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    return el;
}

function applyIdleEmotion(emotion) {
    const s = emotionStyle[emotion] || emotionStyle.happy;
    idleThoughtBox.style.background  = s.bg;
    idleThoughtBox.style.borderColor = s.border;
    idleThoughtBox.style.color       = s.color;
    idleThoughtBox.style.boxShadow   = `0 3px 14px rgba(0,0,0,0.35), 0 0 10px ${s.border}55`;
}

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
            const delay = /[.,!?…~]/.test(ch) ? 110 + Math.random() * 70 : 26 + Math.random() * 20;
            idleTypeTimer = setTimeout(tick, delay);
        }
    }
    idleTypeTimer = setTimeout(tick, 30);
}

// ─── Responsive size helper ────────────────────────────────────────────────
// Returns sizes based on the canvas-wrap width so the HUD feels correct on
// both 375px phones and 1440px+ desktops.
function getHUDSizes() {
    const wrap = document.querySelector('.canvas-wrap');
    const w    = wrap ? wrap.clientWidth : window.innerWidth;

    if (w >= 1200) return {
        statW: '200px', statFS: '1rem',
        barH:  '16px',  distFS: '0.85rem',
        boxMaxW:'320px', boxFS: '1rem',
        iconSz: '52px',  textFS: '1rem',
        thoughtMaxW: '340px', thoughtFS: '0.9rem',
        pad: '1.4rem',
    };
    if (w >= 768) return {
        statW: '160px', statFS: '0.88rem',
        barH:  '13px',  distFS: '0.75rem',
        boxMaxW:'270px', boxFS: '0.9rem',
        iconSz: '44px',  textFS: '0.9rem',
        thoughtMaxW: '260px', thoughtFS: '0.82rem',
        pad: '1rem',
    };
    // Mobile
    return {
        statW: '120px', statFS: '0.72rem',
        barH:  '9px',   distFS: '0.62rem',
        boxMaxW:'190px', boxFS: '0.72rem',
        iconSz: '32px',  textFS: '0.72rem',
        thoughtMaxW: '180px', thoughtFS: '0.66rem',
        pad: '0.6rem',
    };
}

function buildHUD() {
    if (container) return;
    const wrap = document.querySelector('.canvas-wrap') || document.body;
    const sz   = getHUDSizes();

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
        padding:       sz.pad,
        boxSizing:     'border-box',
    });
    wrap.appendChild(container);

    // ── Top row ───────────────────────────────────────────────────────────
    const topRow = createEl('div', {
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        gap:            '0.6rem',
        flexWrap:       'nowrap',
    });
    container.appendChild(topRow);

    // Stats panel
    statsBox = createEl('div', {
        display:        'flex',
        flexDirection:  'column',
        gap:            '0.3rem',
        padding:        '0.55rem 0.85rem',
        background:     'rgba(15,15,30,0.85)',
        borderRadius:   '14px',
        border:         '1px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(8px)',
        width:          sz.statW,
        flexShrink:     '0',
    });
    topRow.appendChild(statsBox);

    escapeCountEl = createEl('div', {
        fontSize:   sz.statFS,
        fontWeight: '700',
        color:      '#ffccdd',
    });
    escapeCountEl.textContent = 'Escaped: 0';
    statsBox.appendChild(escapeCountEl);

    const barWrap = createEl('div', {
        width:        '100%',
        height:       sz.barH,
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
        fontSize:  sz.distFS,
        color:     '#ccddff',
        textAlign: 'center',
        marginTop: '0.2rem',
    });
    statsBox.appendChild(distanceTextEl);

    // Idle thought bubble
    idleThoughtBox = createEl('div', {
        padding:        '0.45rem 0.85rem',
        background:     emotionStyle.happy.bg,
        backdropFilter: 'blur(10px)',
        borderRadius:   '16px 16px 4px 16px',
        border:         `2px solid ${emotionStyle.happy.border}`,
        color:          emotionStyle.happy.color,
        fontSize:       sz.thoughtFS,
        fontWeight:     '600',
        lineHeight:     '1.45',
        opacity:        '0',
        transform:      'translateY(-10px) scale(0.88)',
        transformOrigin:'top right',
        transition:     'opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.28,0.64,1)',
        wordBreak:      'break-word',
        textAlign:      'left',
        flex:           '0 1 auto',
        maxWidth:       sz.thoughtMaxW,
        alignSelf:      'flex-start',
        boxSizing:      'border-box',
        boxShadow:      `0 3px 14px rgba(0,0,0,0.3), 0 0 10px ${emotionStyle.happy.border}55`,
    });
    idleTextEl = document.createElement('span');
    idleThoughtBox.appendChild(idleTextEl);
    topRow.appendChild(idleThoughtBox);

    // ── Bottom row ────────────────────────────────────────────────────────
    const bottomRow = createEl('div', {
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-end',
        gap:            '1rem',
        flexWrap:       'wrap',
    });
    container.appendChild(bottomRow);

    hayabusaBox = createChatBox('#aaddff', HAYABUSA_ICON, sz);
    hayabusaBox.style.alignSelf = 'flex-end';
    bottomRow.appendChild(hayabusaBox);

    kaguraBox = createChatBox('#ff99bb', KAGURA_ICON, sz);
    kaguraBox.style.alignSelf = 'flex-end';
    bottomRow.appendChild(kaguraBox);
}

function createChatBox(borderColor, iconUrl, sz) {
    const box = createEl('div', {
        maxWidth:       sz.boxMaxW,
        minWidth:       '120px',
        padding:        '0.55rem 0.7rem',
        background:     'rgba(10,10,20,0.88)',
        border:         `2px solid ${borderColor}`,
        borderRadius:   '16px',
        display:        'flex',
        alignItems:     'flex-start',
        gap:            '0.55rem',
        opacity:        '0',
        transform:      'translateY(12px)',
        transition:     'opacity 0.35s ease, transform 0.35s ease',
        backdropFilter: 'blur(12px)',
        boxShadow:      `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${borderColor}33`,
    });

    const icon = createEl('img', {
        width:        sz.iconSz,
        height:       sz.iconSz,
        borderRadius: '50%',
        objectFit:    'cover',
        border:       `2px solid ${borderColor}`,
        flexShrink:   '0',
    });
    icon.src = iconUrl;
    icon.onerror = () => { icon.style.display = 'none'; };
    box.appendChild(icon);

    const textEl = createEl('div', {
        color:      '#ffffff',
        fontSize:   sz.textFS,
        fontWeight: '600',
        lineHeight: '1.4',
        flex:       '1',
        wordBreak:  'break-word',
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
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
    if (hayabusaBox) { hayabusaBox.style.opacity = '0'; hayabusaBox.style.transform = 'translateY(12px)'; }
    if (kaguraBox)   { kaguraBox.style.opacity   = '0'; kaguraBox.style.transform   = 'translateY(12px)'; }
}

export function showIdleThought(text, holdMs = 4000, emotion = 'happy') {
    if (!visible || !idleThoughtBox) return;
    if (idleTypeTimer) { clearTimeout(idleTypeTimer); idleTypeTimer = null; }
    applyIdleEmotion(emotion);
    idleThoughtBox.style.opacity   = '1';
    idleThoughtBox.style.transform = 'translateY(0) scale(1)';
    typeWriteIdle(text);
    clearTimeout(idleThoughtBox._hideTimer);
    idleThoughtBox._hideTimer = setTimeout(() => {
        idleThoughtBox.style.opacity   = '0';
        idleThoughtBox.style.transform = 'translateY(-10px) scale(0.88)';
        setTimeout(() => { if (idleTextEl) idleTextEl.textContent = ''; }, 300);
    }, holdMs);
}

export function clearIdleThought() {
    if (idleTypeTimer) { clearTimeout(idleTypeTimer); idleTypeTimer = null; }
    if (idleThoughtBox) {
        clearTimeout(idleThoughtBox._hideTimer);
        idleThoughtBox.style.opacity   = '0';
        idleThoughtBox.style.transform = 'translateY(-10px) scale(0.88)';
        setTimeout(() => { if (idleTextEl) idleTextEl.textContent = ''; }, 300);
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
    const maxDist = 20;
    const percent = Math.min(100, Math.max(0, (1 - distance / maxDist) * 100));
    distanceBar.style.width    = `${percent}%`;
    distanceTextEl.textContent = `${distance.toFixed(1)} m`;
}