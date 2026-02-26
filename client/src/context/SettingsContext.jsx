import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'lotus_sound_enabled';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(soundEnabled));
  }, [soundEnabled]);

  const setSoundEnabled = (v) => setSoundEnabledState(Boolean(v));
  const toggleSound = () => setSoundEnabledState((prev) => !prev);

  return (
    <SettingsContext.Provider value={{ soundEnabled, setSoundEnabled, toggleSound }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
