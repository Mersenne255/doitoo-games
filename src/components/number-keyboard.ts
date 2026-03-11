import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('number-keyboard')
export class NumberKeyboard extends LitElement {
  static styles = css`
    :host {
        box-sizing: border-box;
    }
    .keyboard {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
      justify-content: center;
    }
    button {
      font-size: 1.25rem;
      padding: 1rem;
      background: #4b5563;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }
  `;

  private emit(key: string) {
    this.dispatchEvent(new CustomEvent('input-key', { detail: { key }, bubbles: true, composed: true }));
  }

  render() {
    const keys = ['1','2','3','4','5','6','7','8','9','del','0','ok'];
    return html`
      <div class="keyboard">
        ${keys.map(key => html`<button @click=${() => this.emit(key)}>${key}</button>`)}
      </div>
    `;
  }
}