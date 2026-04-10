import { Component } from '@angular/core';
import { GAME_INFO_STYLES } from './game-info-styles';

@Component({
  selector: 'app-mindflow-info',
  standalone: true,
  styles: [GAME_INFO_STYLES],
  template: `
<section class="benefits">
  <h3>Cognitive Benefits</h3>
  <ul>
    <li><strong>Executive Function</strong> — Strengthens planning, decision-making, and goal-directed behavior</li>
    <li><strong>Spatial Reasoning</strong> — Improves your ability to visualize and manipulate objects in space</li>
    <li><strong>Strategic Planning</strong> — Trains you to think multiple steps ahead when routing shapes</li>
    <li><strong>Cognitive Flexibility</strong> — Builds the ability to adjust your strategy when new shapes appear or paths change</li>
    <li><strong>Visual Tracking</strong> — Sharpens your capacity to follow multiple moving objects simultaneously</li>
    <li><strong>Problem Solving</strong> — Develops systematic approaches to resolving routing conflicts</li>
    <li><strong>Processing Speed</strong> — Encourages faster evaluation of junction states and shape destinations</li>
  </ul>
</section>
<section class="mechanics">
  <h3>How It Works</h3>
  <p>Shapes travel along a network of tracks toward destination stations. You control junctions to route each shape to its matching station. Tap a junction to switch its direction before shapes arrive. As levels progress, more shapes, tracks, and junctions are introduced.</p>
</section>
<section class="references">
  <h3>References</h3>
  <ol>
    <li>Diamond, A. (2013). Executive functions. <em>Annual Review of Psychology</em>, 64, 135–168.</li>
    <li>Miyake, A., Friedman, N. P., Emerson, M. J., Witzki, A. H., Howerter, A., &amp; Wager, T. D. (2000). The unity and diversity of executive functions. <em>Cognitive Psychology</em>, 41(1), 49–100.</li>
    <li>Hegarty, M., &amp; Waller, D. (2005). Individual differences in spatial abilities. In P. Shah &amp; A. Miyake (Eds.), <em>The Cambridge Handbook of Visuospatial Thinking</em>, 121–169.</li>
    <li>Pylyshyn, Z. W., &amp; Storm, R. W. (1988). Tracking multiple independent targets: Evidence for a parallel tracking mechanism. <em>Spatial Vision</em>, 3(3), 179–197.</li>
  </ol>
</section>
`
})
export class MindflowInfoComponent {}
