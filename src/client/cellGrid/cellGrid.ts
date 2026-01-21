/**
 * NOTES:
 *    - works best with 1600x800 div dimensions
 *    - after adding logger here add checks for arguments and error handling
 */
import {
  Application,
  Container,
  Graphics,
  GraphicsContext,
  Renderer,
  Ticker,
} from "pixi.js";

/* TS */

type CELL_STATE = "alive" | "dead";
type ANIMATION_ACTION = "start" | "stop" | "destroy";

interface Cell {
  index: number;
  state: CELL_STATE;
  rendered: boolean;
}

/* GLOBALS */

const BASE_SPEED_VALUE = 500;
const CELL_SIZE = 25;
const CELL_COLOR_LIGHT = 0x525252;
const CELL_COLOR_DARK = 0x28282b;
const FRAMES = {
  cells: {
    dead: new GraphicsContext()
      .rect(0, 0, CELL_SIZE, CELL_SIZE)
      .fill(CELL_COLOR_LIGHT)
      .rect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2)
      .fill(CELL_COLOR_DARK),
    alive: new GraphicsContext()
      .rect(0, 0, CELL_SIZE, CELL_SIZE)
      .fill(CELL_COLOR_LIGHT),
  },
};
const LABEL_MAIN_CONTAINER = "main";

/* HELPERS */

const interactive = (event: MouseEvent, div: HTMLElement, grid: CellGrid) => {
  const rect = div.getBoundingClientRect();
  const limitMinX = rect.left;
  const limitMaxX = rect.right;
  const limitMinY = rect.top;
  const limitMaxY = rect.bottom;

  if (
    event.clientX < Math.floor(limitMinX) ||
    event.clientX > Math.ceil(limitMaxX) ||
    event.clientY < Math.floor(limitMinY) ||
    event.clientY > Math.ceil(limitMaxY)
  )
    return;

  const limitRows = grid.cells.length; // same as grid.height / CELL_SIZE
  const limitColumns = grid.cells[0].length; // same as grid.width / CELL_SIZE

  const computedX = event.clientX - rect.left;
  const computedY = event.clientY - rect.top;

  const computedI = Math.floor(computedY / CELL_SIZE);
  const computedJ = Math.floor(computedX / CELL_SIZE);

  if (
    computedI < 0 ||
    computedI > limitRows ||
    computedJ < 0 ||
    computedJ > limitColumns
  )
    return;

  grid.changeCellStateByMatrixIndexes(
    computedI,
    computedJ,
    grid.cells[computedI][computedJ].state === "alive" ? "dead" : "alive",
  );
  grid.render();
};

/* CLASS */

class CellGrid {
  #app: Application<Renderer> | undefined;
  #cells: Array<Cell>[] = [];
  #tickers: Record<string, Ticker> = {};
  #speedMultiplier: number = 1;

  /* PUBLIC */

  /**
   * Initializes the CellGrid instance without mounting it to Pixi yet.
   */
  constructor() {
    this.#app = undefined;
  }

  get width(): number {
    if (this.#app === undefined) throw Error("App undefined");
    return this.#app.screen.width;
  }

  get height(): number {
    if (this.#app === undefined) throw Error("App undefined");
    return this.#app.screen.height;
  }

  get cells(): ReadonlyArray<ReadonlyArray<Readonly<Cell>>> {
    return this.#cells;
  }

  get speedMultiplier(): number {
    return this.#speedMultiplier;
  }

  set speedMultiplier(value: number) {
    this.#speedMultiplier = value;
  }

  /**
   * Boots the Pixi application, inserts the canvas, and creates the initial dead grid.
   */
  async init() {
    let cellsIndex = 0;

    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer === null) {
      // TEMP ERROR HANDLING
      console.error("Error retrieving pixi container");
      return;
    }

    this.#app = new Application();
    await this.#app.init({ background: "#000000", resizeTo: pixiContainer });
    pixiContainer.appendChild(this.#app.canvas);

    const container = new Container({ label: LABEL_MAIN_CONTAINER });
    this.#app.stage.addChild(container);

    // Populate the container with a uniform grid of dead cells and track each as a Cell
    for (let i = 0; i < this.#app.screen.height / CELL_SIZE; i++) {
      const cellRow: Cell[] = [];

      for (let j = 0; j < this.#app.screen.width / CELL_SIZE; j++) {
        const dc = new Graphics(FRAMES.cells["dead"]);

        dc.x = j * CELL_SIZE;
        dc.y = i * CELL_SIZE;

        container.addChild(dc);
        cellRow.push({ index: cellsIndex, state: "dead", rendered: true });
        cellsIndex++;
      }

      this.#cells.push(cellRow);
    }

    document.addEventListener("click", (event) =>
      interactive(event, pixiContainer, this),
    );
  }

  /**
   * Modifies a cell's state by its linear index.
   * @param index Global index used when the grid was populated.
   * @param state Desired state to apply to the matching cell.
   */
  changeCellStateByIndex(index: number, state: CELL_STATE) {
    // Guard against empty grid.
    if (this.#cells.length === 0 || this.#cells[0].length === 0) {
      console.error("Couldn't change cell state by index: grid is empty");
      return;
    }

    const cols = this.#cells[0].length;

    // Compute row and column directly from the linear index.
    const row = Math.floor(index / cols);
    const col = index % cols;

    // Bounds check to avoid accessing outside the grid.
    if (row < 0 || row >= this.#cells.length || col < 0 || col >= cols) {
      console.error("Couldn't change cell state by index: index out of range");
      return;
    }

    const cell: Cell = this.#cells[row][col];
    cell.state = state;
    cell.rendered = false;
  }

  /**
   * Modifies a cell's state by its matrix coordinates.
   * @param i Row index of the cell.
   * @param j Column index of the cell.
   * @param state Target state for the cell.
   */
  changeCellStateByMatrixIndexes(i: number, j: number, state: CELL_STATE) {
    // Mark the requested cell as specified state so the next render pass replaces its Graphics.
    if (
      this.#cells.length === 0 ||
      i < 0 ||
      j < 0 ||
      i >= this.#cells.length ||
      j >= this.#cells[0].length
    ) {
      console.error("Couldn't change cell state with matrix indexes");
      return;
    }

    const cell: Cell = this.#cells[i][j];

    cell.state = state;
    cell.rendered = false;
  }

  /**
   * Replaces the graphics for every "dirty" cell so the display matches their states.
   */
  render() {
    if (this.#app === undefined) {
      console.error("undefined app");
      return;
    }

    // Walk the cached cell grid and redraw each sprite based on the latest state.
    for (let i = 0; i < this.#cells.length; i++) {
      const cellRow = this.#cells[i];

      for (let j = 0; j < cellRow.length; j++) {
        const cell: Cell = cellRow[j];

        // Check if cell needs to be updated
        if (cell.rendered) continue;

        // Retrieve main container and cell to update, create updated cell
        const container = this.#app.stage.getChildByLabel(LABEL_MAIN_CONTAINER);
        const cellOld = container?.getChildAt(cell.index);
        const cellNew = new Graphics(FRAMES.cells[cell.state]);

        if (container === null) {
          console.error("no container found");
          continue;
        }

        // Check if old cell exists
        if (cellOld === undefined) {
          console.log(`No cell found for index ${cell.index}`);
          continue;
        }

        // Replace old cell by new cell
        container.replaceChild(cellOld, cellNew);

        // Change update state of cell
        cell.rendered = true;
      }
    }
  }

  /**
   * Controls a ticker that runs an animation callback on this grid.
   * @param action Whether to start, stop, or destroy the ticker.
   * @param animation Function executed on each tick when the ticker runs.
   */
  tickLoop(
    action: ANIMATION_ACTION,
    animation: { name: string; run: (grid: CellGrid) => void },
  ) {
    let delta = 0;
    const tickerKey = animation.name;
    const tickers = this.#tickers;
    const animate = (ticker: Ticker) => {
      // Handle the speed of the animation
      if (delta > BASE_SPEED_VALUE * (1 / this.#speedMultiplier)) {
        animation.run(this);
        delta = 0;
      } else {
        delta += ticker.deltaMS;
      }
    };

    if (action === "start") {
      if (tickers[tickerKey] === undefined) {
        tickers[tickerKey] = new Ticker();
        tickers[tickerKey].add(animate);
      }
      tickers[tickerKey].start();
    }
    if (action === "stop" && tickers[tickerKey] !== undefined) {
      tickers[tickerKey].stop();
    }
    if (action === "destroy" && tickers[tickerKey] !== undefined) {
      tickers[tickerKey].destroy();
      delete tickers[tickerKey];
    }
  }

  clean() {
    const limitRows = this.cells.length;
    const limitColumns = this.cells[0].length;

    for (let i = 0; i < limitRows; i++) {
      for (let j = 0; j < limitColumns; j++) {
        if (this.cells[i][j].state == "alive") {
          this.changeCellStateByMatrixIndexes(i, j, "dead");
        }
      }
    }
  }

  /**
   * Compresses current canvas using bitpacking and base64 encoding
   */
  compress(): string {
    let index = 0;
    const numberOfCells = (this.width * this.height) / CELL_SIZE ** 2;
    const bytes = new Uint8Array(numberOfCells / 8);
    for (let i = 0; i < this.height / CELL_SIZE; i++) {
      for (let j = 0; j < this.width / CELL_SIZE; j++) {
        if (this.#cells[i][j].state === "alive") {
          bytes[Math.floor(index / 8)] |= 1 << (index % 8);
        }

        index++;
      }
    }

    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary);
  }

  decompress(compressed: string) {
    if (compressed.length === 0) {
      this.clean();
      return;
    }

    const binary = atob(compressed);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    let index = 0;
    for (let i = 0; i < this.height / CELL_SIZE; i++) {
      for (let j = 0; j < this.width / CELL_SIZE; j++) {
        const compressedState =
          (bytes[Math.floor(index / 8)] & (1 << (index % 8))) !== 0
            ? "alive"
            : "dead";

        if (this.#cells[i][j].state !== compressedState) {
          this.changeCellStateByMatrixIndexes(i, j, compressedState);
        }

        index++;
      }
    }
  }

  /* PRIVATE */
}

export default CellGrid;
