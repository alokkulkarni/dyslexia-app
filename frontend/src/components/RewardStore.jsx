/**
 * Avatar Reward Store.
 * Players spend accumulated points to unlock avatar characters.
 * Exports AVATARS constant so App.jsx can resolve the active avatar emoji.
 */

export const AVATARS = [
  { id: 'owl',     emoji: '🦉', name: 'Wise Owl',         cost: 0   },
  { id: 'hero',    emoji: '🦸', name: 'Super Hero',       cost: 0   },
  { id: 'lion',    emoji: '🦁', name: 'Brave Lion',       cost: 50  },
  { id: 'tiger',   emoji: '🐯', name: 'Swift Tiger',      cost: 100 },
  { id: 'rocket',  emoji: '🚀', name: 'Space Explorer',   cost: 150 },
  { id: 'dragon',  emoji: '🐉', name: 'Fire Dragon',      cost: 200 },
  { id: 'wizard',  emoji: '🧙', name: 'Word Wizard',      cost: 300 },
  { id: 'unicorn', emoji: '🦄', name: 'Reading Unicorn',  cost: 500 },
];

export function RewardStore({ points, unlockedAvatars, activeAvatar, onBuy, onEquip, onClose }) {
  return (
    <div className="store-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Avatar Store">
      <div className="store-panel animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="store-header">
          <h2>🏪 Avatar Store</h2>
          <div className="store-points">⭐ {points} points</div>
          <button className="store-close-btn" onClick={onClose} aria-label="Close store">✕</button>
        </div>

        <p className="store-subtitle">Unlock characters by earning points through studying!</p>

        <div className="avatar-grid">
          {AVATARS.map((avatar) => {
            const isUnlocked = unlockedAvatars.includes(avatar.id);
            const isActive   = activeAvatar === avatar.id;
            const canAfford  = points >= avatar.cost;

            return (
              <div
                key={avatar.id}
                className={`avatar-card ${isActive ? 'avatar-active' : ''} ${isUnlocked ? 'avatar-unlocked' : 'avatar-locked'}`}
              >
                <div className="avatar-emoji" aria-hidden="true">{avatar.emoji}</div>
                <div className="avatar-name">{avatar.name}</div>

                {isUnlocked ? (
                  <button
                    className={isActive ? 'accent' : 'primary'}
                    onClick={() => onEquip(avatar)}
                    disabled={isActive}
                  >
                    {isActive ? '✅ Active' : 'Equip'}
                  </button>
                ) : (
                  <button
                    className="primary"
                    onClick={() => onBuy(avatar)}
                    disabled={!canAfford}
                    style={{ opacity: canAfford ? 1 : 0.45 }}
                    title={canAfford ? `Buy for ${avatar.cost} pts` : `Need ${avatar.cost - points} more points`}
                  >
                    🔒 {avatar.cost} pts
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="store-hint">
          Earn points: +2 for flipping a card · +10 for a quiz answer · +15 for fill-in-the-blank · +50 for uploading a document
        </p>
      </div>
    </div>
  );
}
