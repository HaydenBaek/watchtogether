// Handles the register and login forms on index.html.
import { Page } from './page.js';
import { messages } from './messages.js';

class LoginPage extends Page {
  constructor() {
    super();
    this.registerForm = document.getElementById('register-form');
    this.registerMessage = document.getElementById('register-message');
    this.loginForm = document.getElementById('login-form');
    this.loginMessage = document.getElementById('login-message');
  }

  init() {
    this.registerForm.addEventListener('submit', (event) => this.register(event));
    this.loginForm.addEventListener('submit', (event) => this.login(event));
  }

  async register(event) {
    event.preventDefault(); // stop the page from reloading
    try {
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const result = await this.api.register(email, password);

      if (result.status === 201) {
        this.showMessage(this.registerMessage, messages.registerSuccess, 'success');
        this.registerForm.reset();
      } else {
        this.showMessage(this.registerMessage, result.data.error, 'error');
      }
    } catch (err) {
      this.showMessage(this.registerMessage, messages.networkError, 'error');
    }
  }

  async login(event) {
    event.preventDefault();
    try {
      this.showMessage(this.loginMessage, messages.loggingIn, 'success');
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const loginResult = await this.api.login(email, password);

      if (loginResult.status !== 200) {
        this.showMessage(this.loginMessage, loginResult.data.error, 'error');
        return;
      }

      // Logged in. Ask who we are, then go to the right page.
      const meResult = await this.api.getMe();
      if (meResult.status !== 200) {
        this.showMessage(this.loginMessage, meResult.data.error, 'error');
        return;
      }
      this.goTo(meResult.data.role === 'admin' ? 'admin.html' : 'user.html');
    } catch (err) {
      this.showMessage(this.loginMessage, messages.networkError, 'error');
    }
  }
}

new LoginPage().init();
