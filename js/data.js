const DataSystem = {
  cards: [],
  homepage: null,

  async loadCards() {
    try {
      this.cards = await githubDB.fetchCardsFromRaw();
    } catch (e) {
      console.warn('Failed to load cards, using localStorage fallback');
      this.cards = [];
    }
    // Backward compatibility: if a card has no "status", set it to "active"
    this.cards = this.cards.map(card => ({
      ...card,
      status: card.status || 'active',
      // Also ensure other new fields exist (they will be filled in edit anyway)
      email: card.email || '',
      verificationCode: card.verificationCode || '0000',
    }));
    console.log('Cards normalized:', this.cards.length);
  },

  async loadHomepage() {
    try {
      const res = await fetch('data/homepage.json');
      this.homepage = await res.json();
    } catch {
      this.homepage = null;
    }
  },

  getCardById(id) {
    return this.cards.find(c => c.id === id);
  },

  getBySecret(id, secret) {
    return this.cards.find(c => c.id === id && c.secretCode === secret);
  },

  isUsernameTaken(username) {
    return this.cards.some(c => c.coreIdentity?.username?.toLowerCase() === username.toLowerCase());
  }
};