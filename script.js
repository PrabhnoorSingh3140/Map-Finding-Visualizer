const ROWS = 36;
const COLS = 68;
let selectingStart = false;
let selectingEnd = false;

const map = document.getElementById("map");
const routeBtn = document.getElementById("routeBtn");
const mazeBtn = document.getElementById("mazeBtn");
const clearBtn = document.getElementById("clearBtn");
const algorithmSelect = document.getElementById("algorithm");
const statusBox = document.getElementById("status");

let cells = [];
let startNode;
let endNode;
let mouseDown = false;
let drawMode = true;
let running = false;
const startBtn = document.getElementById("startBtn");
const endBtn = document.getElementById("endBtn");

startBtn.addEventListener("click", () => {
    selectingStart = true;
    selectingEnd = false;
    statusBox.textContent = "Click a cell to place the Start Node";
});

endBtn.addEventListener("click", () => {
    selectingEnd = true;
    selectingStart = false;
    statusBox.textContent = "Click a cell to place the End Node";
});

function createMap() {
  map.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  map.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;

  for (let row = 0; row < ROWS; row++) {
    const currentRow = [];
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if ((row < 8 && col > 43) || (row > 27 && col < 17)) cell.classList.add("park");
      if (row > 23 && row < 28 && col > 46) cell.classList.add("water");
      cell.dataset.row = row;
      cell.dataset.col = col;
      map.appendChild(cell);
      currentRow.push(cell);
      addCellEvents(cell);
    }
    cells.push(currentRow);
  }

  startNode = cells[20][9];
  endNode = cells[14][58];
  startNode.classList.add("start");
  endNode.classList.add("end");
}

function addCellEvents(cell) {
  cell.addEventListener("mousedown", (event) => {
    event.preventDefault();
    if (selectingStart) {
    startNode.classList.remove("start");
    startNode = cell;
    cell.classList.remove("wall");
    cell.classList.add("start");

    selectingStart = false;
    statusBox.textContent = "Start point selected";
    return;
}

if (selectingEnd) {
    endNode.classList.remove("end");
    endNode = cell;
    cell.classList.remove("wall");
    cell.classList.add("end");

    selectingEnd = false;
    statusBox.textContent = "Destination selected";
    return;
}
    if (running || isMarker(cell)) return;
    mouseDown = true;
    drawMode = !cell.classList.contains("wall");
    setWall(cell);
  });

  cell.addEventListener("mouseenter", () => {
    if (mouseDown && !running) setWall(cell);
  });
}

document.addEventListener("mouseup", () => mouseDown = false);

function isMarker(cell) {
  return cell === startNode || cell === endNode;
}

function setWall(cell) {
  if (isMarker(cell)) return;
  cell.classList.toggle("wall", drawMode);
}

function getNeighbors(cell) {
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  const directions = [[-1,0], [1,0], [0,-1], [0,1]];
  const neighbors = [];

  for (const [dr, dc] of directions) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const neighbor = cells[r][c];
      if (!neighbor.classList.contains("wall")) neighbors.push(neighbor);
    }
  }
  return neighbors;
}

function buildResult(order, previous) {
  const path = [];
  if (startNode !== endNode && !previous.has(endNode)) return { order, path };

  let current = endNode;
  while (current) {
    path.unshift(current);
    if (current === startNode) break;
    current = previous.get(current);
  }
  return { order, path };
}

function bfs() {
  const queue = [startNode];
  let head = 0;
  const visited = new Set([startNode]);
  const previous = new Map();
  const order = [];

  while (head < queue.length) {
    const current = queue[head++];
    order.push(current);
    if (current === endNode) break;

    for (const neighbor of getNeighbors(current)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        previous.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }
  return buildResult(order, previous);
}

function dfs() {
  const stack = [startNode];
  const visited = new Set();
  const previous = new Map();
  const order = [];

  while (stack.length) {
    const current = stack.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    order.push(current);
    if (current === endNode) break;

    const neighbors = getNeighbors(current).reverse();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (!previous.has(neighbor)) previous.set(neighbor, current);
        stack.push(neighbor);
      }
    }
  }
  return buildResult(order, previous);
}

function dijkstra() {
  const distance = new Map([[startNode, 0]]);
  const previous = new Map();
  const visited = new Set();
  const order = [];
  const open = [startNode];

  while (open.length) {
    open.sort((a, b) => (distance.get(a) ?? Infinity) - (distance.get(b) ?? Infinity));
    const current = open.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    order.push(current);
    if (current === endNode) break;

    for (const neighbor of getNeighbors(current)) {
      const candidate = distance.get(current) + 1;
      if (candidate < (distance.get(neighbor) ?? Infinity)) {
        distance.set(neighbor, candidate);
        previous.set(neighbor, current);
        open.push(neighbor);
      }
    }
  }
  return buildResult(order, previous);
}

function heuristic(cell) {
  return Math.abs(Number(cell.dataset.row) - Number(endNode.dataset.row))
       + Math.abs(Number(cell.dataset.col) - Number(endNode.dataset.col));
}

function astar() {
  const open = [startNode];
  const openSet = new Set([startNode]);
  const closed = new Set();
  const previous = new Map();
  const gScore = new Map([[startNode, 0]]);
  const fScore = new Map([[startNode, heuristic(startNode)]]);
  const order = [];

  while (open.length) {
    open.sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity));
    const current = open.shift();
    openSet.delete(current);
    if (closed.has(current)) continue;

    closed.add(current);
    order.push(current);
    if (current === endNode) break;

    for (const neighbor of getNeighbors(current)) {
      if (closed.has(neighbor)) continue;
      const tentative = gScore.get(current) + 1;

      if (tentative < (gScore.get(neighbor) ?? Infinity)) {
        previous.set(neighbor, current);
        gScore.set(neighbor, tentative);
        fScore.set(neighbor, tentative + heuristic(neighbor));

        if (!openSet.has(neighbor)) {
          open.push(neighbor);
          openSet.add(neighbor);
        }
      }
    }
  }
  return buildResult(order, previous);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setControlsDisabled(disabled) {
  routeBtn.disabled = disabled;
  mazeBtn.disabled = disabled;
  clearBtn.disabled = disabled;
  algorithmSelect.disabled = disabled;
}

async function animate(result) {
  running = true;
  setControlsDisabled(true);
  statusBox.textContent = "Searching for the best route...";

  for (const cell of result.order) {
    if (!isMarker(cell)) cell.classList.add("visited");
    await sleep(3);
  }

  if (!result.path.length) {
    statusBox.textContent = "No route found. Remove some buildings and try again.";
    running = false;
    setControlsDisabled(false);
    return;
  }

  for (const cell of result.path) {
    if (!isMarker(cell)) cell.classList.add("path");
    await sleep(18);
  }

  statusBox.textContent =
    `Route found • ${result.path.length - 1} blocks • ${result.order.length} nodes explored`;

  running = false;
  setControlsDisabled(false);
}

function clearSearch() {
  cells.flat().forEach(cell => cell.classList.remove("visited", "path"));
}

function clearMap() {
  if (running) return;
  cells.flat().forEach(cell => cell.classList.remove("wall", "visited", "path"));
  statusBox.textContent = "Map cleared. Draw buildings or find a route.";
}

function generateBuildings() {
  if (running) return;
  clearMap();

  cells.flat().forEach(cell => {
    if (!isMarker(cell) && Math.random() < 0.22) cell.classList.add("wall");
  });

  // Keep areas around markers open.
  [startNode, endNode].forEach(marker => {
    getNeighbors(marker).forEach(cell => cell.classList.remove("wall"));
  });

  statusBox.textContent = "Buildings added. Choose an algorithm and find a route.";
}

routeBtn.addEventListener("click", async () => {
  if (running) return;
  clearSearch();

  const algorithms = { bfs, dfs, dijkstra, astar };
  const result = algorithms[algorithmSelect.value]();
  await animate(result);
});

mazeBtn.addEventListener("click", generateBuildings);
clearBtn.addEventListener("click", clearMap);

createMap();
