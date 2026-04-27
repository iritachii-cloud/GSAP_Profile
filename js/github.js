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

  async _getFile() {
    const url = `${this.base}${this.path}`;
    const res = await fetch(url, {
      headers: { Authorization: `token ${this.token}` }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`GitHub API error ${res.status}: ${err.message}`);
    }
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
    const body = JSON.stringify({
      message,
      content: this._toBase64(newJson),
      sha
    });
    const res = await fetch(`${this.base}${this.path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${this.token}`,
        'Content-Type': 'application/json'
      },
      body
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Commit failed: ${res.status} ${err.message}`);
    }
  }

  async fetchCardsFromRaw() {
    if (this.useLocal) {
      let cards = localStorage.getItem('local_cards');
      return cards ? JSON.parse(cards) : [];
    }
    const raw = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${this.path}`;
    const res = await fetch(raw);
    if (!res.ok) throw new Error(`Raw fetch failed (${res.status})`);
    const json = await res.json();
    return json.cards || json;
  }

  async addCard(card) {
    if (this.useLocal) {
      let cards = localStorage.getItem('local_cards');
      cards = cards ? JSON.parse(cards) : [];
      cards.push(card);
      localStorage.setItem('local_cards', JSON.stringify(cards));
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
      let cards = localStorage.getItem('local_cards');
      cards = cards ? JSON.parse(cards) : [];
      const idx = cards.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Card not found');
      cards[idx] = updatedCard;
      localStorage.setItem('local_cards', JSON.stringify(cards));
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
      let cards = localStorage.getItem('local_cards');
      cards = cards ? JSON.parse(cards) : [];
      cards = cards.filter(c => c.id !== id);
      localStorage.setItem('local_cards', JSON.stringify(cards));
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