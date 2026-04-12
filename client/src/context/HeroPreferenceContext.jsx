import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'lotus_selected_hero_id';

const HeroPreferenceContext = createContext(null);

export function HeroPreferenceProvider({ children }) {
  const { user } = useAuth();
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedHeroId, setSelectedHeroIdState] = useState(null);

  useEffect(() => {
    if (!user) {
      setHeroes([]);
      setSelectedHeroIdState(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get('/api/heroes')
      .then(({ data }) => {
        if (cancelled) return;
        const list = data || [];
        setHeroes(list);
        if (list.length === 0) return;
        let stored = null;
        try {
          stored = localStorage.getItem(STORAGE_KEY);
        } catch (_) {
          stored = null;
        }
        const isUnlocked = (h) => h.unlocked !== false;
        setSelectedHeroIdState((prev) => {
          const unlockedList = list.filter(isUnlocked);
          if (unlockedList.length === 0) {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch (_) {}
            return null;
          }
          if (stored && unlockedList.some((h) => h.id === stored)) {
            try {
              localStorage.setItem(STORAGE_KEY, stored);
            } catch (_) {}
            return stored;
          }
          if (prev && unlockedList.some((h) => h.id === prev)) return prev;
          const pick = unlockedList[0].id;
          try {
            localStorage.setItem(STORAGE_KEY, pick);
          } catch (_) {}
          return pick;
        });
      })
      .catch(() => {
        if (!cancelled) setHeroes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setSelectedHeroId = useCallback((id) => {
    setSelectedHeroIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }, []);

  const selectedHero = useMemo(
    () => heroes.find((h) => h.id === selectedHeroId) || null,
    [heroes, selectedHeroId]
  );

  const value = useMemo(
    () => ({ heroes, loading, selectedHeroId, setSelectedHeroId, selectedHero }),
    [heroes, loading, selectedHeroId, setSelectedHeroId, selectedHero]
  );

  return (
    <HeroPreferenceContext.Provider value={value}>
      {children}
    </HeroPreferenceContext.Provider>
  );
}

export function useHeroPreference() {
  const ctx = useContext(HeroPreferenceContext);
  if (!ctx) {
    throw new Error('useHeroPreference must be used within HeroPreferenceProvider');
  }
  return ctx;
}
