import './styles.css';

import { GAME_ROOT_ID } from '@constants/app';
import { createGame } from '@game/createGame';
import { assertElement } from '@utils/assertElement';

const root = assertElement(document.getElementById(GAME_ROOT_ID), `Missing #${GAME_ROOT_ID}.`);
const game = createGame(root.id);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.stop();
  });
}
