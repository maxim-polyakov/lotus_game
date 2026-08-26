export const routeToScene = {
  '/': 'MenuScene',
  '/login': 'AuthScene',
  '/register': 'AuthScene',
  '/forgot-password': 'AuthScene',
  '/verify-email': 'AuthScene',
  '/heroes': 'HeroesScene',
  '/decks': 'DecksScene',
  '/decks/new': 'DeckEditorScene',
  '/play': 'PlayScene',
  '/profile': 'ProfileScene',
  '/leaderboard': 'LeaderboardScene',
  '/replays': 'ReplaysScene',
  '/friends': 'FriendsScene',
  '/notifications': 'NotificationsScene',
  '/shop': 'ShopScene',
  '/admin': 'AdminScene',
};

export const sceneToRoute = Object.fromEntries(Object.entries(routeToScene).map(([route, scene]) => [scene, route]));

export function sceneForCurrentRoute() {
  const path = window.location.pathname;
  if (path.startsWith('/replay/')) return 'ReplayViewerScene';
  if (path.startsWith('/decks/') && path !== '/decks/new') return 'DeckEditorScene';
  return routeToScene[path] || 'MenuScene';
}

export function authModeForCurrentRoute() {
  const path = window.location.pathname;
  if (path === '/register') return 'register';
  if (path === '/forgot-password') return 'forgot';
  if (path === '/verify-email') return 'verify';
  return 'login';
}
