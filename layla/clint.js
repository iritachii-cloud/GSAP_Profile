// ============================================
//  Clint's complete dialogue library
//  Used by: speechBubble, familyChase, npcIdle
// ============================================

// ----- IDLE LINES (while roaming or waiting) -----
export const CLINT_IDLE = [
    { text: "She's gonna catch me eventually… but I'll look good running. 😎", emotion: 'flirty' },
    { text: "Hair gel check: perfect. Cannon charge: terrifyingly beautiful.", emotion: 'happy' },
    { text: "I think Nolan is taking notes on my running form. Cute.", emotion: 'playful' },
    { text: "Lillian's already calculating my top speed. No pressure!", emotion: 'cheeky' },
    { text: "If I get caught, at least I get a kiss. Worth it. 💙", emotion: 'flirty' },
    { text: "Maybe I should upgrade my phone for better selfies while fleeing.", emotion: 'excited' },
    { text: "The energy pylons are cool, but have you seen my girlfriend?", emotion: 'proud' },
    { text: "I swear Layla’s cannon gets more powerful every day. Help.", emotion: 'worried' },
    { text: "Note to self: bring flowers next time. Even if I'm being chased.", emotion: 'peaceful' },
    { text: "I bet I can run faster if I hold her hand. (Physics says no, but love says yes.)", emotion: 'flirty' },
    { text: "The plasma fence looks scary, but not as scary as Layla's smile when she's about to win.", emotion: 'embarrassed' },
    { text: "I'm not running away, I'm running toward a romantic photo opportunity.", emotion: 'cheeky' },
    { text: "Note: ask Nolan how he survived Lillian's EMP. For future reference.", emotion: 'curious' },
    { text: "I love this family. Even when they chase me like a rogue experiment.", emotion: 'happy' },
    { text: "If Layla's energy is infinite, so is my love for her — so there.", emotion: 'flirty' },
    { text: "I should design a running shoe with extra sparkle trails.", emotion: 'excited' },
    { text: "Her cannon blast is like a shooting star — beautiful and absolutely terrifying.", emotion: 'peaceful' },
    { text: "Maybe today she'll let me win. (She won't, but a guy can hope.)", emotion: 'playful' },
    { text: "I need a good playlist for all this fleeing. Something romantic but energetic.", emotion: 'curious' },
    { text: "This tinkerer's world is crazy, but I'd chase her through any dimension.", emotion: 'happy' },
];

// ----- CHASE LINES (when Layla is searching for Clint) -----
export const CLINT_CHASE = [
    { text: "Layla~! I've been waiting for you! Catch me if you dare! 😎", emotion: 'flirty' },
    { text: "Over here, babe! Right where you left me (not).", emotion: 'playful' },
    { text: "Your energy signature is so bright today — I can feel the love (and fear).", emotion: 'happy' },
    { text: "I'm ready! Are you? (No I'm not.)", emotion: 'cheeky' },
    { text: "Come on, give me your best shot! …Wait, not literally.", emotion: 'worried' },
    { text: "One selfie before you catch me? Deal?", emotion: 'flirty' },
    { text: "I've been training. Sort of. I stretched once.", emotion: 'embarrassed' },
];

// ----- FLEE LINES (when Layla gets close) -----
export const CLINT_FLEE = [
    { text: "Nope, too close! My hair can't handle the wind! 💨", emotion: 'playful' },
    { text: "You're fast, but my charm is faster! (Sort of.)", emotion: 'cheeky' },
    { text: "Round two! I mean, round whatever! Let me count later!", emotion: 'excited' },
    { text: "If you catch me, I'll let you hold my phone! Deal? No deal, I'm running!", emotion: 'flirty' },
    { text: "Ahhh! The cannon is charging! Cute, but also terrifying!", emotion: 'worried' },
    { text: "I need better cardio — but until then, I'll distract you with my smile!", emotion: 'playful' },
    { text: "You're absolutely glowing right now. And very close. I'm outta here!", emotion: 'embarrassed' },
];

// ----- CAUGHT LINES (final round, he's done) -----
export const CLINT_CAUGHT = [
    { text: "You finally got me! Now what? Group hug? 🥰", emotion: 'happy' },
    { text: "Alright, alright — you win. Let's go home together~ 💙", emotion: 'flirty' },
    { text: "Your parents are staring… I'm blushing so hard.", emotion: 'embarrassed' },
    { text: "Okay okay! You're the best chaser. Now can I get a kiss? 💋", emotion: 'playful' },
    { text: "Caught! I surrender my heart (and my phone) to you, as always.", emotion: 'happy' },
];

// ----- SIDELINE CHEERS (during Nolan or Lillian chase – not usually, but if needed) -----
export const CLINT_CHEER = [
    { text: "You go, Layla! Show 'em what that cannon can do! 💥", emotion: 'excited' },
    { text: "That's my girl! Even when I'm not the one being chased!", emotion: 'proud' },
    { text: "Nolan, Lillian — you can't outrun her light!", emotion: 'playful' },
];

// ----- INTERACTION GREETINGS (for NPC roaming) -----
export const CLINT_GREETINGS = {
    layla:   { text: "Hey gorgeous! Ready for our next chase? Or maybe just a walk? 💙", emotion: 'flirty' },
    nolan:   { text: "Sir! I promise I charged my phone for the selfie this time!", emotion: 'embarrassed' },
    lillian: { text: "Ma'am, I swear I'll keep her cannon charged and her heart happy.", emotion: 'protective' },
};

export const CLINT_FAREWELL = {
    layla:   { text: "Catch you later, spark‑queen! Literally. ⚡", emotion: 'cheeky' },
    nolan:   { text: "I'll take good care of her, sir. Promise.", emotion: 'determined' },
    lillian: { text: "Thanks for the advice, ma'am! I'll keep running… I mean, keep trying.", emotion: 'happy' },
};