class SessionManager {
  static KEY = 'shadow_user_session';
  static get() { const data = localStorage.getItem(SessionManager.KEY); return data ? JSON.parse(data) : null; }
  static set(card) { localStorage.setItem(SessionManager.KEY, JSON.stringify(card)); }
  static clear() { localStorage.removeItem(SessionManager.KEY); }
  static isLoggedIn() { return !!localStorage.getItem(SessionManager.KEY); }
}

class DataManager {
  constructor() {
    this.github = new GitHubAPI(window.GITHUB_TOKEN, window.GITHUB_REPO_OWNER, window.GITHUB_REPO_NAME, window.CARDS_FILE_PATH || 'data/cards.json');
    this.cards = [];
  }
  async loadCards() {
    try { this.cards = await this.github.fetchCards(); } catch(e) { this.cards = []; }
    this.cards = this.cards.map(c => ({ ...c, status:c.status||'active', email:c.email||'', password:c.password||'', verificationCode:c.verificationCode||'0000' }));
  }
  getCardByUsername(username) { return this.cards.find(c => c.username && c.username.toLowerCase() === username.toLowerCase()); }
  async isUsernameTaken(username) { await this.loadCards(); return !!this.getCardByUsername(username); }
  async addCard(card) { await this.github.addCard(card); }
  async updateCard(id, updatedCard) { await this.github.updateCard(id, updatedCard); }
}

class AuthSystem {
  constructor(dataManager) { this.dm = dataManager; }
  async login(username, password) {
    await this.dm.loadCards();
    const card = this.dm.getCardByUsername(username);
    if (!card) return { success:false, reason:'User not found' };
    const hash = await Utils.sha256(password);
    if (hash !== card.password) return { success:false, reason:'Wrong password' };
    if (card.status === 'pending') return { success:false, reason:'pending', card };
    if (card.status !== 'active') return { success:false, reason:'Account not active' };
    SessionManager.set(card);
    return { success:true, card };
  }
  async register(formData) {
    if (formData.password !== formData.confirmPassword) return { success:false, reason:'Passwords do not match' };
    const taken = await this.dm.isUsernameTaken(formData.username);
    if (taken) return { success:false, reason:'Username already taken' };
    const hash = await Utils.sha256(formData.password);
    let dpPath = 'assets/images/default-dp.png';
    if (formData.dpFile) {
      const base64 = await this.fileToBase64(formData.dpFile);
      dpPath = `assets/dp/${formData.username}/display.png`;
      try { await this.dm.github.uploadFile(dpPath, base64.split(',')[1], `DP for ${formData.username}`); } catch(e) { console.warn('DP upload failed'); }
    }
    const card = {
      id: Utils.generateId(12), username: formData.username, password: hash,
      secretCode: formData.secretCode, email: formData.email,
      firstName: formData.firstName, lastName: formData.lastName,
      status: 'pending', verificationCode: Math.floor(1000+Math.random()*9000).toString(), dp: dpPath
    };
    await this.dm.addCard(card);
    return { success:true, card };
  }
  async verifyEmail(username, code) {
    await this.dm.loadCards();
    const card = this.dm.getCardByUsername(username);
    if (!card) return { success:false, reason:'User not found' };
    if (card.verificationCode !== code) return { success:false, reason:'Invalid code' };
    card.status = 'active';
    await this.dm.updateCard(card.id, card);
    SessionManager.set(card);
    return { success:true, card };
  }
  fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
}