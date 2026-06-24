import type { EventBus } from '@systems/EventBus';

export class InputManager {
  #enabled = true;

  constructor(private readonly events: EventBus) {}

  get enabled(): boolean {
    return this.#enabled;
  }

  setEnabled(enabled: boolean, source = 'system'): void {
    if (this.#enabled === enabled) {
      return;
    }

    this.#enabled = enabled;
    this.events.emit('input:changed', { source });
  }
}
