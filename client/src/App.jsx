import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DecksPage from './pages/DecksPage';
import DeckCreatePage from './pages/DeckCreatePage';
import DeckDetailPage from './pages/DeckDetailPage';
import PlayPage from './pages/PlayPage';
import AdminCabinetPage from './pages/AdminCabinetPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ReplayPage from './pages/ReplayPage';
import ReplaysListPage from './pages/ReplaysListPage';
import './App.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Загрузка...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Загрузка...</div>;
  const isAdmin = user?.roles?.includes('ROLE_ADMIN');
  return isAdmin ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/decks" element={<PrivateRoute><DecksPage /></PrivateRoute>} />
          <Route path="/decks/new" element={<PrivateRoute><DeckCreatePage /></PrivateRoute>} />
          <Route path="/decks/:id" element={<PrivateRoute><DeckDetailPage /></PrivateRoute>} />
          <Route path="/play" element={<PrivateRoute><PlayPage /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminCabinetPage /></AdminRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/replays" element={<PrivateRoute><ReplaysListPage /></PrivateRoute>} />
          <Route path="/replay/:matchId" element={<PrivateRoute><ReplayPage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
