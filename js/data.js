const DataSystem = {
  cards: [],
  homepage: null,

  async loadCards() {
    try {
      this.cards = await githubDB.fetchCardsFromRaw();
    } catch (e) {
      console.warn('Loading cards from raw failed, using localStorage fallback');
      this.cards = localStorage.getItem('local_cards') ? JSON.parse(localStorage.getItem('local_cards')) : [];
    }
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

  // Check if a username already exists
  isUsernameTaken(username) {
    return this.cards.some(c => c.coreIdentity?.username?.toLowerCase() === username.toLowerCase());
  }
};