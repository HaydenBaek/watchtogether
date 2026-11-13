// Logic for admin.html: show all users in a table.
import { getAllUsers, logoutUser } from './api.js';
import { messages } from './messages.js';

const statusText = document.getElementById('status');
const table = document.getElementById('users-table');
const tableBody = document.getElementById('users-body');

// Adds one table row for a user. textContent keeps the data safe.
function addUserRow(user) {
  const row = document.createElement('tr');
  const cells = [user.id, user.email, user.role, new Date(user.created_at).toLocaleString()];

  for (const value of cells) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.appendChild(cell);
  }
  tableBody.appendChild(row);
}

async function loadUsers() {
  statusText.textContent = messages.loadingUsers;
  try {
    const result = await getAllUsers();

    // The server decides who is an admin. 403 means "logged in but not admin".
    if (result.status === 403) {
      statusText.textContent = messages.notAdmin;
      statusText.className = 'message error';
      return;
    }
    if (result.status !== 200) {
      statusText.textContent = result.data.error;
      statusText.className = 'message error';
      return;
    }

    statusText.textContent = '';
    for (const user of result.data) {
      addUserRow(user);
    }
    table.hidden = false;
  } catch (err) {
    statusText.textContent = messages.networkError;
    statusText.className = 'message error';
  }
}

document.getElementById('logout-button').addEventListener('click', async () => {
  try {
    await logoutUser();
  } catch (err) {
    // Even if this fails, send the user back to the login page.
  }
  window.location.href = 'index.html';
});

loadUsers();
