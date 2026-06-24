import type { EventBus } from '@systems/EventBus';

export class StateManager {
  readonly #state = new Map<string, unknown>();

  constructor(private readonly events: EventBus) {}

  get<TValue>(key: string): TValue | undefined {
    return this.#state.get(key) as TValue | undefined;
  }

  set<TValue>(key: string, value: TValue): void {
    this.#state.set(key, value);
    this.events.emit('state:changed', { key, value });
  }

  has(key: string): boolean {
    return this.#state.has(key);
  }

  remove(key: string): boolean {
    return this.#state.delete(key);
  }

  clear(): void {
    this.#state.clear();
  }
}
