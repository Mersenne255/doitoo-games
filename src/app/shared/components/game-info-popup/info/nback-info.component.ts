import { Component } from '@angular/core';
import { GAME_INFO_STYLES } from './game-info-styles';

@Component({
  selector: 'app-nback-info',
  standalone: true,
  styles: [GAME_INFO_STYLES],
  template: `
<section class="benefits">
  <h3>Cognitive Benefits</h3>
  <ul>
    <li><strong>Working Memory</strong> — Strengthens your ability to hold and manipulate information over short periods</li>
    <li><strong>Fluid Intelligence</strong> — Improves reasoning and problem-solving with novel information</li>
    <li><strong>Attention Control</strong> — Trains sustained focus on two simultaneous input streams</li>
    <li><strong>Dual-Task Processing</strong> — Builds capacity to track visual and auditory cues at the same time</li>
    <li><strong>Interference Management</strong> — Sharpens your ability to filter out irrelevant past stimuli</li>
    <li><strong>Cognitive Load Tolerance</strong> — Increases the mental workload you can handle before performance drops</li>
    <li><strong>Processing Speed</strong> — Encourages faster encoding and retrieval of recent items</li>
  </ul>
</section>
<section class="mechanics">
  <h3>How It Works</h3>
  <p>You are shown a sequence of positions on a grid and hear a sequence of sounds. Your task is to indicate when the current position or sound matches the one from N steps back. As you improve, N increases, demanding more from your working memory.</p>
</section>
<section class="references">
  <h3>References</h3>
  <ol>
    <li>Jaeggi, S. M., Buschkuehl, M., Jonides, J., &amp; Perrig, W. J. (2008). Improving fluid intelligence with training on working memory. <em>Proceedings of the National Academy of Sciences</em>, 105(19), 6829–6833.</li>
    <li>Soveri, A., Antfolk, J., Karlsson, L., Salo, B., &amp; Laine, M. (2017). Working memory training revisited: A multi-level meta-analysis of n-back training studies. <em>Psychonomic Bulletin &amp; Review</em>, 24(4), 1077–1096.</li>
    <li>Owen, A. M., McMillan, K. M., Laird, A. R., &amp; Bullmore, E. (2005). N-back working memory paradigm: A meta-analysis of normative functional neuroimaging studies. <em>Human Brain Mapping</em>, 25(1), 46–59.</li>
    <li>Au, J., Sheehan, E., Tsai, N., Duncan, G. J., Buschkuehl, M., &amp; Jaeggi, S. M. (2015). Improving fluid intelligence with training on working memory: A meta-analysis. <em>Psychonomic Bulletin &amp; Review</em>, 22(2), 366–377.</li>
  </ol>
</section>
`
})
export class NbackInfoComponent {}
