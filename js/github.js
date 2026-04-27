// github.js – Full CRUD, works locally (localStorage) or with GitHub API
class GitHubAPI {
  constructor() {
    this.token = window.GITHUB_TOKEN;
    this.owner = window.GITHUB_REPO_OWNER;
    this.repo  = window.GITHUB_REPO_NAME;
    this.path  = window.CARDS_FILE_PATH || 'data/cards.json';
    this.branch = 'main';
    this.base = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/`;
    this.useLocal = !this.token;   // if no token, use localStorage
  }

  // ---------- Local storage helpers ----------
  _localKey() {
    return `local_cards_${this.owner}_${this.repo}`;
  }

  _loadLocal() {
    const raw = localStorage.getItem(this._localKey());
    return raw ? JSON.parse(raw) : [];
  }

  _saveLocal(cards) {
    localStorage.setItem(this._localKey(), JSON.stringify(cards));
  }

  // ---------- GitHub helpers ----------
  async _getFile() {
    const url = `${this.base}${this.path}`;
    const res = await fetch(url, {
      headers: { Authorization: `token ${this.token}` }
    });
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
    const data = await res.json();
    return {
      sha: data.sha,
      content: data.content ? atob(data.content) : '[]'
    };
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
    if (!res.ok) throw new Error(`Commit failed ${res.status}`);
  }

  // ---------- Public API ----------

  async fetchCardsFromRaw() {
    if (this.useLocal) {
      // Local: try to load from local fallback JSON file on first run,
      // then merge with localStorage.
      let cards = this._loadLocal();
      if (cards.length === 0) {
        // First time: load from data/cards.json
        try {
          const res = await fetch('data/cards.json');
          const json = await res.json();
          cards = json.cards || json;
          this._saveLocal(cards);  // seed localStorage
        } catch (e) {
          console.warn('No local cards.json found, starting empty.');
          cards = [];
        }
      }
      return cards;
    } else {
      // GitHub mode: fetch from raw URL
      const raw = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${this.path}`;
      const res = await fetch(raw);
      if (!res.ok) throw new Error(`Raw fetch failed (${res.status})`);
      const json = await res.json();
      return json.cards || json;
    }
  }

  async addCard(card) {
    if (this.useLocal) {
      const cards = this._loadLocal();
      cards.push(card);
      this._saveLocal(cards);
    } else {
      const { sha, content } = await this._getFile();
      let cards = JSON.parse(content);
      if (!Array.isArray(cards)) cards = cards.cards || [];
      cards.push(card);
      await this._commit(cards, `➕ Add card ${card.id}`, sha);
    }
  }

  async updateCard(id, updatedCard) {
    if (this.useLocal) {
      const cards = this._loadLocal();
      const idx = cards.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Card not found');
      cards[idx] = updatedCard;
      this._saveLocal(cards);
    } else {
      const { sha, content } = await this._getFile();
      let cards = JSON.parse(content);
      if (!Array.isArray(cards)) cards = cards.cards || [];
      const idx = cards.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Card not found');
      cards[idx] = updatedCard;
      await this._commit(cards, `✏️ Update card ${id}`, sha);
    }
  }

  async deleteCard(id) {
    if (this.useLocal) {
      let cards = this._loadLocal();
      cards = cards.filter(c => c.id !== id);
      this._saveLocal(cards);
    } else {
      const { sha, content } = await this._getFile();
      let cards = JSON.parse(content);
      if (!Array.isArray(cards)) cards = cards.cards || [];
      cards = cards.filter(c => c.id !== id);
      await this._commit(cards, `🗑️ Delete card ${id}`, sha);
    }
  }
}

const githubDB = new GitHubAPI();