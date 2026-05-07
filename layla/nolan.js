// ============================================
//  Nolan's complete dialogue library  
//  Used by: speechBubble, familyChase, npcIdle
// ============================================

// ----- IDLE LINES (when he's just standing around) -----
export const NOLAN_IDLE = [
    { text: "A good tinkerer always keeps his tools sharp! 🔧", emotion: 'peaceful' },
    { text: "I wonder if Layla needs a cannon tune‑up today?", emotion: 'curious' },
    { text: "Hmm, maybe I should recalibrate the drone station…", emotion: 'techy' },
    { text: "Nothing beats a father‑daughter chase!", emotion: 'happy' },
    { text: "Lillian probably thinks I'm lost. I'm not lost.", emotion: 'cheeky' },
    { text: "Did I leave the gear‑oil on the workbench again?", emotion: 'worried' },
    { text: "Layla's energy signature is strong today — that's my girl!", emotion: 'proud' },
    { text: "If Clint breaks her heart, I'll reprogram his phone to only open selfies.", emotion: 'playful' },
    { text: "Maybe I should build a snack‑dispenser drone…", emotion: 'excited' },
    { text: "The energy pylons are humming beautifully.", emotion: 'peaceful' },
    { text: "I'm not old, I'm mechanically experienced!", emotion: 'annoyed' },
    { text: "I think I saw a spark‑cat near the dome. Better not tell Lillian.", emotion: 'playful' },
    { text: "Back in my day, we charged cannons with hand‑cranks!", emotion: 'proud' },
    { text: "That plasma fence design was mine, you know.", emotion: 'techy' },
    { text: "I hope Layla remembered to eat lunch…", emotion: 'protective' },
    { text: "My back hurts. Worth it though.", emotion: 'peaceful' },
    { text: "Where did I put my favorite spanner?", emotion: 'curious' },
    { text: "The steam clouds look extra fluffy today.", emotion: 'happy' },
    { text: "I could use a cup of energy‑brew right about now.", emotion: 'peaceful' },
    { text: "I'll let her win the next chase. (Maybe.)", emotion: 'cheeky' },
];

// ----- CHASE LINES (when Layla is searching for him) -----
export const NOLAN_CHASE = [
    { text: "Layla! Over here, sweetie! 🥺⚡", emotion: 'happy' },
    { text: "You're getting warmer! (Literally, I feel the cannon)", emotion: 'playful' },
    { text: "Don't worry, Dad's not going anywhere!", emotion: 'protective' },
    { text: "I can hear your gears turning — you're close!", emotion: 'excited' },
    { text: "If you catch me, I'll tell you where Mom is!", emotion: 'cheeky' },
    { text: "Slow and steady wins the hug, my little light!", emotion: 'peaceful' },
    { text: "I'm right here! Look for the old man with the wrench!", emotion: 'excited' },
];

// ----- FLEE LINES (when Layla gets close before a new round) -----
export const NOLAN_FLEE = [
    { text: "Nope nope nope! One more lap! 🏃", emotion: 'playful' },
    { text: "You're fast, but I've got dad‑speed!", emotion: 'excited' },
    { text: "Round 2? Round 3? I'm up for it!", emotion: 'determined' },
    { text: "I've still got a few tricks up my sleeve!", emotion: 'cheeky' },
];

// ----- CAUGHT LINES (after final round) -----
export const NOLAN_CAUGHT = [
    { text: "Alright alright, you got your old man! Now let's team up! 💙", emotion: 'happy' },
    { text: "You're way too fast — I concede! Now let's find your mother.", emotion: 'excited' },
    { text: "Fine, you win! But I'm claiming the next hug first.", emotion: 'playful' },
    { text: "I'm so proud of you, my little energy star!", emotion: 'proud' },
];

// ----- SUGGEST FINDING LILLIAN -----
export const NOLAN_SUGGEST_LILLIAN = [
    { text: "Now let's track down your mother! She can't be far — I smell her soldering iron.", emotion: 'excited' },
    { text: "Mom's probably tinkering with her drone again. Let's go!", emotion: 'playful' },
];

// ----- SIDELINE CHEERS (during Clint chase) -----
export const NOLAN_CHEER = [
    { text: "Go Layla! You've got him!", emotion: 'excited' },
    { text: "That's my girl! Keep running!", emotion: 'proud' },
    { text: "Clint, you can't outrun our daughter!", emotion: 'playful' },
    { text: "She's gaining on you, son! Better sprint!", emotion: 'happy' },
];

// ----- INTERACTION GREETINGS (for NPC roaming) -----
export const NOLAN_GREETINGS = {
    layla:   { text: "Hello little light! Everything charged up? ⚡", emotion: 'happy' },
    lillian: { text: "My brilliant wife! Need any help in the lab?", emotion: 'flirty' },
    clint:   { text: "Take care of her, son. Or I'll short‑circuit your phone.", emotion: 'playful' },
};

export const NOLAN_FAREWELL = {
    layla:   { text: "Don't overcharge yourself, sweetie!", emotion: 'protective' },
    lillian: { text: "I'll be in the workshop if you need me, love.", emotion: 'happy' },
    clint:   { text: "Keep making her smile, son. That's an order.", emotion: 'determined' },
};