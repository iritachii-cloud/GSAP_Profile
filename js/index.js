class App {
  constructor() {
    this.theme = ThemeManager.get();
    this.dm = new DataManager();
    this.auth = new AuthSystem(this.dm);
    this.navigation = new Navigation('#main-nav');
    this.hero3D = new Hero3D();
    this.loginHandler = new LoginHandler(this.auth);
    this.registerHandler = new RegistrationHandler(this.auth);
    this.currentVerifyingUsername = null;
  }

  async init() {
    // Apply initial theme
    ThemeManager.apply(this.theme);
    this.navigation.render(this.theme);
    document.getElementById('site-logo').textContent = this.theme === 'dark' ? '🕷️ Shadow Claws' : '🐱 Kitty Archive';

    // Init 3D and scroll
    this.hero3D.init(this.theme);
    this.hero3D.startScrollAnimation(this.theme);

    // Check if already logged in
    if (SessionManager.isLoggedIn()) {
      const user = SessionManager.get();
      document.getElementById('hero-text-container').innerHTML = `👋 Welcome back,<br>${user.firstName}!`;
      document.getElementById('hero-actions').style.opacity = '1';
      document.getElementById('hero-actions').style.visibility = 'visible';
      document.getElementById('hero-actions').innerHTML = `<a href="profile.html" class="btn btn-primary">🐱 My Profile</a>`;
    }

    // Bind login/registration callbacks
    this.loginHandler.bind(
      () => window.location.href = 'profile.html',
      (card) => { this.currentVerifyingUsername = card.username; this.showVerification(card.email, card.verificationCode); }
    );
    this.registerHandler.bind(
      (card) => { this.currentVerifyingUsername = card.username; this.showVerification(card.email, card.verificationCode); }
    );

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const newTheme = ThemeManager.toggle();
      this.navigation.render(newTheme);
      document.getElementById('site-logo').textContent = newTheme === 'dark' ? '🕷️ Shadow Claws' : '🐱 Kitty Archive';
      this.hero3D.switchTheme(newTheme);
    });

    // Form toggle links
    document.getElementById('btn-login').addEventListener('click', () => this.showAuthForm('login'));
    document.getElementById('btn-register').addEventListener('click', () => this.showAuthForm('register'));
    document.getElementById('show-register-from-login').addEventListener('click', (e) => { e.preventDefault(); this.showAuthForm('register'); });
    document.getElementById('show-login-from-register').addEventListener('click', (e) => { e.preventDefault(); this.showAuthForm('login'); });
    document.getElementById('forgot-password-link').addEventListener('click', (e) => { e.preventDefault(); alert('Password reset link would be sent to your registered email (simulated).'); });

    // Verification
    document.getElementById('verify-btn').addEventListener('click', async () => {
      const code = document.getElementById('verification-input').value.trim();
      const msgDiv = document.getElementById('verify-message');
      if (!this.currentVerifyingUsername) return;
      const result = await this.auth.verifyEmail(this.currentVerifyingUsername, code);
      if (result.success) {
        msgDiv.textContent = '✅ Verified! Redirecting...';
        setTimeout(() => window.location.href = 'profile.html', 1500);
      } else {
        msgDiv.textContent = '❌ ' + result.reason;
        msgDiv.style.color = 'red';
      }
    });
  }

  showAuthForm(type) {
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('verification-container').classList.add('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
    if (type === 'login') document.getElementById('login-form-container').classList.remove('hidden');
    else if (type === 'register') document.getElementById('register-form-container').classList.remove('hidden');
    document.getElementById('auth-section').scrollIntoView({ behavior: 'smooth' });
  }

  showVerification(email, code) {
    document.getElementById('login-form-container').classList.add('hidden');
    document.getElementById('register-form-container').classList.add('hidden');
    document.getElementById('verification-container').classList.remove('hidden');
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('verify-email-display').textContent = email;
    document.getElementById('verify-code-display').textContent = code;
    document.getElementById('verification-input').value = '';
    document.getElementById('verify-message').textContent = '';
    document.getElementById('auth-section').scrollIntoView({ behavior: 'smooth' });
  }
}