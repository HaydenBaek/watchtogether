// Handles the register and login forms on index.html.
import { registerUser, loginUser, getMe } from './api.js';
import { messages } from './messages.js';

const registerForm = document.getElementById('register-form');
const registerMessage = document.getElementById('register-message');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

// Shows text in a message element. isError picks the color.
function showMessage(element, text, isError) {
  element.textContent = text;
  element.className = isError ? 'message error' : 'message success';
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault(); // stop the page from reloading
  try {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const result = await registerUser(email, password);

    if (result.status === 201) {
      showMessage(registerMessage, messages.registerSuccess, false);
      registerForm.reset();
    } else {
      showMessage(registerMessage, result.data.error, true);
    }
  } catch (err) {
    showMessage(registerMessage, messages.networkError, true);
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    showMessage(loginMessage, messages.loggingIn, false);
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const loginResult = await loginUser(email, password);

    if (loginResult.status !== 200) {
      showMessage(loginMessage, loginResult.data.error, true);
      return;
    }

    // Logged in. Ask who we are, then go to the right page.
    const meResult = await getMe();
    if (meResult.status !== 200) {
      showMessage(loginMessage, meResult.data.error, true);
      return;
    }
    window.location.href = meResult.data.role === 'admin' ? 'admin.html' : 'user.html';
  } catch (err) {
    showMessage(loginMessage, messages.networkError, true);
  }
});
