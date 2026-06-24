import { env } from '@config/env';
import type { SaveData, SaveSystem } from '@services/SaveSystem';

export class LocalStorageSaveSystem implements SaveSystem {
  readonly #prefix = env.saveNamespace;

  load<TData extends SaveData>(slot: string): TData | null {
    const raw = localStorage.getItem(this.#key(slot));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as TData;
  }

  save<TData extends SaveData>(slot: string, data: TData): void {
    localStorage.setItem(this.#key(slot), JSON.stringify(data));
  }

  delete(slot: string): void {
    localStorage.removeItem(this.#key(slot));
  }

  #key(slot: string): string {
    return `${this.#prefix}:${slot}`;
  }
}
