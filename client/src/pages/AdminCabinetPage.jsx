import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import CardDisplay from '../components/CardDisplay';

export default function AdminCabinetPage() {
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', manaCost: 0, attack: 0, health: 0, description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [soundFile, setSoundFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [soundUploading, setSoundUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [soundDeleting, setSoundDeleting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [soundUploadSuccess, setSoundUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [promoteInput, setPromoteInput] = useState('');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    api.get('/api/cards')
      .then(({ data }) => setCards(data || []))
      .catch((e) => setError(e.response?.data?.message || 'Не удалось загрузить карты'));
  }, []);

  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name || '',
        manaCost: selected.manaCost ?? 0,
        attack: selected.attack ?? 0,
        health: selected.health ?? 0,
        description: selected.description || '',
      });
      setImageFile(null);
      setSoundFile(null);
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
        ? { name: form.name, manaCost: form.manaCost, attack: form.attack, health: form.health, description: form.description }
        : { name: form.name, manaCost: form.manaCost, description: form.description };
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
        <div className="admin-edit-panel">
          {selected ? (
            <>
              <h3>Редактирование: {selected.name}</h3>
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
            </>
          ) : (
            <p className="admin-hint">Выберите карту для редактирования</p>
          )}
        </div>
      </div>
    </div>
  );
}
