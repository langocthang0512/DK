export type SaveData = Record<string, unknown>;

export interface SaveSystem {
  load<TData extends SaveData>(slot: string): TData | null;
  save<TData extends SaveData>(slot: string, data: TData): void;
  delete(slot: string): void;
}
