import React from 'react';

export default function TutorialModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content tutorial-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Правила игры</h2>
          <button onClick={onClose} className="btn btn-secondary btn-sm" aria-label="Закрыть">&times;</button>
        </div>
        <div className="modal-body">
          <section>
            <h3>Цель игры</h3>
            <p>Снизьте HP героя соперника до 0, чтобы победить.</p>
          </section>
          <section>
            <h3>Мана</h3>
            <p>Каждая карта стоит определённое количество маны. В начале хода ваша мана восполняется. Используйте её, чтобы разыгрывать карты.</p>
          </section>
          <section>
            <h3>Разыгрывание карт</h3>
            <p>В свой ход вы можете сыграть миньона из руки, поместив его на стол. Нажмите кнопку «Сыграть» на карте в руке.</p>
          </section>
          <section>
            <h3>Атака</h3>
            <p>Миньоны с пометкой «Может атаковать» могут атаковать. Сначала выберите своего миньона-атакующего, затем — цель (миньон или героя соперника). <strong>Героя нельзя атаковать, пока на столе соперника есть миньоны</strong> — сначала нужно устранить их.</p>
          </section>
          <section>
            <h3>Ходы</h3>
            <p>Игроки ходят по очереди. В свой ход вы можете сыграть карты, атаковать и выполнить другие действия. Нажмите «Завершить ход», когда закончите.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
