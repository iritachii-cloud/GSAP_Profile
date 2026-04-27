const DataSystem = {
  cards: [],
  homepage: null,

  async loadCards() {
    try {
      this.cards = await githubDB.fetchCardsFromRaw();
    } catch {
      try {
        const res = await fetch('data/cards.json');
        const data = await res.json();
        this.cards = data.cards || data;
      } catch { this.cards = []; }
    }
    console.log(`Loaded ${this.cards.length} shadow cards`);
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
  }
};