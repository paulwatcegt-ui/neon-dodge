export const ENEMIES = Object.freeze({
  chaser: { name: '追猎者', color: 0xed7184, cap: 10, shots: 1 },
  shooter: { name: '射手', color: 0xec9b75, cap: 4, shots: 1 },
  charger: { name: '冲锋者', color: 0xc69bff, cap: 4, shots: 1 },
  zoner: { name: '封锁者', color: 0xe5d06c, cap: 2, shots: 1 },
  spread: { name: '散射无人机', color: 0x50dcff, cap: 3, shots: 3 },
  sniper: { name: '狙击无人机', color: 0xff557c, cap: 2, shots: 3 },
  orbiter: { name: '环绕无人机', color: 0x879bff, cap: 3, shots: 1 },
  blaster: { name: '爆裂无人机', color: 0xb4ff53, cap: 3, shots: 1 },
});
export const ACTIVE_ATTACK_STATES = ['windup', 'charge', 'burst'];
export const HIGH_RISK_TYPES = ['charger', 'zoner', 'spread', 'sniper', 'blaster'];
