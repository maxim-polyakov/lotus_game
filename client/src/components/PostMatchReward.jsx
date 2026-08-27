/** Helpers for post-match gold/dust/card/hero rewards (shown in MatchScene). */

export function formatPostMatchReward(reward) {
  if (!reward) return '';
  if (reward.type === 'REWARD_GOLD') {
    return reward.rewardAmount != null
      ? `+${reward.rewardAmount} золота`
      : (reward.message || 'Золото');
  }
  if (reward.type === 'REWARD_DUST') {
    return reward.rewardAmount != null
      ? `+${reward.rewardAmount} пыли`
      : (reward.message || 'Пыль');
  }
  if (reward.type === 'CARD_UNLOCK') {
    return reward.cardName ? `Новая карта: ${reward.cardName}` : (reward.message || 'Новая карта');
  }
  if (reward.type === 'HERO_UNLOCK') {
    return reward.heroName ? `Новый герой: ${reward.heroName}` : (reward.message || 'Новый герой');
  }
  return reward.message || reward.title || '';
}

export default { formatPostMatchReward };
