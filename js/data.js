// Example DataManager for another page (e.g., profile.html).
// You can copy this file and adjust Github credentials/path as needed.
class PageDataManager {
  constructor() {
    this.github = new GitHubAPI(
      window.GITHUB_TOKEN,
      window.GITHUB_REPO_OWNER,
      window.GITHUB_REPO_NAME,
      window.CARDS_FILE_PATH || 'data/cards.json'
    );
    this.cards = [];
  }

  async load() {
    try { this.cards = await this.github.fetchCards(); }
    catch(e) { this.cards = []; }
  }

  getCardById(id) {
    return this.cards.find(c => c.id === id);
  }

  // Add other methods as needed (update, delete, etc.)
  async updateCard(id, updatedCard) {
    await this.github.updateCard(id, updatedCard);
    // refresh local copy
    await this.load();
  }
}