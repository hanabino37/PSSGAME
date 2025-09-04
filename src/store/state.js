 export function createInitialState() {
   return {
     csvData: [],
     years: [],          // CSVから作った年の候補
     usedWords: new Set(),
     scores: [],
     totalPlayers: 2,
     currentPlayer: 1,
     initialTarget: 100,
     remainingPoints: 100,
     isGameOver: false,
     recentHits: [],
     fsm: 'Idle',
     restrict: 'none',   // なし / name / maker / year
    exLockEnabled: false,
    exLocked: false,    // 一度発動したら true
    exLockYear: '',     // ロックされた年
   };
 }
