import { Component } from '@angular/core';
import { GAME_INFO_STYLES } from './game-info-styles';

@Component({
  selector: 'app-numbers-info',
  standalone: true,
  styles: [GAME_INFO_STYLES],
  template: `
<section class="benefits">
  <h3>Cognitive Benefits</h3>
  <ul>
    <li><strong>Short-Term Memory</strong> — Expands the amount of information you can hold in mind over brief intervals</li>
    <li><strong>Numerical Processing</strong> — Strengthens your brain's ability to encode and recall number sequences</li>
    <li><strong>Concentration</strong> — Trains deep focus during the memorization and recall phases</li>
    <li><strong>Sequential Memory</strong> — Improves recall of items in their correct order</li>
    <li><strong>Memory Span</strong> — Gradually pushes the upper limit of digits you can reliably remember</li>
    <li><strong>Mental Rehearsal</strong> — Builds the habit of actively rehearsing information to keep it accessible</li>
    <li><strong>Encoding Speed</strong> — Encourages faster initial registration of new information into memory</li>
  </ul>
</section>
<section class="mechanics">
  <h3>How It Works</h3>
  <p>A sequence of numbers is displayed briefly on screen. After the sequence disappears, you must recall and enter the numbers in the correct order. The sequence length increases as you succeed, testing the limits of your short-term memory span.</p>
</section>
<section class="references">
  <h3>References</h3>
  <ol>
    <li>Miller, G. A. (1956). The magical number seven, plus or minus two: Some limits on our capacity for processing information. <em>Psychological Review</em>, 63(2), 81–97.</li>
    <li>Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental storage capacity. <em>Behavioral and Brain Sciences</em>, 24(1), 87–114.</li>
    <li>Baddeley, A. (2003). Working memory: Looking back and looking forward. <em>Nature Reviews Neuroscience</em>, 4(10), 829–839.</li>
    <li>Klingberg, T. (2010). Training and plasticity of working memory. <em>Trends in Cognitive Sciences</em>, 14(7), 317–324.</li>
  </ol>
</section>
`
})
export class NumbersInfoComponent {}
