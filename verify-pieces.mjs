// Quick verification script for piece library
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

const TETROMINOES = [
  { id: 'T4-I', size: 4, cells: [[0,0],[0,1],[0,2],[0,3]] },
  { id: 'T4-O', size: 4, cells: [[0,0],[0,1],[1,0],[1,1]] },
  { id: 'T4-T', size: 4, cells: [[0,0],[0,1],[0,2],[1,1]] },
  { id: 'T4-S', size: 4, cells: [[0,1],[0,2],[1,0],[1,1]] },
  { id: 'T4-Z', size: 4, cells: [[0,0],[0,1],[1,1],[1,2]] },
];

const PENTOMINOES = [
  { id: 'P5-F', size: 5, cells: [[0,1],[0,2],[1,0],[1,1],[2,1]] },
  { id: 'P5-I', size: 5, cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },
  { id: 'P5-L', size: 5, cells: [[0,0],[1,0],[2,0],[3,0],[3,1]] },
  { id: 'P5-N', size: 5, cells: [[0,0],[0,1],[1,1],[1,2],[1,3]] },
  { id: 'P5-P', size: 5, cells: [[0,0],[0,1],[1,0],[1,1],[2,0]] },
  { id: 'P5-T', size: 5, cells: [[0,0],[0,1],[0,2],[1,1],[2,1]] },
  { id: 'P5-U', size: 5, cells: [[0,0],[0,2],[1,0],[1,1],[1,2]] },
  { id: 'P5-V', size: 5, cells: [[0,0],[1,0],[2,0],[2,1],[2,2]] },
  { id: 'P5-W', size: 5, cells: [[0,0],[1,0],[1,1],[2,1],[2,2]] },
  { id: 'P5-X', size: 5, cells: [[0,1],[1,0],[1,1],[1,2],[2,1]] },
  { id: 'P5-Y', size: 5, cells: [[0,0],[1,0],[1,1],[2,0],[3,0]] },
  { id: 'P5-Z', size: 5, cells: [[0,0],[0,1],[1,1],[2,1],[2,2]] },
];

const HEXOMINOES = [
  { id: 'H6-01', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[0,5]] },
  { id: 'H6-02', size: 6, cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[4,1]] },
  { id: 'H6-03', size: 6, cells: [[0,0],[0,1],[1,1],[2,1],[3,1],[4,1]] },
  { id: 'H6-04', size: 6, cells: [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]] },
  { id: 'H6-05', size: 6, cells: [[0,2],[0,3],[1,1],[1,2],[2,0],[2,1]] },
  { id: 'H6-06', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,2]] },
  { id: 'H6-07', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,1]] },
  { id: 'H6-08', size: 6, cells: [[0,1],[1,0],[1,1],[1,2],[2,1],[3,1]] },
  { id: 'H6-09', size: 6, cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]] },
  { id: 'H6-10', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[1,0],[1,3]] },
  { id: 'H6-11', size: 6, cells: [[0,0],[0,1],[0,2],[1,1],[1,2],[1,3]] },
  { id: 'H6-12', size: 6, cells: [[0,1],[0,2],[1,0],[1,1],[2,1],[2,2]] },
  { id: 'H6-13', size: 6, cells: [[0,0],[1,0],[1,1],[2,1],[2,2],[3,2]] },
  { id: 'H6-14', size: 6, cells: [[0,0],[1,0],[2,0],[3,0],[3,1],[3,2]] },
  { id: 'H6-15', size: 6, cells: [[0,0],[1,0],[2,0],[2,1],[3,1],[3,2]] },
  { id: 'H6-16', size: 6, cells: [[0,0],[0,1],[0,2],[1,0],[2,0],[2,1]] },
  { id: 'H6-17', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[1,0],[1,1]] },
  { id: 'H6-18', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[1,0],[1,3]] },
  { id: 'H6-19', size: 6, cells: [[0,0],[0,1],[1,0],[1,1],[1,2],[1,3]] },
  { id: 'H6-20', size: 6, cells: [[0,0],[0,1],[0,2],[1,2],[2,2],[3,2]] },
  { id: 'H6-21', size: 6, cells: [[0,0],[0,1],[0,2],[1,2],[1,3],[1,4]] },
  { id: 'H6-22', size: 6, cells: [[0,0],[0,1],[0,2],[1,1],[2,1],[3,1]] },
  { id: 'H6-23', size: 6, cells: [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]] },
  { id: 'H6-24', size: 6, cells: [[0,1],[0,2],[1,0],[1,1],[2,0],[3,0]] },
  { id: 'H6-25', size: 6, cells: [[0,0],[1,0],[1,1],[2,1],[3,1],[3,2]] },
  { id: 'H6-26', size: 6, cells: [[0,0],[0,1],[0,2],[1,2],[1,3],[2,3]] },
  { id: 'H6-27', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[1,1],[1,2]] },
  { id: 'H6-28', size: 6, cells: [[0,0],[0,1],[1,1],[1,2],[2,2],[2,3]] },
  { id: 'H6-29', size: 6, cells: [[0,0],[1,0],[2,0],[3,0],[3,1],[2,1]] },
  { id: 'H6-30', size: 6, cells: [[0,1],[1,0],[1,1],[1,2],[2,1],[2,2]] },
  { id: 'H6-31', size: 6, cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[2,0]] },
  { id: 'H6-32', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[1,1],[1,3]] },
  { id: 'H6-33', size: 6, cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[2,1]] },
  { id: 'H6-34', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0]] },
  { id: 'H6-35', size: 6, cells: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,3]] },
];

const ALL = [...TETROMINOES, ...PENTOMINOES, ...HEXOMINOES];

console.log('Counts:', TETROMINOES.length, PENTOMINOES.length, HEXOMINOES.length, ALL.length);

// Check unique IDs
const ids = ALL.map(p => p.id);
const uniqueIds = new Set(ids);
console.log('Unique IDs:', uniqueIds.size, '/', ids.length);

// Check connectivity
const disc = ALL.filter(p => !isConnected(p.cells));
console.log('Disconnected:', disc.map(p => p.id));

// Check size
const ws = ALL.filter(p => p.cells.length !== p.size);
console.log('Wrong size:', ws.map(p => p.id));

// Check canonical
const nc = ALL.filter(p => {
  const canon = canonicalize(p.cells);
  const norm = normalize(p.cells);
  return JSON.stringify(canon) !== JSON.stringify(norm);
});
console.log('Non-canonical:', nc.map(p => p.id));

// Check duplicate shapes
const shapeMap = new Map();
ALL.forEach(p => {
  const key = JSON.stringify(canonicalize(p.cells));
  if (shapeMap.has(key)) {
    console.log('DUPLICATE:', p.id, 'same as', shapeMap.get(key));
  } else {
    shapeMap.set(key, p.id);
  }
});
console.log('Distinct shapes:', shapeMap.size);
