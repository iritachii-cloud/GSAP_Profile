class Navigation {
  constructor(navSelector = '#main-nav') {
    this.nav = document.querySelector(navSelector);
  }

  getLinks(theme) {
    if (theme === 'dark') {
      // already non‑generic, kept as before
      return [
        { text: '🏴‍☠️ Lair',      href: 'index.html',   id: 'nav-home' },
        { text: '🗡️ Grimoire',   href: 'about.html',   id: 'nav-about' },
        { text: '🔮 Crows',      href: 'contact.html',  id: 'nav-contact' },
        { text: '🩸 Claw Card',  href: 'card.html',     id: 'nav-card' },
      ];
    } else {
      // 🌸 Hello Kitty‑themed, no generic labels
      return [
        { text: '🌸 Sanctuary',  href: 'index.html',   id: 'nav-home' },
        { text: '📜 Whiskers',   href: 'about.html',   id: 'nav-about' },
        { text: '🐾 Purr',       href: 'contact.html',  id: 'nav-contact' },
        { text: '🃏 Kitty Card', href: 'card.html',     id: 'nav-card' },
      ];
    }
  }

  render(theme) {
    this.nav.innerHTML = '';
    const links = this.getLinks(theme);
    links.forEach(link => {
      const a = document.createElement('a');
      a.href = link.href;
      a.id = link.id;
      a.innerHTML = link.text;
      if (window.location.pathname.includes(link.href.split('/').pop())) {
        a.classList.add('active');
      }
      this.nav.appendChild(a);
    });

    // Profile link only when logged in
    if (SessionManager.isLoggedIn()) {
      const profileText = theme === 'dark' ? '👤 Dark Reflection' : '🎀 My Shadow';
      const a = document.createElement('a');
      a.href = 'profile.html';
      a.id = 'nav-profile';
      a.innerHTML = profileText;
      this.nav.appendChild(a);
    }
  }
}