import {css, html, LitElement} from 'lit'
import {customElement, state} from 'lit/decorators.js';
import './number-keyboard.ts';

@customElement('memory-number-game')
export class MemoryNumberGame extends LitElement {
  @state() private mode: 'sequence' | 'complete' = 'sequence';
  @state() private stage: 'idle' | 'showing' | 'input' | 'result' = 'idle';
  @state() private displayValue = '';
  @state() private inputValue = '';
  @state() private result = html``;

  private config = {
    interval: 1000,
    numberLength: 8,
    duration: 2000
  };
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
    const stored = localStorage.getItem('config');
    if (stored) this.config = JSON.parse(stored);
    const storedMode = localStorage.getItem('mode');
    if (storedMode) this.mode = JSON.parse(storedMode);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this._handleRealKeyboardInput);
  }

  protected updated(): void {
  }

  private updateConfig(key: string, value: number) {
    this.config = { ...this.config, [key]: value };
    localStorage.setItem('config', JSON.stringify(this.config));
  }

  private async startGame() {
    this.inputValue = '';
    this.result = html``;
    await new Promise(res => setTimeout(res, 100));
    if (this.mode === 'sequence') {
      this.sequence = Array.from({ length: this.config.numberLength }, () =>
        Math.floor(Math.random() * 10).toString()
      );
      this.stage = 'showing';
      for (const num of this.sequence) {
        this.displayValue = num;
        await new Promise(res => setTimeout(res, this.config.interval));
        this.displayValue = '';
        await new Promise(res => setTimeout(res, 100));
      }
    } else {
      const digits = '0123456789';
      const num = Array.from({ length: this.config.numberLength }, () =>
        digits[Math.floor(Math.random() * 10)]
      ).join('');
      this.sequence = [num];
      this.displayValue = num;
      this.stage = 'showing';
      await new Promise(res => setTimeout(res, this.config.duration));
    }
    this.displayValue = '';
    this.stage = 'input';
  }

  private handleKey(key: string){
    if(this.stage === 'input') {
      if (key === 'del') this.inputValue = this.inputValue.slice(0, -1);
      else if (key === 'ok') this.checkAnswer();
      else if (/^[0-9]$/.test(key)) {
        this.inputValue += key;
        const confLength = this.mode === 'sequence' ? this.config.numberLength : this.config.numberLength;
        if (this.inputValue.length >= confLength) this.checkAnswer();
      }
    } else if(this.stage === 'result' || this.stage === 'idle'){
      if(key === 'ok') this.startGame();
    }
  }

  private _handleVirtualKeyboardInput(e: CustomEvent) {
    if (this.stage !== 'input') return;
    const key = e.detail.key;
    this.handleKey(key);
  }

  private _handleRealKeyboardInput = (e: KeyboardEvent) => {
    let key = e.key;
    switch (e.key) {
      case 'Enter': key = 'ok'; break;
      case 'Backspace': key = 'del'; break;
    }
    this.handleKey(key);
  }

  private checkAnswer() {
    const correct = this.sequence.join('');
    this.result = this.inputValue.trim() === correct ? html`<div class="success">Correct! 🎉</div` : html`<div class="fail">${correct}</div>`;
    this.stage = 'result';
  }

  private _setMode(mode: 'sequence' | 'complete') {
    this.mode = mode;
    localStorage.setItem('mode', JSON.stringify(mode));
  }

  render() {
    let isSequence = this.mode === 'sequence';
    return html`
      <div class="container">
        <h1><span style="color: var(--blue)">Doitoo</span> Numbers</h1>
        <div style="height: 100px;">
          <div class="number center">${this.displayValue}</div>
          <div class="number center">${this.inputValue}</div>
          ${this.stage === 'result' ? html`
            <div class="result center"><strong>${this.result}</strong></div>` : null}
        </div>


        <number-keyboard @input-key=${this._handleVirtualKeyboardInput} ?inert=${this.stage !== 'input'} ?disabled=${this.stage !== 'input'}></number-keyboard>
        <div style="grid-column: 1/3; text-align: center; margin-top: 0.5rem;">
          <button selected ?disabled=${this.stage === 'showing'} @click=${this.startGame.bind(this)}>Start Game</button>
        </div>


        <div class="config">
          <label class="center flexColumn">
            Mode
            <div style="display: flex; flex-direction: row; gap: 1rem; justify-content: center;">
              <button ?selected=${isSequence} @click=${() => this._setMode('sequence')}>Sequence</button>
              <button ?selected=${!isSequence} @click=${() => this._setMode('complete')}>Complete</button>
            </div>
          </label>
          <label class="center flexColumn">
            Numbers count
            <input type="number" .value=${this.config.numberLength}
                   @input=${(e: any) => this.updateConfig('numberLength', +(e.target as HTMLInputElement).value)}/>
          </label>
          <label class="center flexColumn">
            ${ isSequence ? 'Interval (ms)' : 'Duration (ms)'}
            <input type="number" .value=${isSequence ? this.config.interval : this.config.duration}
                   @input=${(e: any) => this.updateConfig(isSequence ? 'interval' : 'duration', +(e.target as HTMLInputElement).value)}/>
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
