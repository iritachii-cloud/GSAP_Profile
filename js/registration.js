class RegistrationHandler {
  constructor(authSystem) {
    this.auth = authSystem;
    this.form = document.getElementById('register-form');
    this.messageDiv = document.getElementById('register-message');
    this.onRegistered = null; // callback with card object (then show verification)
  }

  bind(onRegistered) {
    this.onRegistered = onRegistered;
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = {
        firstName: document.getElementById('reg-firstname').value.trim(),
        lastName: document.getElementById('reg-lastname').value.trim(),
        username: document.getElementById('reg-username').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value,
        confirmPassword: document.getElementById('reg-confirm-password').value,
        secretCode: document.getElementById('reg-secretcode').value.trim(),
        dpFile: document.getElementById('reg-dp').files[0] || null,
      };
      const result = await this.auth.register(formData);
      if (result.success) {
        this.messageDiv.textContent = '🎉 Shadow created! Verify your email.';
        if (this.onRegistered) this.onRegistered(result.card);
      } else {
        this.messageDiv.textContent = '❌ ' + result.reason;
        this.messageDiv.style.color = 'red';
      }
    });
  }
}