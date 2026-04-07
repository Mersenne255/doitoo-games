import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CellContent, ShapeLayer, ShapeColor, COLOR_HEX } from '../../models/game.models';
import { getLayerTransform, getLayerSvg } from '../../utils/cell-render.util';

@Component({
  selector: 'app-cell-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showMissing() && !content()) {
      <svg viewBox="0 0 100 100" class="cell-svg" aria-label="Missing cell">
        <text x="50" y="58" text-anchor="middle" dominant-baseline="middle"
              font-size="48" font-weight="bold" fill="#94a3b8">?</text>
      </svg>
    } @else if (content(); as c) {
      <svg viewBox="0 0 100 100" class="cell-svg"
           [attr.aria-label]="'Cell with ' + c.layers.length + ' layers'"
           [innerHTML]="buildSvgContent(c)">
      </svg>
    } @else {
      <svg viewBox="0 0 100 100" class="cell-svg" aria-label="Empty cell"></svg>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .cell-svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  `,
})
export class CellRendererComponent {
  readonly content = input<CellContent | null>(null);
  readonly showMissing = input<boolean>(false);
  private readonly sanitizer = inject(DomSanitizer);

  readonly instanceId = Math.random().toString(36).slice(2, 8);

  buildSvgContent(c: CellContent): SafeHtml {
    let defs = '<defs>';
    for (let i = 0; i < c.layers.length; i++) {
      const layer = c.layers[i];
      const stroke = COLOR_HEX[layer.color];
      const fill = COLOR_HEX[layer.color];
      defs += `<pattern id="stripe-${this.instanceId}-${i}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`;
      defs += `<line x1="0" y1="0" x2="0" y2="10" stroke="${stroke}" stroke-width="4"/>`;
      defs += `</pattern>`;
      defs += `<pattern id="dot-${this.instanceId}-${i}" width="12" height="12" patternUnits="userSpaceOnUse">`;
      defs += `<circle cx="6" cy="6" r="3" fill="${fill}"/>`;
      defs += `</pattern>`;
    }
    defs += '</defs>';

    let shapes = '';
    for (let i = 0; i < c.layers.length; i++) {
      const layer = c.layers[i];
      const transform = getLayerTransform(layer, i, c.layers.length);
      const svg = getLayerSvg(layer, this.instanceId, i);
      shapes += `<g transform="${transform}">${svg}</g>`;
    }

    return this.sanitizer.bypassSecurityTrustHtml(defs + shapes);
  }
}
