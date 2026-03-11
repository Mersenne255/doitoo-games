import {css, html, LitElement} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import './number-keyboard.ts';

type GameMode = 'sequence' | 'complete';
type GameStage = 'idle' | 'showing' | 'input' | 'result';

interface GameConfig {
  interval: number;
  numberLength: number;
  duration: number;
}

const STORAGE_KEYS = {
  config: 'doitoo-memory-game:config',
  mode: 'doitoo-memory-game:mode'
} as const;

const LEGACY_STORAGE_KEYS = {
  config: 'config',
  mode: 'mode'
} as const;

const DEFAULT_CONFIG: GameConfig = {
  interval: 1000,
  numberLength: 8,
  duration: 2000
};

const CONFIG_LIMITS = {
  numberLength: { min: 1, max: 32 },
  interval: { min: 200, max: 10000 },
  duration: { min: 500, max: 15000 }
} as const;

const DIGITS = '0123456789';
const START_DELAY_MS = 100;
const DISPLAY_GAP_MS = 100;

@customElement('memory-number-game')
export class MemoryNumberGame extends LitElement {
  @state() private config: GameConfig = { ...DEFAULT_CONFIG };
  @state() private mode: GameMode = 'sequence';
  @state() private stage: GameStage = 'idle';
  @state() private displayValue = '';
  @state() private inputValue = '';
  @state() private resultMessage = '';
  @state() private isCorrect: boolean | null = null;

  private currentRoundConfig: GameConfig = { ...DEFAULT_CONFIG };
  private roundAbortController: AbortController | null = null;
  private sequence: string[] = [];

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      --blue: #2563eb;
    }

    h1 {
      margin: 0;
      text-align: center;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      gap: 1rem;
    }

    .number {
      font-size: 3.5rem;
      font-family: monospace;
    }

    .config {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    button {
      background: #888888;
      color: white;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }

    button[selected] {
      background: var(--blue);
    }

    *[disabled] {
      filter: opacity(.5);
    }

    input[type='number'],
    select {
      width: 100%;
      padding: 0.4rem;
      border: 1px solid #ddd;
      border-radius: 0.4rem;
    }

    .success {
      color: green;
    }

    .fail {
      color: red;
    }

    .center {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .flexColumn{
      display: flex;
      flex-direction: column;
    }

    .result {
      font-size: 2rem;
    }
  `;

  constructor() {
    super();
    this.config = this.readStoredConfig();
    this.mode = this.readStoredMode();
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this._handleRealKeyboardInput);
  }

  disconnectedCallback() {
    this.abortCurrentRound();
    window.removeEventListener('keydown', this._handleRealKeyboardInput);
    super.disconnectedCallback();
  }

  private canUseStorage(): boolean {
    try {
      return typeof window !== 'undefined'
        && 'localStorage' in window
        && typeof window.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  private getStoredItem(key: string, legacyKey?: string): string | null {
    if (!this.canUseStorage()) {
      return null;
    }

    try {
      const storedValue = window.localStorage.getItem(key);

      if (storedValue !== null) {
        return storedValue;
      }

      return legacyKey ? window.localStorage.getItem(legacyKey) : null;
    } catch {
      return null;
    }
  }

  private readStoredConfig(): GameConfig {
    try {
      const stored = this.getStoredItem(STORAGE_KEYS.config, LEGACY_STORAGE_KEYS.config);

      if (!stored) {
        return { ...DEFAULT_CONFIG };
      }

      return this.sanitizeConfig(JSON.parse(stored));
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  private readStoredMode(): GameMode {
    try {
      const stored = this.getStoredItem(STORAGE_KEYS.mode, LEGACY_STORAGE_KEYS.mode);

      if (!stored) {
        return 'sequence';
      }

      return this.sanitizeMode(JSON.parse(stored));
    } catch {
      return 'sequence';
    }
  }

  private persistConfig() {
    if (!this.canUseStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(this.config));
    } catch {
      // Ignore storage write failures and keep the game playable.
    }
  }

  private persistMode() {
    if (!this.canUseStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEYS.mode, JSON.stringify(this.mode));
    } catch {
      // Ignore storage write failures and keep the game playable.
    }
  }

  private sanitizeMode(mode: unknown): GameMode {
    return mode === 'complete' ? 'complete' : 'sequence';
  }

  private clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    const parsedValue = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsedValue)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(parsedValue)));
  }

  private sanitizeConfig(config: unknown): GameConfig {
    const candidate = typeof config === 'object' && config !== null
      ? config as Partial<Record<keyof GameConfig, unknown>>
      : {};

    return {
      interval: this.clampNumber(
        candidate.interval,
        CONFIG_LIMITS.interval.min,
        CONFIG_LIMITS.interval.max,
        DEFAULT_CONFIG.interval
      ),
      numberLength: this.clampNumber(
        candidate.numberLength,
        CONFIG_LIMITS.numberLength.min,
        CONFIG_LIMITS.numberLength.max,
        DEFAULT_CONFIG.numberLength
      ),
      duration: this.clampNumber(
        candidate.duration,
        CONFIG_LIMITS.duration.min,
        CONFIG_LIMITS.duration.max,
        DEFAULT_CONFIG.duration
      )
    };
  }

  private areConfigsEqual(left: GameConfig, right: GameConfig): boolean {
    return left.interval === right.interval
      && left.numberLength === right.numberLength
      && left.duration === right.duration;
  }

  private normalizeCurrentConfig(): GameConfig {
    const sanitizedConfig = this.sanitizeConfig(this.config);

    if (!this.areConfigsEqual(this.config, sanitizedConfig)) {
      this.config = sanitizedConfig;
      this.persistConfig();
    }

    return { ...sanitizedConfig };
  }

  private updateConfig(key: keyof GameConfig, value: number) {
    const nextConfig = this.sanitizeConfig({ ...this.config, [key]: value });

    if (this.areConfigsEqual(this.config, nextConfig)) {
      return;
    }

    this.config = nextConfig;
    this.persistConfig();

    if (this.isRoundActive()) {
      this.resetToIdle();
    }
  }

  private abortCurrentRound() {
    this.roundAbortController?.abort();
    this.roundAbortController = null;
  }

  private isRoundActive(): boolean {
    return this.stage === 'showing' || this.stage === 'input';
  }

  private resetToIdle() {
    this.abortCurrentRound();
    this.currentRoundConfig = this.normalizeCurrentConfig();
    this.sequence = [];
    this.stage = 'idle';
    this.resetRoundState();
  }

  private async wait(delayMs: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      throw new DOMException('Round aborted', 'AbortError');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        resolve();
      }, delayMs);

      const handleAbort = () => {
        cleanup();
        reject(new DOMException('Round aborted', 'AbortError'));
      };

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        signal.removeEventListener('abort', handleAbort);
      };

      signal.addEventListener('abort', handleAbort, { once: true });
    });
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
  }

  private resetRoundState() {
    this.displayValue = '';
    this.inputValue = '';
    this.resultMessage = '';
    this.isCorrect = null;
  }

  private generateSequence(length: number): string[] {
    return Array.from({ length }, () => {
      const index = Math.floor(Math.random() * DIGITS.length);
      return DIGITS[index] ?? '0';
    });
  }

  private async startGame() {
    this.abortCurrentRound();

    const controller = new AbortController();
    const roundMode = this.mode;
    const config = this.normalizeCurrentConfig();

    this.roundAbortController = controller;
    this.currentRoundConfig = config;
    this.sequence = [];
    this.stage = 'showing';
    this.resetRoundState();

    try {
      await this.wait(START_DELAY_MS, controller.signal);

      if (roundMode === 'sequence') {
        this.sequence = this.generateSequence(config.numberLength);

        for (const digit of this.sequence) {
          this.displayValue = digit;
          await this.wait(config.interval, controller.signal);
          this.displayValue = '';
          await this.wait(DISPLAY_GAP_MS, controller.signal);
        }
      } else {
        const value = this.generateSequence(config.numberLength).join('');
        this.sequence = [value];
        this.displayValue = value;
        await this.wait(config.duration, controller.signal);
      }

      this.displayValue = '';
      this.stage = 'input';
    } catch (error) {
      if (!this.isAbortError(error)) {
        throw error;
      }
    } finally {
      if (this.roundAbortController === controller) {
        this.roundAbortController = null;
      }
    }
  }

  private handleKey(key: string): boolean {
    if (this.stage === 'input') {
      if (key === 'del') {
        this.inputValue = this.inputValue.slice(0, -1);
        return true;
      }

      if (key === 'ok') {
        this.checkAnswer();
        return true;
      }

      if (!/^[0-9]$/.test(key)) {
        return false;
      }

      if (this.inputValue.length >= this.currentRoundConfig.numberLength) {
        return true;
      }

      this.inputValue += key;

      if (this.inputValue.length === this.currentRoundConfig.numberLength) {
        this.checkAnswer();
      }

      return true;
    }

    if ((this.stage === 'result' || this.stage === 'idle') && key === 'ok') {
      void this.startGame();
      return true;
    }

    return false;
  }

  private _handleVirtualKeyboardInput(e: CustomEvent<{ key?: string }>) {
    const key = e.detail.key;

    if (typeof key === 'string') {
      this.handleKey(key);
    }
  }

  private isEditableTarget(event: KeyboardEvent): boolean {
    return event.composedPath().some((node) => {
      if (!(node instanceof HTMLElement)) {
        return false;
      }

      return node.isContentEditable
        || node instanceof HTMLInputElement
        || node instanceof HTMLSelectElement
        || node instanceof HTMLTextAreaElement
        || node instanceof HTMLButtonElement;
    });
  }

  private _handleRealKeyboardInput = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey || this.isEditableTarget(e)) {
      return;
    }

    let key: string | null = null;

    if (/^[0-9]$/.test(e.key)) {
      key = e.key;
    } else {
      switch (e.key) {
        case 'Enter':
          key = 'ok';
          break;
        case 'Backspace':
        case 'Delete':
          key = 'del';
          break;
        default:
          key = null;
      }
    }

    if (!key) {
      return;
    }

    const handled = this.handleKey(key);

    if (handled) {
      e.preventDefault();
    }
  }

  private checkAnswer() {
    if (this.stage !== 'input') {
      return;
    }

    const correct = this.sequence.join('');
    const isCorrect = this.inputValue.trim() === correct;

    this.isCorrect = isCorrect;
    this.resultMessage = isCorrect ? 'Correct! 🎉' : correct;
    this.stage = 'result';
  }

  private _setMode(mode: GameMode) {
    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.persistMode();

    if (this.isRoundActive()) {
      this.resetToIdle();
    }
  }

  private _handleConfigChange(key: keyof GameConfig, e: Event) {
    const input = e.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    this.updateConfig(key, Number(input.value));
  }

  render() {
    const isSequence = this.mode === 'sequence';
    const roundActive = this.isRoundActive();

    return html`
      <div class="container">
        <h1><span style="color: var(--blue)">Doitoo</span> Numbers</h1>
        <div style="height: 100px;">
          <div class="number center">${this.displayValue}</div>
          <div class="number center">${this.inputValue}</div>
          ${this.stage === 'result' && this.isCorrect !== null ? html`
            <div class="result center ${this.isCorrect ? 'success' : 'fail'}">
              <strong>${this.resultMessage}</strong>
            </div>
          ` : null}
        </div>


        <number-keyboard
          @input-key=${this._handleVirtualKeyboardInput}
          ?disabled=${this.stage !== 'input'}
        ></number-keyboard>
        <div style="grid-column: 1/3; text-align: center; margin-top: 0.5rem;">
          <button selected ?disabled=${this.stage === 'showing'} @click=${() => void this.startGame()}>
            Start Game
          </button>
        </div>


        <div class="config">
          <label class="center flexColumn">
            Mode
            <div style="display: flex; flex-direction: row; gap: 1rem; justify-content: center;">
              <button ?selected=${isSequence} ?disabled=${roundActive} @click=${() => this._setMode('sequence')}>Sequence</button>
              <button ?selected=${!isSequence} ?disabled=${roundActive} @click=${() => this._setMode('complete')}>Complete</button>
            </div>
          </label>
          <label class="center flexColumn">
            Numbers count
            <input
              type="number"
              min=${CONFIG_LIMITS.numberLength.min}
              max=${CONFIG_LIMITS.numberLength.max}
              step="1"
              ?disabled=${roundActive}
              .value=${String(this.config.numberLength)}
              @change=${(e: Event) => this._handleConfigChange('numberLength', e)}
            />
          </label>
          <label class="center flexColumn">
            ${isSequence ? 'Interval (ms)' : 'Duration (ms)'}
            <input
              type="number"
              min=${isSequence ? CONFIG_LIMITS.interval.min : CONFIG_LIMITS.duration.min}
              max=${isSequence ? CONFIG_LIMITS.interval.max : CONFIG_LIMITS.duration.max}
              step="100"
              ?disabled=${roundActive}
              .value=${String(isSequence ? this.config.interval : this.config.duration)}
              @change=${(e: Event) => this._handleConfigChange(isSequence ? 'interval' : 'duration', e)}
            />
          </label>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'memory-number-game': MemoryNumberGame
  }
}
