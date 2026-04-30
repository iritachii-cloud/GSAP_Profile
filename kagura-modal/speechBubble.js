import { state } from './state.js';
import { showIdleThought } from './fpvHUD.js';

// ─── Day messages ──────────────────────────────────────────────────────────
const dayMessages = [
    { text: "Hi, I am Kagura!",                        emotion: 'happy'    },
    { text: "Umbrella is my weapon!",                  emotion: 'excited'  },
    { text: "I love Cherry Blossom~",                  emotion: 'happy'    },
    { text: "Wisteria is my favourite flower…", emotion: 'peaceful' },
    { text: "The petals are so beautiful today.",      emotion: 'peaceful' },
    { text: "Let's dance together!",                   emotion: 'excited'  },
    { text: "Have you seen my umbrella?",              emotion: 'curious'  },
    { text: "I feel so alive under the blossoms.",     emotion: 'peaceful' },
    { text: "Birds are singing in the sky~",           emotion: 'happy'    },
    { text: "Cherry storms are my favourite kind.",    emotion: 'happy'    },
    { text: "Watch out — petal attack!",               emotion: 'excited'  },
];

// ─── Night messages ────────────────────────────────────────────────────────
const nightMessages = [
    { text: "The stars are so beautiful tonight…",    emotion: 'peaceful' },
    { text: "Do you hear the wind?",                  emotion: 'curious'  },
    { text: "Stay close — it's getting dark!",        emotion: 'playful'  },
    { text: "I wonder what lies beyond the torii…",   emotion: 'curious'  },
    { text: "Night time is so peaceful…",             emotion: 'peaceful' },
    { text: "The fireflies are dancing with me~",     emotion: 'happy'    },
    { text: "My lantern keeps the shadows away.",     emotion: 'peaceful' },
    { text: "Can you see the moon from here?",        emotion: 'curious'  },
    { text: "Even the shrine feels alive at night.",  emotion: 'playful'  },
    { text: "Wisteria blooms best under moonlight.",  emotion: 'peaceful' },
];

// ─── Emotion → visual style ────────────────────────────────────────────────
const emotionStyle = {
    happy:   { bg: 'rgba(255,240,248,0.97)', border: '#ff99bb', color: '#b30047', tail: '#ff99bb' },
    excited: { bg: 'rgba(255,245,220,0.97)', border: '#ffaa00', color: '#7a4400', tail: '#ffaa00' },
    curious: { bg: 'rgba(235,240,255,0.97)', border: '#8899ff', color: '#2233aa', tail: '#8899ff' },
    peaceful:{ bg: 'rgba(235,250,240,0.97)', border: '#66cc99', color: '#1a6644', tail: '#66cc99' },
    playful: { bg: 'rgba(255,235,255,0.97)', border: '#cc66ff', color: '#6600aa', tail: '#cc66ff' },
};

// ─── State ─────────────────────────────────────────────────────────────────
let bubble       = null;
let tailEl       = null;
let textEl       = null;
let messageTimer = null;
let typeTimer    = null;
let lastMsgIdx   = -1;
let visible      = false;

let customMessageActive = false;
let postCustomTimer = null;

// ─── Build DOM ─────────────────────────────────────────────────────────────
function createBubble() {
    const wrap = document.querySelector('.canvas-wrap') || document.body;

    const div = document.createElement('div');
    div.id = 'speechBubble';
    Object.assign(div.style, {
        position:        'absolute',
        maxWidth:        '200px',
        minWidth:        '80px',
        padding:         '0.25rem 0.7rem',
        borderRadius:    '16px',
        border:          '2px solid #ff99bb',
        background:      'rgba(255,240,248,0.97)',
        boxShadow:       '0 3px 12px rgba(0,0,0,0.25)',
        fontFamily:      'Quicksand, sans-serif',
        fontSize:        '0.62rem',
        fontWeight:      '600',
        lineHeight:      '1.4',
        color:           '#b30047',
        pointerEvents:   'none',
        zIndex:          '200',
        opacity:         '0',
        transform:       'translateX(-50%) translateY(-100%) scale(0.85)',
        transformOrigin: 'bottom center',
        transition:      'opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.4,0.64,1)',
        whiteSpace:      'normal',
        textAlign:       'center',
        willChange:      'transform, opacity',
    });

    textEl = document.createElement('span');
    textEl.id = 'speechText';
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
        borderTop:    '10px solid #ff99bb',
        pointerEvents:'none',
    });
    div.appendChild(tailEl);

    wrap.appendChild(div);
    bubble = div;
    return div;
}

// ─── Apply emotion styling ──────────────────────────────────────────────────
function applyEmotion(emotion) {
    const s = emotionStyle[emotion] || emotionStyle.happy;
    bubble.style.background     = s.bg;
    bubble.style.borderColor    = s.border;
    bubble.style.color          = s.color;
    tailEl.style.borderTopColor = s.tail;
}

// ─── Typewriter (used for normal idle messages) ─────────────────────────────
function typeWrite(text, onDone) {
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
    textEl.textContent = '';
    let i = 0;
    function tick() {
        if (!visible) return;
        textEl.textContent = text.slice(0, i + 1);
        i++;
        if (i < text.length) {
            const ch = text[i - 1];
            const delay = /[.,!?…~]/.test(ch)
                ? 120 + Math.random() * 80
                :  28 + Math.random() * 22;
            typeTimer = setTimeout(tick, delay);
        } else {
            if (onDone) onDone();
        }
    }
    typeTimer = setTimeout(tick, 30);
}

// ─── Pick next message from correct pool ───────────────────────────────────
function pickMessage() {
    const pool = state.timeOfDay === 'night' ? nightMessages : dayMessages;
    let idx;
    do { idx = Math.floor(Math.random() * pool.length); }
    while (idx === lastMsgIdx && pool.length > 1);
    lastMsgIdx = idx;
    return pool[idx];
}

// ─── Pop animations ────────────────────────────────────────────────────────
function popIn() {
    bubble.style.opacity   = '1';
    bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(1)';
}

function popOut(onDone) {
    bubble.style.opacity   = '0';
    bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(0.85)';
    setTimeout(onDone, 280);
}

// ─── Cycle loop (normal idle messages) ─────────────────────────────────────
function cycleMessage() {
    if (!visible || !bubble) return;
    if (customMessageActive) return;

    // In FPV mode, use the HUD idle thought with cooldown
    if (state.cameraMode === 'fpv') {
        const now = performance.now();
        const cooldownEnd = state.fpvCustomMessageEndTime + 3500;   // 3.5 s after custom message ends
        const delay = Math.max(0, cooldownEnd - now) + 500 + Math.random() * 1500;
        messageTimer = setTimeout(() => {
            if (!visible || state.cameraMode !== 'fpv') return;
            const { text } = pickMessage();
            showIdleThought(text, 4000);
            // Schedule next cycle after the thought finishes + a small gap
            messageTimer = setTimeout(cycleMessage, 4000 + 1000 + Math.random() * 2000);
        }, delay);
        return;
    }

    // Standard bubble mode
    const { text, emotion } = pickMessage();
    applyEmotion(emotion);
    popIn();
    typeWrite(text, () => {
        if (!visible || customMessageActive) return;
        const hold = 2200 + text.length * 28 + Math.random() * 1000;
        messageTimer = setTimeout(() => {
            popOut(() => {
                if (!visible || customMessageActive) return;
                messageTimer = setTimeout(cycleMessage, 400 + Math.random() * 600);
            });
        }, hold);
    });
}

// ─── Position: above head, centered ────────────────────────────────────────
function updateBubblePosition() {
    if (!bubble || !state.claw || !state.camera) return;

    const wrapper = document.querySelector('.canvas-wrap');
    if (!wrapper) return;

    const worldPos = state.claw.position.clone();
    worldPos.y += 0.8;

    const vector = worldPos.project(state.camera);
    if (vector.z > 1) {
        bubble.style.opacity = '0';
        return;
    }

    const rect = wrapper.getBoundingClientRect();
    const x    = (vector.x *  0.5 + 0.5) * rect.width;
    const y    = (vector.y * -0.5 + 0.5) * rect.height;

    bubble.style.left = `${x}px`;
    bubble.style.top  = `${y}px`;

    const bw       = bubble.offsetWidth;
    const half     = bw / 2;
    const clampedX = Math.max(half + 8, Math.min(rect.width - half - 8, x));
    if (clampedX !== x) {
        bubble.style.left = `${clampedX}px`;
        const tailShift   = x - clampedX;
        tailEl.style.left = `calc(50% + ${tailShift}px)`;
    } else {
        tailEl.style.left = '50%';
    }
}

// ─── Public API ────────────────────────────────────────────────────────────

export function showSpeechBubble() {
    if (!bubble) createBubble();
    visible = true;
    customMessageActive = false;
    clearIdleResumeTimers();
    messageTimer = setTimeout(cycleMessage, 600);
}

export function hideSpeechBubble() {
    visible = false;
    customMessageActive = false;
    clearIdleResumeTimers();
    if (messageTimer) { clearTimeout(messageTimer); messageTimer = null; }
    if (typeTimer)    { clearTimeout(typeTimer);    typeTimer    = null; }
    if (bubble) {
        bubble.style.opacity   = '0';
        bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(0.85)';
    }
}

export function showCustomMessage(text, emotion = 'happy', holdMs = 3500, postDelay = 4000) {
    if (!bubble) createBubble();
    customMessageActive = true;
    clearIdleResumeTimers();
    if (messageTimer) { clearTimeout(messageTimer); messageTimer = null; }
    if (typeTimer)    { clearTimeout(typeTimer);    typeTimer    = null; }

    applyEmotion(emotion);
    textEl.textContent = text;
    visible = true;
    popIn();

    messageTimer = setTimeout(() => {
        popOut(() => {
            postCustomTimer = setTimeout(() => {
                customMessageActive = false;
                if (state.dancePhase !== null) {
                    messageTimer = setTimeout(cycleMessage, 500);
                } else {
                    hideSpeechBubble();
                }
            }, postDelay);
        });
    }, holdMs);
}

export function updateSpeechBubble() {
    if (bubble && visible) updateBubblePosition();
}

function clearIdleResumeTimers() {
    if (postCustomTimer) {
        clearTimeout(postCustomTimer);
        postCustomTimer = null;
    }
}