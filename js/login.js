class LoginHandler {
  constructor(authSystem) {
    this.auth = authSystem;
    this.form = document.getElementById('login-form');
    this.messageDiv = document.getElementById('login-message');
    this.onSuccess = () => {}; // callback to redirect
    this.onPending = null; // callback for pending accounts (show verification)
  }

  bind(onSuccess, onPending) {
    this.onSuccess = onSuccess;
    this.onPending = onPending;
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const result = await this.auth.login(username, password);
      if (result.success) {
        this.onSuccess();
      } else if (result.reason === 'pending') {
        if (this.onPending) this.onPending(result.card);
      } else {
        this.messageDiv.textContent = '❌ ' + result.reason;
        this.messageDiv.style.color = 'red';
      }
    });
  }
}