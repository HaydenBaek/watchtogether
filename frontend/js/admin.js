// Logic for admin.html: show all users in a table.
import { Page } from './page.js';
import { messages } from './messages.js';

class AdminPage extends Page {
  constructor() {
    super();
    this.statusText = document.getElementById('status');
    this.table = document.getElementById('users-table');
    this.tableBody = document.getElementById('users-body');
  }

  init() {
    this.setUpLogoutButton();
    this.loadUsers();
  }

  async loadUsers() {
    this.statusText.textContent = messages.loadingUsers;
    try {
      const result = await this.api.getAllUsers();

      // 401 means "not logged in": go back to the login page.
      if (result.status === 401) {
        this.goTo('index.html');
        return;
      }
      // The server decides who is an admin. 403 means "logged in but not admin".
      if (result.status === 403) {
        this.showMessage(this.statusText, messages.notAdmin, 'error');
        return;
      }
      if (result.status !== 200) {
        this.showMessage(this.statusText, result.data.error, 'error');
        return;
      }

      this.statusText.textContent = '';
      for (const user of result.data) {
        this.addUserRow(user);
      }
      this.table.hidden = false;
    } catch (err) {
      this.showMessage(this.statusText, messages.networkError, 'error');
    }
  }

  // Adds one table row for a user. textContent keeps the data safe.
  addUserRow(user) {
    const row = document.createElement('tr');
    const cells = [
      user.id,
      user.email,
      user.role,
      new Date(user.created_at).toLocaleString(),
      user.api_calls,
    ];

    for (const value of cells) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    this.tableBody.appendChild(row);
  }
}

new AdminPage().init();
