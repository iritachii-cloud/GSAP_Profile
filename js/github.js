class GitHubAPI {
  constructor() {
    this.token = window.GITHUB_TOKEN;
    this.owner = window.GITHUB_REPO_OWNER;
    this.repo  = window.GITHUB_REPO_NAME;
    this.path  = window.CARDS_FILE_PATH || 'data/cards.json';
    this.branch = 'main';
    this.base = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/`;
    this.useLocal = !this.token;
  }

  _localKey() { return 'shadow_cards'; }
  _loadLocal() {
    const raw = localStorage.getItem(this._localKey());
    return raw ? JSON.parse(raw) : null;
  }
  _saveLocal(cards) {
    localStorage.setItem(this._localKey(), JSON.stringify(cards));
  }

  _getDefaultCards() {
    return [
      {
        id: "Bijusayswaddup",
        secretCode: "ExampleSecret",
        status: "active",
        verificationCode: "0000",
        email: "biju@shadow.archive",
        coreIdentity: {
          firstName: "Biju",
          lastName: "Maharjan",
          nickname: "BOMB BOMB",
          username: "bijusayswaddup",
          dateOfBirth: "1999-04-14",
          age: 26,
          gender: "Male",
          nationality: "Nepali",
          bloodGroup: "O+"
        },
        officialDetails: {
          cardNumber: "CORE-001",
          cardType: "Shadow Lord",
          organization: "Joint",
          role: "Strategist & Developer",
          issueDate: "2026-01-01",
          expiryDate: "9999-01-01"
        },
        personalityTraits: {
          personalityType: "Ambivert (INTJ)",
          strengths: ["Creative","Loyal","Strategic"],
          weaknesses: ["Overthinking"],
          habits: ["Gaming"],
          petPeeves: ["Dishonesty"]
        },
        likesDislikes: { likes: ["Rain"], dislikes: ["Crowds"] },
        favorites: { musicGenre: "Lo-fi", artist: "RADWIMPS", color: "#7f5af0", quote: "Stay soft." },
        lifestyle: { hobbies: ["Coding"], skills: ["Design"], dreamDestination: "Japan" },
        digitalSocial: { gamerTag: "biju.exe", socialHandle: "@bijumaharjan" },
        storyMode: { lifeMotto: "Keep moving forward.", makesHappy: "Everything" },
        media: { dp: "assets/images/dp/biju.png", gallery: [] }
      }
    ];
  }

  async fetchCardsFromRaw() {
    if (!this.useLocal) {
      try {
        const raw = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${this.path}`;
        const res = await fetch(raw);
        if (res.ok) {
          const json = await res.json();
          const cards = json.cards || json;
          this._saveLocal(cards);
          return cards;
        }
      } catch (e) { console.warn('GitHub raw failed'); }
    }
    let cards = this._loadLocal();
    if (cards && cards.length > 0) return cards;
    try {
      const res = await fetch('data/cards.json');
      if (res.ok) {
        const json = await res.json();
        cards = json.cards || json;
        this._saveLocal(cards);
        return cards;
      }
    } catch (e) { console.warn('Local file failed'); }
    cards = this._getDefaultCards();
    this._saveLocal(cards);
    return cards;
  }

  async _getFile() {
    const url = `${this.base}${this.path}`;
    const res = await fetch(url, { headers: { Authorization: `token ${this.token}` } });
    if (!res.ok) throw new Error('GitHub API error');
    const data = await res.json();
    return { sha: data.sha, content: data.content ? atob(data.content) : '[]' };
  }

  _toBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }

  async _commit(cardsArray, message, sha) {
    const newJson = JSON.stringify({ cards: cardsArray }, null, 2);
    const body = JSON.stringify({ message, content: this._toBase64(newJson), sha });
    const res = await fetch(`${this.base}${this.path}`, {
      method: 'PUT',
      headers: { Authorization: `token ${this.token}`, 'Content-Type': 'application/json' },
      body
    });
    if (!res.ok) throw new Error('Commit failed');
  }

  async addCard(card) {
    if (this.useLocal) {
      const cards = this._loadLocal() || this._getDefaultCards();
      cards.push(card);
      this._saveLocal(cards);
      return;
    }
    const { sha, content } = await this._getFile();
    let cards = JSON.parse(content);
    if (!Array.isArray(cards)) cards = cards.cards || [];
    cards.push(card);
    await this._commit(cards, `➕ Add card ${card.id}`, sha);
  }

  async updateCard(id, updatedCard) {
    if (this.useLocal) {
      const cards = this._loadLocal() || this._getDefaultCards();
      const idx = cards.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Card not found');
      cards[idx] = updatedCard;
      this._saveLocal(cards);
      return;
    }
    const { sha, content } = await this._getFile();
    let cards = JSON.parse(content);
    if (!Array.isArray(cards)) cards = cards.cards || [];
    const idx = cards.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Card not found');
    cards[idx] = updatedCard;
    await this._commit(cards, `✏️ Update card ${id}`, sha);
  }

  async deleteCard(id) {
    if (this.useLocal) {
      let cards = this._loadLocal() || this._getDefaultCards();
      cards = cards.filter(c => c.id !== id);
      this._saveLocal(cards);
      return;
    }
    const { sha, content } = await this._getFile();
    let cards = JSON.parse(content);
    if (!Array.isArray(cards)) cards = cards.cards || [];
    cards = cards.filter(c => c.id !== id);
    await this._commit(cards, `🗑️ Delete card ${id}`, sha);
  }
}

const githubDB = new GitHubAPI();