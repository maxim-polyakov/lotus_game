import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../api/client';
import CardDisplay from '../components/CardDisplay';

export default function AdminCabinetPage() {
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: '', manaCost: 0, attack: 0, health: 0, description: '', damage: 0,
    taunt: false, charge: false, divineShield: false,
    windfury: false, stealth: false, poisonous: false, lifesteal: false, rush: false,
    battlecryType: '', battlecryValue: 0, battlecryTarget: '', battlecrySummonCardId: '',
    deathrattleType: '', deathrattleValue: 0, deathrattleSummonCardId: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [soundFile, setSoundFile] = useState(null);
  const [attackSoundFile, setAttackSoundFile] = useState(null);
  const [playEffectFile, setPlayEffectFile] = useState(null);
  const [attackEffectFile, setAttackEffectFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [soundUploading, setSoundUploading] = useState(false);
  const [attackSoundUploading, setAttackSoundUploading] = useState(false);
  const [attackSoundDeleting, setAttackSoundDeleting] = useState(false);
  const [attackSoundUploadSuccess, setAttackSoundUploadSuccess] = useState(false);
  const [playEffectUploading, setPlayEffectUploading] = useState(false);
  const [playEffectDeleting, setPlayEffectDeleting] = useState(false);
  const [playEffectUploadSuccess, setPlayEffectUploadSuccess] = useState(false);
  const [attackEffectUploading, setAttackEffectUploading] = useState(false);
  const [attackEffectDeleting, setAttackEffectDeleting] = useState(false);
  const [attackEffectUploadSuccess, setAttackEffectUploadSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [soundDeleting, setSoundDeleting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [soundUploadSuccess, setSoundUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [promoteInput, setPromoteInput] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [gameSounds, setGameSounds] = useState({ victorySoundUrl: null, defeatSoundUrl: null, drawSoundUrl: null });
  const [victorySoundFile, setVictorySoundFile] = useState(null);
  const [defeatSoundFile, setDefeatSoundFile] = useState(null);
  const [drawSoundFile, setDrawSoundFile] = useState(null);
  const [victorySoundUploading, setVictorySoundUploading] = useState(false);
  const [defeatSoundUploading, setDefeatSoundUploading] = useState(false);
  const [drawSoundUploading, setDrawSoundUploading] = useState(false);
  const [victorySoundDeleting, setVictorySoundDeleting] = useState(false);
  const [defeatSoundDeleting, setDefeatSoundDeleting] = useState(false);
  const [drawSoundDeleting, setDrawSoundDeleting] = useState(false);

  useEffect(() => {
    api.get('/api/cards')
      .then(({ data }) => setCards(data || []))
      .catch((e) => setError(e.response?.data?.message || 'Не удалось загрузить карты'));
  }, []);

  useEffect(() => {
    api.get('/api/settings/game-sounds')
      .then(({ data }) => setGameSounds(data || {}))
      .catch(() => setGameSounds({}));
  }, []);

  useEffect(() => {
    if (selected) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selected]);

  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name || '',
        manaCost: selected.manaCost ?? 0,
        attack: selected.attack ?? 0,
        health: selected.health ?? 0,
        description: selected.description || '',
        damage: selected.damage ?? 0,
        taunt: selected.taunt ?? false,
        charge: selected.charge ?? false,
        divineShield: selected.divineShield ?? false,
        windfury: selected.windfury ?? false,
        stealth: selected.stealth ?? false,
        poisonous: selected.poisonous ?? false,
        lifesteal: selected.lifesteal ?? false,
        rush: selected.rush ?? false,
        battlecryType: selected.battlecryType || '',
        battlecryValue: selected.battlecryValue ?? 0,
        battlecryTarget: selected.battlecryTarget || '',
        battlecrySummonCardId: selected.battlecrySummonCardId || '',
        deathrattleType: selected.deathrattleType || '',
        deathrattleValue: selected.deathrattleValue ?? 0,
        deathrattleSummonCardId: selected.deathrattleSummonCardId || '',
      });
      setImageFile(null);
      setSoundFile(null);
      setAttackSoundFile(null);
      setPlayEffectFile(null);
      setAttackEffectFile(null);
    }
  }, [selected]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setLoading(true);
    try {
      const isMinion = selected.cardType === 'MINION';
      const payload = isMinion
        ? {
            name: form.name, manaCost: form.manaCost, attack: form.attack, health: form.health, description: form.description,
            taunt: form.taunt, charge: form.charge, divineShield: form.divineShield,
            windfury: form.windfury, stealth: form.stealth, poisonous: form.poisonous, lifesteal: form.lifesteal, rush: form.rush,
            battlecryType: form.battlecryType === '' ? '' : (form.battlecryType || null), battlecryValue: form.battlecryValue ?? null,
            battlecryTarget: form.battlecryTarget || null, battlecrySummonCardId: form.battlecrySummonCardId ? +form.battlecrySummonCardId : null,
            deathrattleType: form.deathrattleType === '' ? '' : (form.deathrattleType || null), deathrattleValue: form.deathrattleValue ?? null,
            deathrattleSummonCardId: form.deathrattleSummonCardId ? +form.deathrattleSummonCardId : null,
          }
        : { name: form.name, manaCost: form.manaCost, description: form.description, damage: form.damage };
      const path = isMinion ? `/api/admin/cards/minions/${selected.id}` : `/api/admin/cards/spells/${selected.id}`;
      const { data } = await api.put(path, payload);
      setCards((prev) => prev.map((c) => (c.id === data.id && c.cardType === data.cardType ? data : c)));
      setSelected(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const compressForUpload = (file, maxSize = 600, quality = 0.82) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const r = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(new File([blob], file.name, { type: 'image/jpeg' })) : reject(new Error('Ошибка сжатия'))),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
      img.src = URL.createObjectURL(file);
    });

  const handleImageUpload = async (e) => {
    e.preventDefault();
    if (!selected || !imageFile) return;
    if (imageFile.size > 5 * 1024 * 1024) {
      setError('Изображение не более 5 МБ');
      return;
    }
    setError('');
    setUploadSuccess(false);
    setUploading(true);
    try {
      const path = selected.cardType === 'MINION'
        ? `/api/cards/minions/${selected.id}/image`
        : `/api/cards/spells/${selected.id}/image`;
      const fileToSend = await compressForUpload(imageFile);
      const formData = new FormData();
      formData.append('image', fileToSend);
      const { data } = await api.post(path, formData);
      setSelected((prev) => ({ ...prev, imageUrl: data.imageUrl }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, imageUrl: data.imageUrl } : c
      ));
      setImageFile(null);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data;
      setError(typeof msg === 'string' ? msg : (err.message || 'Ошибка загрузки изображения'));
    } finally {
      setUploading(false);
    }
  };

  const handlePromoteToAdmin = async (e) => {
    e.preventDefault();
    if (!promoteInput.trim()) return;
    setError('');
    setPromoting(true);
    try {
      await api.post('/api/admin/users/promote-admin', { emailOrUsername: promoteInput.trim() });
      setPromoteInput('');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка');
    } finally {
      setPromoting(false);
    }
  };

  const handleGameSoundUpload = async (e, key) => {
    e.preventDefault();
    const file = key === 'victorySoundUrl' ? victorySoundFile : key === 'defeatSoundUrl' ? defeatSoundFile : drawSoundFile;
    const setUploading = key === 'victorySoundUrl' ? setVictorySoundUploading : key === 'defeatSoundUrl' ? setDefeatSoundUploading : setDrawSoundUploading;
    const setFile = key === 'victorySoundUrl' ? setVictorySoundFile : key === 'defeatSoundUrl' ? setDefeatSoundFile : setDrawSoundFile;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Звук не более 5 МБ');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const endpoint = key === 'victorySoundUrl' ? '/api/admin/settings/victory-sound' : key === 'defeatSoundUrl' ? '/api/admin/settings/defeat-sound' : '/api/admin/settings/draw-sound';
      const formData = new FormData();
      formData.append('sound', file);
      const { data } = await api.post(endpoint, formData);
      setGameSounds((prev) => ({ ...prev, [key]: data[key] }));
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleGameSoundDelete = async (key) => {
    setError('');
    const setDeleting = key === 'victorySoundUrl' ? setVictorySoundDeleting : key === 'defeatSoundUrl' ? setDefeatSoundDeleting : setDrawSoundDeleting;
    setDeleting(true);
    try {
      const endpoint = key === 'victorySoundUrl' ? '/api/admin/settings/victory-sound' : key === 'defeatSoundUrl' ? '/api/admin/settings/defeat-sound' : '/api/admin/settings/draw-sound';
      await api.delete(endpoint);
      setGameSounds((prev) => ({ ...prev, [key]: null }));
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleSoundUpload = async (e) => {
    e.preventDefault();
    if (!selected || !soundFile) return;
    if (soundFile.size > 5 * 1024 * 1024) {
      setError('Звук не более 5 МБ');
      return;
    }
    setError('');
    setSoundUploadSuccess(false);
    setSoundUploading(true);
    try {
      const path = selected.cardType === 'MINION'
        ? `/api/cards/minions/${selected.id}/sound`
        : `/api/cards/spells/${selected.id}/sound`;
      const formData = new FormData();
      formData.append('sound', soundFile);
      const { data } = await api.post(path, formData);
      setSelected((prev) => ({ ...prev, soundUrl: data.soundUrl }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, soundUrl: data.soundUrl } : c
      ));
      setSoundFile(null);
      setSoundUploadSuccess(true);
      setTimeout(() => setSoundUploadSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data;
      setError(typeof msg === 'string' ? msg : (err.message || 'Ошибка загрузки звука'));
    } finally {
      setSoundUploading(false);
    }
  };

  const handleAttackSoundUpload = async (e) => {
    e.preventDefault();
    if (!selected || !attackSoundFile || selected.cardType !== 'MINION') return;
    if (attackSoundFile.size > 5 * 1024 * 1024) {
      setError('Звук не более 5 МБ');
      return;
    }
    setError('');
    setAttackSoundUploadSuccess(false);
    setAttackSoundUploading(true);
    try {
      const formData = new FormData();
      formData.append('sound', attackSoundFile);
      const { data } = await api.post(`/api/cards/minions/${selected.id}/attack-sound`, formData);
      setSelected((prev) => ({ ...prev, attackSoundUrl: data.attackSoundUrl }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, attackSoundUrl: data.attackSoundUrl } : c
      ));
      setAttackSoundFile(null);
      setAttackSoundUploadSuccess(true);
      setTimeout(() => setAttackSoundUploadSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data;
      setError(typeof msg === 'string' ? msg : (err.message || 'Ошибка загрузки звука атаки'));
    } finally {
      setAttackSoundUploading(false);
    }
  };

  const handleAttackSoundDelete = async () => {
    if (!selected?.attackSoundUrl || selected.cardType !== 'MINION') return;
    setError('');
    setAttackSoundDeleting(true);
    try {
      const { data } = await api.delete(`/api/cards/minions/${selected.id}/attack-sound`);
      setSelected((prev) => ({ ...prev, attackSoundUrl: data?.attackSoundUrl || null }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, attackSoundUrl: null } : c
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка удаления');
    } finally {
      setAttackSoundDeleting(false);
    }
  };

  const handlePlayEffectUpload = async (e) => {
    e.preventDefault();
    if (!selected || !playEffectFile) return;
    if (playEffectFile.size > 10 * 1024 * 1024) {
      setError('Эффект не более 10 МБ');
      return;
    }
    setError('');
    setPlayEffectUploadSuccess(false);
    setPlayEffectUploading(true);
    try {
      const path = selected.cardType === 'MINION'
        ? `/api/cards/minions/${selected.id}/play-effect`
        : `/api/cards/spells/${selected.id}/play-effect`;
      const formData = new FormData();
      formData.append('effect', playEffectFile);
      const { data } = await api.post(path, formData);
      setSelected((prev) => ({ ...prev, playEffectUrl: data.playEffectUrl }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, playEffectUrl: data.playEffectUrl } : c
      ));
      setPlayEffectFile(null);
      setPlayEffectUploadSuccess(true);
      setTimeout(() => setPlayEffectUploadSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data;
      setError(typeof msg === 'string' ? msg : (err.message || 'Ошибка загрузки эффекта'));
    } finally {
      setPlayEffectUploading(false);
    }
  };

  const handlePlayEffectDelete = async () => {
    if (!selected?.playEffectUrl) return;
    setError('');
    setPlayEffectDeleting(true);
    try {
      const path = selected.cardType === 'MINION'
        ? `/api/cards/minions/${selected.id}/play-effect`
        : `/api/cards/spells/${selected.id}/play-effect`;
      const { data } = await api.delete(path);
      setSelected((prev) => ({ ...prev, playEffectUrl: data?.playEffectUrl || null }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, playEffectUrl: null } : c
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка удаления');
    } finally {
      setPlayEffectDeleting(false);
    }
  };

  const handleAttackEffectUpload = async (e) => {
    e.preventDefault();
    if (!selected || !attackEffectFile || selected.cardType !== 'MINION') return;
    if (attackEffectFile.size > 10 * 1024 * 1024) {
      setError('Эффект не более 10 МБ');
      return;
    }
    setError('');
    setAttackEffectUploadSuccess(false);
    setAttackEffectUploading(true);
    try {
      const formData = new FormData();
      formData.append('effect', attackEffectFile);
      const { data } = await api.post(`/api/cards/minions/${selected.id}/attack-effect`, formData);
      setSelected((prev) => ({ ...prev, attackEffectUrl: data.attackEffectUrl }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, attackEffectUrl: data.attackEffectUrl } : c
      ));
      setAttackEffectFile(null);
      setAttackEffectUploadSuccess(true);
      setTimeout(() => setAttackEffectUploadSuccess(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data;
      setError(typeof msg === 'string' ? msg : (err.message || 'Ошибка загрузки эффекта'));
    } finally {
      setAttackEffectUploading(false);
    }
  };

  const handleAttackEffectDelete = async () => {
    if (!selected?.attackEffectUrl || selected.cardType !== 'MINION') return;
    setError('');
    setAttackEffectDeleting(true);
    try {
      const { data } = await api.delete(`/api/cards/minions/${selected.id}/attack-effect`);
      setSelected((prev) => ({ ...prev, attackEffectUrl: data?.attackEffectUrl || null }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, attackEffectUrl: null } : c
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка удаления');
    } finally {
      setAttackEffectDeleting(false);
    }
  };

  const handleSoundDelete = async () => {
    if (!selected?.soundUrl) return;
    setError('');
    setSoundDeleting(true);
    try {
      const path = selected.cardType === 'MINION'
        ? `/api/cards/minions/${selected.id}/sound`
        : `/api/cards/spells/${selected.id}/sound`;
      const { data } = await api.delete(path);
      setSelected((prev) => ({ ...prev, soundUrl: data?.soundUrl || null }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, soundUrl: null } : c
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка удаления');
    } finally {
      setSoundDeleting(false);
    }
  };

  const handleImageDelete = async () => {
    if (!selected?.imageUrl) return;
    setError('');
    setDeleting(true);
    try {
      const path = selected.cardType === 'MINION'
        ? `/api/cards/minions/${selected.id}/image`
        : `/api/cards/spells/${selected.id}/image`;
      const { data } = await api.delete(path);
      setSelected((prev) => ({ ...prev, imageUrl: data?.imageUrl || null }));
      setCards((prev) => prev.map((c) =>
        (c.id === selected.id && c.cardType === selected.cardType) ? { ...c, imageUrl: null } : c
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-cabinet">
      <div className="admin-header">
        <h1>Кабинет администратора</h1>
        <Link to="/" className="btn btn-secondary">На главную</Link>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="admin-promote-section">
        <h3>Сделать админом</h3>
        <form onSubmit={handlePromoteToAdmin} className="admin-promote-form">
          <input
            type="text"
            value={promoteInput}
            onChange={(e) => setPromoteInput(e.target.value)}
            placeholder="Email или username"
            className="admin-promote-input"
          />
          <button type="submit" className="btn btn-primary" disabled={promoting || !promoteInput.trim()}>
            {promoting ? '...' : 'Назначить ROLE_ADMIN'}
          </button>
        </form>
      </div>
      <div className="admin-game-sounds-section">
        <h3>Звуки игры (победа / поражение / ничья)</h3>
        <p className="admin-hint-small">Проигрываются при завершении матча. Если не заданы — используются стандартные.</p>
        <div className="admin-game-sounds-grid">
          <div className="admin-game-sound-item">
            <h4>Победа</h4>
            <form onSubmit={(e) => handleGameSoundUpload(e, 'victorySoundUrl')}>
              <div className="admin-file-input-wrap">
                <label className="btn btn-secondary admin-file-label">
                  Выбрать
                  <input type="file" accept="audio/*" className="admin-file-input" onChange={(e) => setVictorySoundFile(e.target.files?.[0] ?? null)} />
                </label>
                {victorySoundFile && <span className="admin-file-name">{victorySoundFile.name}</span>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={!victorySoundFile || victorySoundUploading}>
                {victorySoundUploading ? '...' : 'Загрузить'}
              </button>
            </form>
            {gameSounds.victorySoundUrl && (
              <div className="current-sound">
                <audio src={gameSounds.victorySoundUrl} controls style={{ width: '100%', maxWidth: 200, marginTop: 4 }} />
                <button type="button" onClick={() => handleGameSoundDelete('victorySoundUrl')} disabled={victorySoundDeleting} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                  {victorySoundDeleting ? '...' : 'Удалить'}
                </button>
              </div>
            )}
          </div>
          <div className="admin-game-sound-item">
            <h4>Поражение</h4>
            <form onSubmit={(e) => handleGameSoundUpload(e, 'defeatSoundUrl')}>
              <div className="admin-file-input-wrap">
                <label className="btn btn-secondary admin-file-label">
                  Выбрать
                  <input type="file" accept="audio/*" className="admin-file-input" onChange={(e) => setDefeatSoundFile(e.target.files?.[0] ?? null)} />
                </label>
                {defeatSoundFile && <span className="admin-file-name">{defeatSoundFile.name}</span>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={!defeatSoundFile || defeatSoundUploading}>
                {defeatSoundUploading ? '...' : 'Загрузить'}
              </button>
            </form>
            {gameSounds.defeatSoundUrl && (
              <div className="current-sound">
                <audio src={gameSounds.defeatSoundUrl} controls style={{ width: '100%', maxWidth: 200, marginTop: 4 }} />
                <button type="button" onClick={() => handleGameSoundDelete('defeatSoundUrl')} disabled={defeatSoundDeleting} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                  {defeatSoundDeleting ? '...' : 'Удалить'}
                </button>
              </div>
            )}
          </div>
          <div className="admin-game-sound-item">
            <h4>Ничья</h4>
            <form onSubmit={(e) => handleGameSoundUpload(e, 'drawSoundUrl')}>
              <div className="admin-file-input-wrap">
                <label className="btn btn-secondary admin-file-label">
                  Выбрать
                  <input type="file" accept="audio/*" className="admin-file-input" onChange={(e) => setDrawSoundFile(e.target.files?.[0] ?? null)} />
                </label>
                {drawSoundFile && <span className="admin-file-name">{drawSoundFile.name}</span>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={!drawSoundFile || drawSoundUploading}>
                {drawSoundUploading ? '...' : 'Загрузить'}
              </button>
            </form>
            {gameSounds.drawSoundUrl && (
              <div className="current-sound">
                <audio src={gameSounds.drawSoundUrl} controls style={{ width: '100%', maxWidth: 200, marginTop: 4 }} />
                <button type="button" onClick={() => handleGameSoundDelete('drawSoundUrl')} disabled={drawSoundDeleting} className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                  {drawSoundDeleting ? '...' : 'Удалить'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="admin-content">
        <div className="admin-cards-list">
          <h3>Карты</h3>
          <div className="admin-cards-grid">
            {cards.map((c) => (
              <div
                key={`${c.cardType}-${c.id}`}
                className={`admin-card-item ${selected?.id === c.id && selected?.cardType === c.cardType ? 'selected' : ''}`}
                onClick={() => setSelected(c)}
              >
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt={c.name} className="admin-card-preview-img" />
                ) : (
                  <CardDisplay card={c} size="sm" />
                )}
                <span className="admin-card-preview-name">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {selected && createPortal(
        <div className="admin-edit-overlay" onClick={() => setSelected(null)}>
          <div className="admin-edit-panel" onClick={(e) => e.stopPropagation()}>
            <div className="admin-edit-panel-header">
              <h3>Редактирование: {selected.name}</h3>
              <button type="button" onClick={() => setSelected(null)} className="btn btn-secondary btn-sm admin-edit-close" aria-label="Закрыть">&times;</button>
            </div>
              <form onSubmit={handleSave} className="admin-form">
                <div className="form-group">
                  <label>Название</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Мана</label>
                  <input
                    type="number"
                    min="0"
                    value={form.manaCost}
                    onChange={(e) => setForm((f) => ({ ...f, manaCost: +e.target.value }))}
                  />
                </div>
                {selected.cardType === 'SPELL' && (
                  <div className="form-group">
                    <label>Урон (0 = без урона)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.damage}
                      onChange={(e) => setForm((f) => ({ ...f, damage: +e.target.value }))}
                    />
                  </div>
                )}
                {selected.cardType === 'MINION' && (
                  <>
                    <div className="form-group">
                      <label>Атака</label>
                      <input
                        type="number"
                        min="0"
                        value={form.attack}
                        onChange={(e) => setForm((f) => ({ ...f, attack: +e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Здоровье</label>
                      <input
                        type="number"
                        min="0"
                        value={form.health}
                        onChange={(e) => setForm((f) => ({ ...f, health: +e.target.value }))}
                      />
                    </div>
                    <div className="form-group form-checkboxes">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.taunt} onChange={(e) => setForm((f) => ({ ...f, taunt: e.target.checked }))} />
                        Taunt (Провокация)
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.charge} onChange={(e) => setForm((f) => ({ ...f, charge: e.target.checked }))} />
                        Charge (Рывок)
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.divineShield} onChange={(e) => setForm((f) => ({ ...f, divineShield: e.target.checked }))} />
                        Divine Shield (Щит)
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.windfury} onChange={(e) => setForm((f) => ({ ...f, windfury: e.target.checked }))} />
                        Windfury (Двойная атака)
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.stealth} onChange={(e) => setForm((f) => ({ ...f, stealth: e.target.checked }))} />
                        Stealth (Скрытность)
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.poisonous} onChange={(e) => setForm((f) => ({ ...f, poisonous: e.target.checked }))} />
                        Poisonous (Яд)
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.lifesteal} onChange={(e) => setForm((f) => ({ ...f, lifesteal: e.target.checked }))} />
                        Lifesteal (Вампиризм)
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.rush} onChange={(e) => setForm((f) => ({ ...f, rush: e.target.checked }))} />
                        Rush (Рывок по миньонам)
                      </label>
                    </div>
                    <div className="form-group">
                      <label>Battlecry (эффект при розыгрыше)</label>
                      <select value={form.battlecryType} onChange={(e) => setForm((f) => ({ ...f, battlecryType: e.target.value }))}>
                        <option value="">Нет</option>
                        <option value="DEAL_DAMAGE">Deal Damage (урон цели)</option>
                        <option value="HEAL">Heal (лечение)</option>
                        <option value="BUFF_ALLY">Buff Ally (+X/+X союзнику)</option>
                        <option value="SUMMON">Summon (призвать миньона)</option>
                      </select>
                      {form.battlecryType && (
                        <>
                          <input type="number" min="0" placeholder="Значение" value={form.battlecryValue} onChange={(e) => setForm((f) => ({ ...f, battlecryValue: +e.target.value }))} style={{ marginTop: 4, width: 80 }} />
                          {form.battlecryType === 'DEAL_DAMAGE' && (
                            <select value={form.battlecryTarget} onChange={(e) => setForm((f) => ({ ...f, battlecryTarget: e.target.value }))} style={{ marginLeft: 8 }}>
                              <option value="">Любая</option>
                              <option value="ENEMY">Враг</option>
                              <option value="FRIENDLY">Союзник</option>
                            </select>
                          )}
                          {form.battlecryType === 'SUMMON' && (
                            <input type="number" min="1" placeholder="ID миньона" value={form.battlecrySummonCardId} onChange={(e) => setForm((f) => ({ ...f, battlecrySummonCardId: e.target.value }))} style={{ marginLeft: 8, width: 100 }} />
                          )}
                        </>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Deathrattle (эффект при смерти)</label>
                      <select value={form.deathrattleType} onChange={(e) => setForm((f) => ({ ...f, deathrattleType: e.target.value }))}>
                        <option value="">Нет</option>
                        <option value="DEAL_DAMAGE">Deal Damage (урон случайному врагу)</option>
                        <option value="SUMMON">Summon (призвать миньона)</option>
                      </select>
                      {form.deathrattleType && (
                        <>
                          {form.deathrattleType === 'DEAL_DAMAGE' && (
                            <input type="number" min="0" placeholder="Урон" value={form.deathrattleValue} onChange={(e) => setForm((f) => ({ ...f, deathrattleValue: +e.target.value }))} style={{ marginTop: 4, width: 80 }} />
                          )}
                          {form.deathrattleType === 'SUMMON' && (
                            <input type="number" min="1" placeholder="ID миньона" value={form.deathrattleSummonCardId} onChange={(e) => setForm((f) => ({ ...f, deathrattleSummonCardId: e.target.value }))} style={{ marginLeft: 8, width: 100 }} />
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Описание</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </form>
              <div className="admin-image-upload">
                <h4>Аватар карты (S3)</h4>
                <form onSubmit={handleImageUpload}>
                  <div className="admin-file-input-wrap">
                    <label className="btn btn-secondary admin-file-label">
                      Выбрать файл
                      <input
                        key={`${selected.cardType}-${selected.id}`}
                        type="file"
                        accept="image/*"
                        className="admin-file-input"
                        onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {imageFile && <span className="admin-file-name">{imageFile.name}</span>}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={!imageFile || uploading}>
                    {uploading ? 'Загрузка...' : uploadSuccess ? 'Загружено!' : 'Загрузить'}
                  </button>
                </form>
                {selected.imageUrl && (
                  <div className="current-image">
                    <span>Текущее:</span>
                    <img src={selected.imageUrl} alt="" style={{ maxWidth: 80, maxHeight: 80, marginTop: 4 }} />
                    <button
                      type="button"
                      onClick={handleImageDelete}
                      disabled={deleting}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 8 }}
                    >
                      {deleting ? 'Удаление...' : 'Удалить аватар'}
                    </button>
                  </div>
                )}
              </div>
              <div className="admin-sound-upload">
                <h4>Звук карты</h4>
                <form onSubmit={handleSoundUpload}>
                  <div className="admin-file-input-wrap">
                    <label className="btn btn-secondary admin-file-label">
                      Выбрать звук
                      <input
                        key={`sound-${selected.cardType}-${selected.id}`}
                        type="file"
                        accept="audio/*"
                        className="admin-file-input"
                        onChange={(e) => setSoundFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {soundFile && <span className="admin-file-name">{soundFile.name}</span>}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={!soundFile || soundUploading}>
                    {soundUploading ? 'Загрузка...' : soundUploadSuccess ? 'Загружено!' : 'Загрузить звук'}
                  </button>
                </form>
                {selected.soundUrl && (
                  <div className="current-sound">
                    <span>Текущий:</span>
                    <audio src={selected.soundUrl} controls style={{ width: '100%', maxWidth: 320, marginTop: 4 }} />
                    <button
                      type="button"
                      onClick={handleSoundDelete}
                      disabled={soundDeleting}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 8 }}
                    >
                      {soundDeleting ? 'Удаление...' : 'Удалить звук'}
                    </button>
                  </div>
                )}
              </div>
              {selected.cardType === 'MINION' && (
                <div className="admin-sound-upload">
                  <h4>Звук атаки (миньон)</h4>
                  <form onSubmit={handleAttackSoundUpload}>
                    <div className="admin-file-input-wrap">
                      <label className="btn btn-secondary admin-file-label">
                        Выбрать звук атаки
                        <input
                          key={`attack-sound-${selected.id}`}
                          type="file"
                          accept="audio/*"
                          className="admin-file-input"
                          onChange={(e) => setAttackSoundFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {attackSoundFile && <span className="admin-file-name">{attackSoundFile.name}</span>}
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={!attackSoundFile || attackSoundUploading}>
                      {attackSoundUploading ? 'Загрузка...' : attackSoundUploadSuccess ? 'Загружено!' : 'Загрузить звук атаки'}
                    </button>
                  </form>
                  {selected.attackSoundUrl && (
                    <div className="current-sound">
                      <span>Текущий:</span>
                      <audio src={selected.attackSoundUrl} controls style={{ width: '100%', maxWidth: 320, marginTop: 4 }} />
                      <button
                        type="button"
                        onClick={handleAttackSoundDelete}
                        disabled={attackSoundDeleting}
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 8 }}
                      >
                        {attackSoundDeleting ? 'Удаление...' : 'Удалить звук атаки'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="admin-effect-upload">
                <h4>Эффект розыгрыша (GIF/WebM/MP4)</h4>
                <p className="admin-hint-small">Проигрывается при выкладывании карты на стол</p>
                <form onSubmit={handlePlayEffectUpload}>
                  <div className="admin-file-input-wrap">
                    <label className="btn btn-secondary admin-file-label">
                      Выбрать эффект
                      <input
                        key={`play-effect-${selected.cardType}-${selected.id}`}
                        type="file"
                        accept="image/gif,video/webm,video/mp4"
                        className="admin-file-input"
                        onChange={(e) => setPlayEffectFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {playEffectFile && <span className="admin-file-name">{playEffectFile.name}</span>}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={!playEffectFile || playEffectUploading}>
                    {playEffectUploading ? 'Загрузка...' : playEffectUploadSuccess ? 'Загружено!' : 'Загрузить'}
                  </button>
                </form>
                {selected.playEffectUrl && (
                  <div className="current-effect">
                    <span>Текущий:</span>
                    {selected.playEffectUrl.toLowerCase().endsWith('.gif') ? (
                      <img src={selected.playEffectUrl} alt="" style={{ maxWidth: 120, maxHeight: 120, marginTop: 4 }} />
                    ) : (
                      <video src={selected.playEffectUrl} autoPlay loop muted playsInline style={{ maxWidth: 120, maxHeight: 120, marginTop: 4 }} />
                    )}
                    <button
                      type="button"
                      onClick={handlePlayEffectDelete}
                      disabled={playEffectDeleting}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 8 }}
                    >
                      {playEffectDeleting ? 'Удаление...' : 'Удалить'}
                    </button>
                  </div>
                )}
              </div>
              {selected.cardType === 'MINION' && (
                <div className="admin-effect-upload">
                  <h4>Эффект атаки (GIF/WebM/MP4)</h4>
                  <p className="admin-hint-small">Проигрывается при атаке миньона</p>
                  <form onSubmit={handleAttackEffectUpload}>
                    <div className="admin-file-input-wrap">
                      <label className="btn btn-secondary admin-file-label">
                        Выбрать эффект
                        <input
                          key={`attack-effect-${selected.id}`}
                          type="file"
                          accept="image/gif,video/webm,video/mp4"
                          className="admin-file-input"
                          onChange={(e) => setAttackEffectFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {attackEffectFile && <span className="admin-file-name">{attackEffectFile.name}</span>}
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={!attackEffectFile || attackEffectUploading}>
                      {attackEffectUploading ? 'Загрузка...' : attackEffectUploadSuccess ? 'Загружено!' : 'Загрузить'}
                    </button>
                  </form>
                  {selected.attackEffectUrl && (
                    <div className="current-effect">
                      <span>Текущий:</span>
                      {selected.attackEffectUrl.toLowerCase().endsWith('.gif') ? (
                        <img src={selected.attackEffectUrl} alt="" style={{ maxWidth: 120, maxHeight: 120, marginTop: 4 }} />
                      ) : (
                        <video src={selected.attackEffectUrl} autoPlay loop muted playsInline style={{ maxWidth: 120, maxHeight: 120, marginTop: 4 }} />
                      )}
                      <button
                        type="button"
                        onClick={handleAttackEffectDelete}
                        disabled={attackEffectDeleting}
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 8 }}
                      >
                        {attackEffectDeleting ? 'Удаление...' : 'Удалить'}
                      </button>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
