import { Component } from '@angular/core';
import { GAME_INFO_STYLES } from './game-info-styles';

@Component({
  selector: 'app-voxel-info',
  standalone: true,
  styles: [GAME_INFO_STYLES],
  template: `
<section class="benefits">
  <h3>Cognitive Benefits</h3>
  <ul>
    <li><strong>Visuospatial Working Memory</strong> — Trains your ability to encode, retain, and reproduce 3D spatial structures from memory</li>
    <li><strong>3D Mental Rotation</strong> — Strengthens the capacity to mentally rotate and manipulate objects in three dimensions</li>
    <li><strong>Spatial Encoding</strong> — Improves how accurately you build internal 3D models from visual observation</li>
    <li><strong>Active Reconstruction</strong> — Engages deeper memory encoding through hands-on rebuilding rather than passive recognition</li>
    <li><strong>Spatial Reasoning</strong> — Develops the ability to understand and reason about spatial relationships between objects</li>
    <li><strong>Visual Attention to Detail</strong> — Sharpens observation of structural details in complex 3D arrangements</li>
  </ul>
</section>
<section class="mechanics">
  <h3>How It Works</h3>
  <p>You are shown a 3D shape made of cubes. Rotate and zoom to study it from all angles, then recreate it from memory by placing cubes one at a time. Every cube in the shape is always visible from at least one angle — there are no hidden cubes buried inside. The shape is matched regardless of rotation — if your build can be rotated to match the original, you've solved it. Drag to navigate, tap to place cubes, switch to remove mode to delete mistakes.</p>
  <h4>Controls</h4>
  <p><strong>Mouse:</strong> Left drag to rotate, right drag to pan, scroll to zoom, click to place/remove cubes.</p>
  <p><strong>Touch:</strong> One-finger drag to rotate, two-finger drag to pan, pinch to zoom, tap to place/remove cubes.</p>
  <h4>Modes</h4>
  <p><strong>＋ Build</strong> (default) — Navigate freely. Tap a cube face to add a new cube adjacent to it.</p>
  <p><strong>－ Remove</strong> — Navigate freely. Tap a cube to delete it. Any cube can be removed, including the very first one.</p>
  <h4>The Starting Frame</h4>
  <p>Every build starts with an empty <strong>white wireframe cube</strong> at the center of the scene. This frame marks your starting position and acts as a guide. Tap the frame to place your first cube inside it, then continue building outward from there. You can remove any cube you've placed — even the first one — which leaves the empty frame visible again. The frame is always there as your reference point.</p>
  <h4>Colors &amp; Symbols</h4>
  <p>Increase the <strong>Colors</strong> slider to assign different colors to each cube — you'll need to remember which color goes where. Increase the <strong>Symbols</strong> slider to add symbols (★ ● ▲ ■ ♦ ♠ ♣ ♥) on all faces of each cube. Colors and symbols are distributed independently and randomly — the same color won't always pair with the same symbol. With both active, you need to remember the shape, the color arrangement, AND the symbol placement separately. When set to 1, colors and symbols are uniform and don't add extra challenge.</p>
  <h4>Rotation-Invariant Matching</h4>
  <p>Your build doesn't need to be in the same orientation as the original. The game checks all 24 possible 3D rotations — if any rotation of your build matches the target (including colors and symbols), you've solved it.</p>
</section>
<section class="references">
  <h3>References</h3>
  <ol>
    <li>Shepard, R. N., &amp; Metzler, J. (1971). Mental rotation of three-dimensional objects. <em>Science</em>, 171(3972), 701–703.</li>
    <li>Vandenberg, S. G., &amp; Kuse, A. R. (1978). Mental rotations, a group test of three-dimensional spatial visualization. <em>Perceptual and Motor Skills</em>, 47(2), 599–604.</li>
    <li>Logie, R. H. (1995). <em>Visuo-spatial Working Memory</em>. Lawrence Erlbaum Associates.</li>
    <li>Slamecka, N. J., &amp; Graf, P. (1978). The generation effect: Delineation of a phenomenon. <em>Journal of Experimental Psychology: Human Learning and Memory</em>, 4(6), 592–604.</li>
  </ol>
</section>
`
})
export class VoxelInfoComponent {}
