export type GameEventMap = {
  'scene:ready': { key: string };
  'state:changed': { key: string; value: unknown };
  'input:changed': { source: string };
  'audio:muted': { muted: boolean };
};

type EventHandler<TPayload> = (payload: TPayload) => void;

export class EventBus {
  readonly #listeners = new Map<
    keyof GameEventMap,
    Set<EventHandler<GameEventMap[keyof GameEventMap]>>
  >();

  on<TKey extends keyof GameEventMap>(
    event: TKey,
    handler: EventHandler<GameEventMap[TKey]>
  ): () => void {
    const listeners =
      this.#listeners.get(event) ?? new Set<EventHandler<GameEventMap[keyof GameEventMap]>>();
    listeners.add(handler as EventHandler<GameEventMap[keyof GameEventMap]>);
    this.#listeners.set(event, listeners);

    return () => this.off(event, handler);
  }

  off<TKey extends keyof GameEventMap>(
    event: TKey,
    handler: EventHandler<GameEventMap[TKey]>
  ): void {
    this.#listeners.get(event)?.delete(handler as EventHandler<GameEventMap[keyof GameEventMap]>);
  }

  emit<TKey extends keyof GameEventMap>(event: TKey, payload: GameEventMap[TKey]): void {
    this.#listeners.get(event)?.forEach((handler) => handler(payload));
  }

  clear(): void {
    this.#listeners.clear();
  }
}
