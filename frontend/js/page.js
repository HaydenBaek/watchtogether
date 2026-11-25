// Base class for the three pages (login, user, admin). Holds what they all share.
import { ApiClient } from './api.js';

export class Page {
  constructor() {
    this.api = new ApiClient();
  }

  // Shows text in a message element. type picks the color: 'error', 'success', or '' for plain.
  showMessage(element, text, type) {
    element.textContent = text;
    element.className = type ? `message ${type}` : 'message';
  }

  goTo(pageFile) {
    window.location.href = pageFile;
  }

  // Makes the "Log out" button work (used on the user and admin pages).
  setUpLogoutButton() {
    document.getElementById('logout-button').addEventListener('click', () => this.logout());
  }

  async logout() {
    try {
      await this.api.logout();
    } catch (err) {
      // Even if this fails, send the user back to the login page.
    }
    this.goTo('index.html');
  }
}
