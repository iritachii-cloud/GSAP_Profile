import { state } from './state.js';
import { showIdleThought } from './fpvHUD.js';

// ═══════════════════════════════════════════════════════════════════════════════
//  DIALOGUE POOLS  — Kagura's idle thoughts
//  Each pool is a full deck. Once every entry has shown once, the deck
//  reshuffles and the cycle begins again. No consecutive repeats ever.
// ═══════════════════════════════════════════════════════════════════════════════

const DAY_MESSAGES = [
    { text: "Hi, I am Kagura! 🌸",                          emotion: 'happy'    },
    { text: "My umbrella is also my weapon~ 🌂",            emotion: 'excited'  },
    { text: "I love Cherry Blossom so much~",               emotion: 'happy'    },
    { text: "Wisteria is my favourite flower… 💜",          emotion: 'peaceful' },
    { text: "The petals are dancing today!",                 emotion: 'peaceful' },
    { text: "Let's dance together! 💃",                     emotion: 'excited'  },
    { text: "Have you seen my umbrella? 👀",                emotion: 'curious'  },
    { text: "I feel so alive under the blossoms~",          emotion: 'peaceful' },
    { text: "Birds are singing in the sky! 🐦",            emotion: 'happy'    },
    { text: "Cherry storms are my favourite kind 🌸",       emotion: 'happy'    },
    { text: "Watch out — petal attack!! 💥",               emotion: 'excited'  },
    { text: "The shrine looks so beautiful today~",         emotion: 'peaceful' },
    { text: "A ninja… I wonder where he's hiding 👀",      emotion: 'curious'  },
    { text: "My petals will find him anywhere! 🌸",         emotion: 'excited'  },
    { text: "Hmm… I smell sakura in the air~",             emotion: 'curious'  },
    { text: "Someday I'll be the fastest one here! 💨",    emotion: 'playful'  },
    { text: "Peace and petals. That's all I need~ 🌸",     emotion: 'peaceful' },
    { text: "I could spin here forever… 🌀",               emotion: 'happy'    },
    { text: "The wind is so gentle today~",                 emotion: 'peaceful' },
    { text: "Who wants a petal attack? Anyone? 😤🌸",      emotion: 'playful'  },
];

const NIGHT_MESSAGES = [
    { text: "The stars are so beautiful tonight… ✨",       emotion: 'peaceful' },
    { text: "Do you hear the wind? 🌙",                    emotion: 'curious'  },
    { text: "Stay close — it's getting dark! 😶‍🌫️",          emotion: 'playful'  },
    { text: "I wonder what lies beyond the torii… ⛩️",     emotion: 'curious'  },
    { text: "Night time is so peaceful~",                   emotion: 'peaceful' },
    { text: "The fireflies are dancing with me~ 🪲",       emotion: 'happy'    },
    { text: "My lantern keeps the shadows away 🏮",        emotion: 'peaceful' },
    { text: "Can you see the moon from here? 🌕",          emotion: 'curious'  },
    { text: "Even the shrine feels alive at night~",        emotion: 'playful'  },
    { text: "Wisteria blooms best under moonlight 💜",     emotion: 'peaceful' },
    { text: "Moonlight and cherry blossoms… perfect 🌸",   emotion: 'peaceful' },
    { text: "I hear footsteps… is that him?! 😤",          emotion: 'excited'  },
    { text: "The night is so mysterious tonight~",          emotion: 'curious'  },
    { text: "Fireflies remind me of him… always fleeing 😑", emotion: 'playful' },
    { text: "Stars are witnesses to our game~ ✨",          emotion: 'peaceful' },
    { text: "Cold night, warm heart 💗",                   emotion: 'happy'    },
    { text: "The lantern light makes everything glow~",     emotion: 'peaceful' },
    { text: "I'll find him even in the dark! 💪",          emotion: 'excited'  },
    { text: "Night is when ninjas hide… typical 😒",       emotion: 'playful'  },
    { text: "Moonlit petals are the prettiest~ 🌸",        emotion: 'peaceful' },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SHUFFLE-DECK UTILITY
//  Creates a stateful deck from an array. drawNext() always returns the next
//  item in a shuffled order, reshuffling only when the deck is exhausted.
//  Guarantees: no consecutive repeat across reshuffles (last of old deck ≠
//  first of new deck).
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
        // Avoid the last drawn item being first in the new deck
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

// Module-level decks — one per pool, persist across calls
const dayDeck   = createDeck(DAY_MESSAGES);
const nightDeck = createDeck(NIGHT_MESSAGES);

function pickMessage() {
    return (state.timeOfDay === 'night' ? nightDeck : dayDeck).drawNext();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EMOTION STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const emotionStyle = {
    happy:   { bg: 'rgba(255,240,248,0.97)', border: '#ff99bb', color: '#b30047', tail: '#ff99bb' },
    excited: { bg: 'rgba(255,245,220,0.97)', border: '#ffaa00', color: '#7a4400', tail: '#ffaa00' },
    curious: { bg: 'rgba(235,240,255,0.97)', border: '#8899ff', color: '#2233aa', tail: '#8899ff' },
    peaceful:{ bg: 'rgba(235,250,240,0.97)', border: '#66cc99', color: '#1a6644', tail: '#66cc99' },
    playful: { bg: 'rgba(255,235,255,0.97)', border: '#cc66ff', color: '#6600aa', tail: '#cc66ff' },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DOM STATE
// ═══════════════════════════════════════════════════════════════════════════════
let bubble       = null;
let tailEl       = null;
let textEl       = null;
let messageTimer = null;
let typeTimer    = null;
let visible      = false;

let customMessageActive = false;
let postCustomTimer     = null;

// ═══════════════════════════════════════════════════════════════════════════════
//  BUILD DOM
// ═══════════════════════════════════════════════════════════════════════════════
function createBubble() {
    const wrap = document.querySelector('.canvas-wrap') || document.body;
    const div  = document.createElement('div');
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
        position:      'absolute',
        bottom:        '-10px',
        left:          '50%',
        transform:     'translateX(-50%)',
        width:         '0',
        height:        '0',
        borderLeft:    '7px solid transparent',
        borderRight:   '7px solid transparent',
        borderTop:     '10px solid #ff99bb',
        pointerEvents: 'none',
    });
    div.appendChild(tailEl);

    wrap.appendChild(div);
    bubble = div;
    return div;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function applyEmotion(emotion) {
    const s = emotionStyle[emotion] || emotionStyle.happy;
    bubble.style.background     = s.bg;
    bubble.style.borderColor    = s.border;
    bubble.style.color          = s.color;
    tailEl.style.borderTopColor = s.tail;
}

function typeWrite(text, onDone) {
    if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
    textEl.textContent = '';
    let i = 0;
    function tick() {
        if (!visible) return;
        textEl.textContent = text.slice(0, i + 1);
        i++;
        if (i < text.length) {
            const ch    = text[i - 1];
            const delay = /[.,!?…~<>]/.test(ch)
                ? 110 + Math.random() * 70
                :  26 + Math.random() * 20;
            typeTimer = setTimeout(tick, delay);
        } else {
            if (onDone) onDone();
        }
    }
    typeTimer = setTimeout(tick, 30);
}

function popIn() {
    bubble.style.opacity   = '1';
    bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(1)';
}

function popOut(onDone) {
    bubble.style.opacity   = '0';
    bubble.style.transform = 'translateX(-50%) translateY(-100%) scale(0.85)';
    setTimeout(onDone, 280);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CYCLE LOOP  (idle thoughts)
// ═══════════════════════════════════════════════════════════════════════════════
function cycleMessage() {
    if (!visible || !bubble) return;
    if (customMessageActive) return;

    // FPV mode — use the HUD idle thought overlay instead of the bubble
    if (state.cameraMode === 'fpv') {
        const now         = performance.now();
        const cooldownEnd = state.fpvCustomMessageEndTime + 3500;
        const delay       = Math.max(0, cooldownEnd - now) + 500 + Math.random() * 1500;
        messageTimer = setTimeout(() => {
            if (!visible || state.cameraMode !== 'fpv') return;
            const { text, emotion } = pickMessage();
            showIdleThought(text, 4000, emotion);
            messageTimer = setTimeout(cycleMessage, 4000 + 1000 + Math.random() * 2000);
        }, delay);
        return;
    }

    // Standard bubble
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

// ═══════════════════════════════════════════════════════════════════════════════
//  POSITION ABOVE HEAD  (called every frame from kagura.js)
// ═══════════════════════════════════════════════════════════════════════════════
function updateBubblePosition() {
    if (!bubble || !state.claw || !state.camera) return;
    const wrapper = document.querySelector('.canvas-wrap');
    if (!wrapper) return;

    const worldPos = state.claw.position.clone();
    worldPos.y += 0.8;
    const vector = worldPos.project(state.camera);
    if (vector.z > 1) { bubble.style.opacity = '0'; return; }

    const rect     = wrapper.getBoundingClientRect();
    const x        = (vector.x *  0.5 + 0.5) * rect.width;
    const y        = (vector.y * -0.5 + 0.5) * rect.height;
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

// ═══════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════
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
    if (postCustomTimer) { clearTimeout(postCustomTimer); postCustomTimer = null; }
}