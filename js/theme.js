class ThemeManager {
  static KEY = 'site_theme';

  // Get stored theme (default 'light')
  static get() {
    return localStorage.getItem(ThemeManager.KEY) || 'light';
  }

  // Save theme choice
  static set(theme) {
    localStorage.setItem(ThemeManager.KEY, theme);
  }

  // Apply theme to body and update icon
  static apply(theme) {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  // Toggle between themes and return new theme
  static toggle() {
    const current = ThemeManager.get();
    const next = current === 'light' ? 'dark' : 'light';
    ThemeManager.set(next);
    ThemeManager.apply(next);
    return next;
  }
}