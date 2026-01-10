import CellGrid from "./cellGrid/cellGrid";
import Patterns from "../../patterns.json";

/* TS */

interface WaitingCell {
  i: number;
  j: number;
  state: string;
}

/* GLOBALS */

const PATTERNS = [
  Patterns.spaceship.glider,
  Patterns.spaceship.lwss,
  Patterns.oscillator.pulsar,
];
let currentPattern = 0;

/* HELPERS */

const boundIndex = (index: number, value: number, limit: number): number => {
  if (index + value < 0) {
    return (((index + value) % limit) + limit) % limit;
  }

  return (index + value) % limit;
};

/* SCRIPT */

const gameOfLife = (grid: CellGrid) => {
  const isStateAndRendered = (
    grid: CellGrid,
    i: number,
    j: number,
    state: string,
  ) => {
    // DEVNOTES: since we store updates in an array, checking rendered isn't required
    return grid.cells[i][j].state == state && grid.cells[i][j].rendered;
  };
  const adjacentCells = (
    grid: CellGrid,
    i: number,
    j: number,
    state: string,
  ) => {
    let countAlive = 0;
    const limitRows = grid.cells.length;
    const limitColumns = grid.cells[0].length;

    // Left
    if (isStateAndRendered(grid, i, boundIndex(j, -1, limitColumns), state))
      countAlive++;
    // Right
    if (isStateAndRendered(grid, i, boundIndex(j, 1, limitColumns), state))
      countAlive++;
    // Top
    if (isStateAndRendered(grid, boundIndex(i, -1, limitRows), j, state))
      countAlive++;
    // Bottom
    if (isStateAndRendered(grid, boundIndex(i, 1, limitRows), j, state))
      countAlive++;
    // Top left
    if (
      isStateAndRendered(
        grid,
        boundIndex(i, -1, limitRows),
        boundIndex(j, -1, limitColumns),
        state,
      )
    )
      countAlive++;
    // Top right
    if (
      isStateAndRendered(
        grid,
        boundIndex(i, -1, limitRows),
        boundIndex(j, 1, limitColumns),
        state,
      )
    )
      countAlive++;
    // Bottom left
    if (
      isStateAndRendered(
        grid,
        boundIndex(i, 1, limitRows),
        boundIndex(j, -1, limitColumns),
        state,
      )
    )
      countAlive++;
    // Bottom right
    if (
      isStateAndRendered(
        grid,
        boundIndex(i, 1, limitRows),
        boundIndex(j, 1, limitColumns),
        state,
      )
    )
      countAlive++;

    return countAlive;
  };

  const waitingCells = Array<WaitingCell>();

  for (let i = 0; i < grid.cells.length; i++) {
    for (let j = 0; j < grid.cells[0].length; j++) {
      const adjacentAliveCells = adjacentCells(grid, i, j, "alive");

      // Rules of Game of Life
      if (grid.cells[i][j].state == "alive") {
        if (adjacentAliveCells != 2 && adjacentAliveCells != 3)
          waitingCells.push({ i: i, j: j, state: "dead" });
      } else {
        if (adjacentAliveCells == 3)
          waitingCells.push({ i: i, j: j, state: "alive" });
      }
    }
  }

  for (const cell of waitingCells) {
    if (cell.state !== "alive" && cell.state !== "dead")
      throw Error("Wrong cell state indicated");
    grid.changeCellStateByMatrixIndexes(cell.i, cell.j, cell.state);
  }

  grid.render();
};

const patternApply = (pattern: {
  name: string;
  cells: Array<{ i: number; j: number }>;
}) => {
  for (const cell of pattern.cells) {
    grid.changeCellStateByMatrixIndexes(cell.i, cell.j, "alive");
  }

  const infoNamePattern = document.getElementById("info-name-pattern");

  if (infoNamePattern !== null)
    infoNamePattern.textContent = `Structure: ${pattern.name}`;
};

const patternClean = () => {
  const limitRows = grid.cells.length;
  const limitColumns = grid.cells[0].length;

  for (let i = 0; i < limitRows; i++) {
    for (let j = 0; j < limitColumns; j++) {
      if (grid.cells[i][j].state == "alive") {
        grid.changeCellStateByMatrixIndexes(i, j, "dead");
      }
    }
  }
};

const animationGameOfLife = {
  name: "animationGameOfLife",
  run: gameOfLife,
};

const grid = new CellGrid();
await grid.init();

patternApply(PATTERNS[currentPattern]);
grid.render();

document.getElementById("button-start")?.addEventListener("click", () => {
  grid.tickLoop("start", animationGameOfLife);
});

document.getElementById("button-stop")?.addEventListener("click", () => {
  grid.tickLoop("stop", animationGameOfLife);
});

document.getElementById("button-speed-up")?.addEventListener("click", () => {
  const infoSpeedMult = document.getElementById("info-speed-multiplier");

  grid.speedMultiplier = grid.speedMultiplier * 2;

  if (infoSpeedMult !== null)
    infoSpeedMult.textContent = `Speed Multiplier: ${grid.speedMultiplier}x`;
});

document.getElementById("button-slow-down")?.addEventListener("click", () => {
  const infoSpeedMult = document.getElementById("info-speed-multiplier");

  grid.speedMultiplier = grid.speedMultiplier / 2;

  if (infoSpeedMult !== null)
    infoSpeedMult.textContent = `Speed Multiplier: ${grid.speedMultiplier}x`;
});

document
  .getElementById("button-switch-pattern")
  ?.addEventListener("click", () => {
    patternClean();
    grid.tickLoop("destroy", animationGameOfLife);
    currentPattern = boundIndex(currentPattern, 1, PATTERNS.length);
    patternApply(PATTERNS[currentPattern]);
    grid.render();
  });
