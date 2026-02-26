/**
 * Хранилище токенов: localStorage при "Запомнить меня", иначе sessionStorage
 */
function getStorage() {
  return localStorage.getItem('rememberMe') === 'true' ? localStorage : sessionStorage;
}

export function getAccessToken() {
  return getStorage().getItem('accessToken') || localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
}

export function getRefreshToken() {
  return getStorage().getItem('refreshToken') || localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

export function setTokens(accessToken, refreshToken, rememberMe) {
  if (rememberMe) {
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('rememberMe');
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('refreshToken', refreshToken);
  }
}

export function clearTokens() {
  localStorage.removeItem('rememberMe');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
}
