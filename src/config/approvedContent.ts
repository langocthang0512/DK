export const approvedContent = {
  player: {
    animations: ['idle', 'run', 'jumpStart', 'jumpInBetween', 'fall', 'attack', 'hit', 'death', 'turnAround']
  },
  environment: {
    ground: 'environment.approved.ground',
    floatingPlatforms: ['environment.approved.smallPlatform', 'environment.approved.vinePlatform']
  },
  enemies: ['snake', 'hyena', 'scorpio', 'vulture'],
  traps: ['spike', 'axe'],
  boss: 'boss.dragon'
} as const;
