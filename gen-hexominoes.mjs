// Generate all 35 free hexominoes programmatically
function normalize(cells) {
  const minR = Math.min(...cells.map(c => c[0]));
  const minC = Math.min(...cells.map(c => c[1]));
  const shifted = cells.map(([r, c]) => [r - minR, c - minC]);
  shifted.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return shifted;
}

function rotateCW(cells) {
  return normalize(cells.map(([r, c]) => [c, -r]));
}

function flipH(cells) {
  return normalize(cells.map(([r, c]) => [r, -c]));
}

function compareCells(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i][0] !== b[i][0]) return a[i][0] - b[i][0];
    if (a[i][1] !== b[i][1]) return a[i][1] - b[i][1];
  }
  return a.length - b.length;
}

function canonicalize(cells) {
  let best = normalize(cells);
  let current = normalize(cells);
  for (let rot = 0; rot < 4; rot++) {
    current = rot === 0 ? current : rotateCW(current);
    const flipped = flipH(current);
    if (compareCells(current, best) < 0) best = current;
    if (compareCells(flipped, best) < 0) best = flipped;
  }
  return best;
}

function isConnected(cells) {
  if (cells.length === 0) return true;
  const set = new Set(cells.map(([r, c]) => `${r},${c}`));
  const visited = new Set();
  const queue = [cells[0]];
  visited.add(`${cells[0][0]},${cells[0][1]}`);
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const key = `${r+dr},${c+dc}`;
      if (set.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push([r+dr, c+dc]);
      }
    }
  }
  return visited.size === cells.length;
}

// Generate all free polyominoes of size n
function generateFreePolyominoes(n) {
  if (n === 1) return [[[0, 0]]];
  
  const smaller = generateFreePolyominoes(n - 1);
  const seen = new Set();
  const results = [];
  
  for (const poly of smaller) {
    const cellSet = new Set(poly.map(([r, c]) => `${r},${c}`));
    
    for (const [r, c] of poly) {
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (!cellSet.has(key)) {
          const newPoly = [...poly, [nr, nc]];
          const canon = canonicalize(newPoly);
          const canonKey = JSON.stringify(canon);
          if (!seen.has(canonKey)) {
            seen.add(canonKey);
            results.push(canon);
          }
        }
      }
    }
  }
  
  return results;
}

// Generate tetrominoes
const tetros = generateFreePolyominoes(4);
console.log('Free tetrominoes:', tetros.length);

// Generate pentominoes
const pentos = generateFreePolyominoes(5);
console.log('Free pentominoes:', pentos.length);

// Generate hexominoes
const hexos = generateFreePolyominoes(6);
console.log('Free hexominoes:', hexos.length);

// Verify all connected
const allConnected = hexos.every(h => isConnected(h));
console.log('All hexominoes connected:', allConnected);

// Print tetrominoes
console.log('\n// TETROMINOES:');
tetros.forEach((t, i) => {
  console.log(`  // T${i}: ${JSON.stringify(t)}`);
});

// Print pentominoes
console.log('\n// PENTOMINOES:');
pentos.forEach((p, i) => {
  console.log(`  // P${i}: ${JSON.stringify(p)}`);
});

// Print hexominoes as TypeScript
console.log('\n// HEXOMINOES for TypeScript:');
hexos.forEach((h, i) => {
  const num = String(i + 1).padStart(2, '0');
  const cellStr = h.map(([r, c]) => `[${r},${c}]`).join(',');
  console.log(`  { id: 'H6-${num}', name: 'Hexomino ${num}', size: 6, cells: [${cellStr}] },`);
});
