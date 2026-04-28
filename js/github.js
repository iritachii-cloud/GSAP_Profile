class GitHubAPI {
  constructor(token, owner, repo, cardsPath) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.cardsPath = cardsPath || 'data/cards.json';
    this.branch = 'main';
    this.base = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/`;
    this.useLocal = !this.token || this.token === '#####';
  }
  _localKey() { return 'test_shadow_cards'; }
  _loadLocal() {
    const raw = localStorage.getItem(this._localKey());
    return raw ? JSON.parse(raw) : [];
  }
  _saveLocal(cards) {
    localStorage.setItem(this._localKey(), JSON.stringify(cards));
  }
  async fetchCards() {
    if (!this.useLocal) {
      try {
        const raw = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${this.cardsPath}`;
        const res = await fetch(raw);
        if (res.ok) {
          const json = await res.json();
          const cards = json.cards || json;
          this._saveLocal(cards);
          return cards;
        }
      } catch (e) { console.warn('GitHub raw fetch failed, falling back'); }
    }
    return this._loadLocal();
  }
  async _getFile(path) {
    const url = `${this.base}${path}`;
    const res = await fetch(url, { headers: { Authorization: `token ${this.token}` } });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();
    return { sha: data.sha, content: data.content ? atob(data.content) : '' };
  }
  _toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  async _commitCards(cardsArray, message, sha) {
    const newJson = JSON.stringify({ cards: cardsArray }, null, 2);
    const body = JSON.stringify({ message, content: this._toBase64(newJson), sha });
    const res = await fetch(`${this.base}${this.cardsPath}`, {
      method: 'PUT',
      headers: { Authorization: `token ${this.token}`, 'Content-Type': 'application/json' },
      body
    });
    if (!res.ok) throw new Error('Commit failed');
  }
  async addCard(card) {
    if (this.useLocal) { const cards = this._loadLocal(); cards.push(card); this._saveLocal(cards); return; }
    const { sha, content } = await this._getFile(this.cardsPath);
    let cards = JSON.parse(content);
    if (!Array.isArray(cards)) cards = cards.cards || [];
    cards.push(card);
    await this._commitCards(cards, `➕ Add card ${card.id}`, sha);
  }
  async updateCard(id, updatedCard) {
    if (this.useLocal) { const cards = this._loadLocal(); const idx = cards.findIndex(c => c.id === id); if (idx === -1) throw new Error('Card not found'); cards[idx] = updatedCard; this._saveLocal(cards); return; }
    const { sha, content } = await this._getFile(this.cardsPath);
    let cards = JSON.parse(content);
    if (!Array.isArray(cards)) cards = cards.cards || [];
    const idx = cards.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Card not found');
    cards[idx] = updatedCard;
    await this._commitCards(cards, `✏️ Update card ${id}`, sha);
  }
  async uploadFile(path, base64Content, message = 'Upload file') {
    if (this.useLocal) return;
    const url = `${this.base}${path}`;
    let sha = null;
    try { const getRes = await fetch(url, { headers: { Authorization: `token ${this.token}` } }); if (getRes.ok) { const data = await getRes.json(); sha = data.sha; } } catch (e) {}
    const body = JSON.stringify({ message, content: base64Content, ...(sha ? { sha } : {}) });
    const res = await fetch(url, { method: 'PUT', headers: { Authorization: `token ${this.token}`, 'Content-Type': 'application/json' }, body });
    if (!res.ok) throw new Error('File upload failed');
  }
  async deleteFile(path) {
    if (this.useLocal) return;
    const { sha } = await this._getFile(path);
    const url = `${this.base}${path}`;
    const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `token ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Delete ${path}`, sha }) });
    if (!res.ok) throw new Error('File delete failed');
  }
}