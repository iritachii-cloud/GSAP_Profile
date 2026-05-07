// ============================================
//  Layla's complete dialogue library  
//  Used by: speechBubble, familyChase, fpvHUD
// ============================================

// ----- IDLE THOUGHTS (day) -----
export const LAYLA_IDLE_DAY = [
    { text: "My cannon's humming perfectly today ⚡", emotion: 'happy' },
    { text: "Where did Dad wander off to? He promised snacks!", emotion: 'curious' },
    { text: "Mom's probably re‑calibrating the drone tracker again.", emotion: 'playful' },
    { text: "Clint better be charging his phone for selfies later 📸", emotion: 'flirty' },
    { text: "The energy river looks like liquid sapphire today~", emotion: 'peaceful' },
    { text: "I love the smell of ozone in the morning!", emotion: 'excited' },
    { text: "Maybe I should test the cannon on that pylon… just kidding 💙", emotion: 'playful' },
    { text: "All systems nominal, heart happily overcharged 💡", emotion: 'happy' },
    { text: "I wonder if the security bots get bored too.", emotion: 'curious' },
    { text: "Could really go for a spark‑cake right now.", emotion: 'cheeky' },
    { text: "The gear‑sprites are extra shiny today!", emotion: 'excited' },
    { text: "Dad once tried to fix my cannon… we don't talk about it.", emotion: 'embarrassed' },
];

// ----- IDLE THOUGHTS (night) -----
export const LAYLA_IDLE_NIGHT = [
    { text: "Night mode: stars and sparks ✨", emotion: 'peaceful' },
    { text: "Clint is totally scared of the dark. (He won't admit it)", emotion: 'playful' },
    { text: "Mom's night‑vision goggles are ridiculously good.", emotion: 'curious' },
    { text: "The fire‑sparks look like tiny lanterns tonight.", emotion: 'happy' },
    { text: "Everything glows so much more… it's magical.", emotion: 'peaceful' },
    { text: "Dad left a trail of tools again. I'll trip.", emotion: 'worried' },
    { text: "Maybe I'll let Clint catch me once… or twice.", emotion: 'flirty' },
    { text: "The lightning storm is beautiful from here.", emotion: 'excited' },
    { text: "Is that a shooting star or a crashing drone? 🔭", emotion: 'curious' },
    { text: "I should recharge soon… maybe after one more patrol.", emotion: 'determined' },
    { text: "The lab dome looks like a moon from here.", emotion: 'peaceful' },
    { text: "Warm sparks drifting everywhere… like a dream.", emotion: 'happy' },
];

// ----- CHASE REACTIONS (Nolan phase, 3 rounds) -----
export const LAYLA_CHASE_NOLAN = [
    // round 1
    { onSummon: "Dad! Where are you hiding? 🥺⚡",       emotion: 'curious' },
    { onCatch:   "Almost caught you! Stay put!",         emotion: 'excited' },
    // round 2
    { onSummon: "You moved again! No fair, old man!",    emotion: 'annoyed' },
    { onCatch:   "I'm getting closer! You can't outrun me!", emotion: 'determined' },
    // round 3 (final)
    { onSummon: "Last round, Dad! Prepare to be hugged!", emotion: 'playful' },
    { onCatch:   "Gotcha! Now let's find Mom together! 💙", emotion: 'happy' },
];

// ----- CHASE REACTIONS (Lillian phase, 3 rounds) -----
export const LAYLA_CHASE_LILLIAN = [
    // round 1
    { onSummon: "Mom! Your sensors won't save you this time!", emotion: 'excited' },
    { onCatch:   "Ha! Your EMP couldn't stop me!",          emotion: 'playful' },
    // round 2
    { onSummon: "She's fast, but I've got infinite energy!",  emotion: 'determined' },
    { onCatch:   "Almost there! Dad is cheering me on!",      emotion: 'happy' },
    // round 3 (final)
    { onSummon: "Final lap, Mom! Ready or not!",              emotion: 'excited' },
    { onCatch:   "We're all together now! Let's find Clint! 💙", emotion: 'happy' },
];

// ----- CHASE REACTIONS (Clint phase, 7 rounds) -----
export const LAYLA_CHASE_CLINT = [
    // round 1
    { onSummon: "Clint! I see you posing! Get ready to run! 📸", emotion: 'flirty' },
    { onCatch:   "Don't think I'll go easy on you!",            emotion: 'playful' },
    // round 2
    { onSummon: "Round 2! Your hair gel won't save you!",       emotion: 'cheeky' },
    { onCatch:   "My cannon is spark‑happy today!",             emotion: 'excited' },
    // round 3
    { onSummon: "You can't hide from love, Clint!",              emotion: 'flirty' },
    { onCatch:   "Dad and Mom are watching, don't embarrass me!", emotion: 'embarrassed' },
    // round 4
    { onSummon: "Halfway there! I can almost taste victory!",    emotion: 'determined' },
    { onCatch:   "You're slowing down, I can tell~",            emotion: 'playful' },
    // round 5
    { onSummon: "I'll charge faster than you can run!",          emotion: 'excited' },
    { onCatch:   "My energy is endless! ⚡",                     emotion: 'proud' },
    // round 6
    { onSummon: "One more push… I've got you!",                  emotion: 'determined' },
    { onCatch:   "This is the best workout ever!",               emotion: 'happy' },
    // round 7 (final)
    { onSummon: "Final round, boyfriend! Let's end this!",       emotion: 'cheeky' },
    { onCatch:   "Caught you! Now kiss me, you dork! 💙",        emotion: 'flirty' },
];

// ----- POST‑CATCH CELEBRATION -----
export const LAYLA_CELEBRATION = [
    { text: "We're all together… my heart is fully charged! ⚡💙", emotion: 'happy' },
    { text: "This is the best day ever — and I mean ever.",       emotion: 'peaceful' },
    { text: "I love you guys. Don't ever stop chasing me.",       emotion: 'happy' },
    { text: "Now who wants ice cream? Dad's buying! 🍦",          emotion: 'excited' },
];

// ----- INTERACTION GREETINGS (for NPC roaming) -----
export const LAYLA_GREETINGS = {
    nolan:   { text: "Hi Dad! Still haven't fixed my cannon, I see 😉", emotion: 'playful' },
    lillian: { text: "Mom! Did you recalibrate my plasma core again?", emotion: 'techy' },
    clint:   { text: "Hey cutie! Ready for another chase later? 💙", emotion: 'flirty' },
};

export const LAYLA_FAREWELL = {
    nolan:   { text: "See you at dinner, Dad! Don't be late!", emotion: 'happy' },
    lillian: { text: "Love you Mom! I'll bring the tools back.", emotion: 'peaceful' },
    clint:   { text: "Charge your phone for our selfie, okay? 📸", emotion: 'cheeky' },
};