// All calls to the backend live here.
// Change this one line when you deploy the backend.
const API_BASE_URL = 'http://localhost:4537/api/v1';

// Sends a request and returns { status, data }. Never throws on HTTP errors.
// credentials: 'include' makes the browser send the login cookie.
async function request(method, path, body) {
  const options = {
    method: method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(API_BASE_URL + path, options);
  const data = await response.json();
  return { status: response.status, data: data };
}

export function registerUser(email, password) {
  return request('POST', '/auth/register', { email, password });
}

export function loginUser(email, password) {
  return request('POST', '/auth/login', { email, password });
}

export function logoutUser() {
  return request('POST', '/auth/logout');
}

export function getMe() {
  return request('GET', '/users/me');
}

export function getAllUsers() {
  return request('GET', '/admin/users');
}

export function getRecommendations(likes, avoid) {
  return request('POST', '/recommendations', { likes, avoid });
}
