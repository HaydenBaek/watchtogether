// All calls to the backend live here.
// Put your deployed backend URL here (ending in /api/v1).
const PRODUCTION_API_URL = 'https://watchtogether-api-n4lb.onrender.com/api/v1';
const LOCAL_API_URL = 'http://localhost:4537/api/v1';

export class ApiClient {
  constructor() {
    // Uses the local backend when the page itself is opened from localhost.
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    this.baseUrl = isLocal ? LOCAL_API_URL : PRODUCTION_API_URL;
  }

  // Sends a request and returns { status, data }. Never throws on HTTP errors.
  // credentials: 'include' makes the browser send the login cookie.
  async request(method, path, body) {
    const options = {
      method: method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(this.baseUrl + path, options);
    const data = await response.json();
    return { status: response.status, data: data };
  }

  register(email, password) {
    return this.request('POST', '/auth/register', { email, password });
  }

  login(email, password) {
    return this.request('POST', '/auth/login', { email, password });
  }

  logout() {
    return this.request('POST', '/auth/logout');
  }

  getMe() {
    return this.request('GET', '/users/me');
  }

  getAllUsers() {
    return this.request('GET', '/admin/users');
  }

  getRecommendations(likes, avoid) {
    return this.request('POST', '/recommendations', { likes, avoid });
  }
}
