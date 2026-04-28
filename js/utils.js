class Utils {
  static async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  static getParams() {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  }
  static formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
  }
  static getAge(dob) {
    if (!dob) return '';
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }
  static generateId(len = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < len; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
  }
  static generateSecret() {
    const adj = ['Kitty','Star','Moon','Candy','Pink','Sweet','Dream','Magic'];
    const noun = ['Paw','Ribbon','Heart','Sparkle','Cloud','Berry','Muffin','Bunny'];
    const num = Math.floor(Math.random() * 900 + 100);
    return `${adj[Math.floor(Math.random()*adj.length)]}${noun[Math.floor(Math.random()*noun.length)]}${num}`;
  }
}