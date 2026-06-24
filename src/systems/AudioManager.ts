import type { EventBus } from '@systems/EventBus';

export class AudioManager {
  #muted = false;

  constructor(private readonly events: EventBus) {}

  get muted(): boolean {
    return this.#muted;
  }

  setMuted(muted: boolean): void {
    if (this.#muted === muted) {
      return;
    }

    this.#muted = muted;
    this.events.emit('audio:muted', { muted });
  }
}
