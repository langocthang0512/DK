import { GameBootstrap } from '@core/GameBootstrap';
import { createServices } from '@core/Services';

export function createGame(parent: string): GameBootstrap {
  const services = createServices();
  const bootstrap = new GameBootstrap(services);

  bootstrap.start(parent);

  return bootstrap;
}
