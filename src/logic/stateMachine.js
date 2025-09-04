export const States = { Idle: 'Idle', Searching: 'Searching', Revealing: 'Revealing', GameOver: 'GameOver' };

export function can(action, state) {
  const s = state.fsm;
  const table = {
    start:    [States.Idle],
    search:   [States.Idle, States.Revealing],
    reveal:   [States.Searching],
    next:     [States.Revealing],
    gameover: [States.Revealing],
  };
  return table[action]?.includes(s);
}
