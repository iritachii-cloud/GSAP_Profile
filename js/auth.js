const UserSession = {
  get() {
    const data = localStorage.getItem('userCard');
    return data ? JSON.parse(data) : null;
  },
  set(card) {
    localStorage.setItem('userCard', JSON.stringify(card));
  },
  clear() {
    localStorage.removeItem('userCard');
  },
  isLoggedIn() {
    return !!localStorage.getItem('userCard');
  }
};