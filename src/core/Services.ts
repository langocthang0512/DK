import { AssetLoader } from '@assets/AssetLoader';
import { AudioManager } from '@systems/AudioManager';
import { DebugMode } from '@systems/DebugMode';
import { EventBus } from '@systems/EventBus';
import { InputManager } from '@systems/InputManager';
import { StateManager } from '@systems/StateManager';
import { LocalStorageSaveSystem } from '@services/LocalStorageSaveSystem';
import type { SaveSystem } from '@services/SaveSystem';

export type Services = Readonly<{
  assets: AssetLoader;
  audio: AudioManager;
  debug: DebugMode;
  events: EventBus;
  input: InputManager;
  save: SaveSystem;
  state: StateManager;
}>;

export function createServices(): Services {
  const events = new EventBus();
  const state = new StateManager(events);
  const save = new LocalStorageSaveSystem();

  return {
    assets: new AssetLoader(),
    audio: new AudioManager(events),
    debug: new DebugMode(),
    events,
    input: new InputManager(events),
    save,
    state
  };
}
