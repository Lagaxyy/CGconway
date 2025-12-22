/**
 * NOTES:
 *    - works best with 1600x800 div dimensions
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
  updated: boolean;
}

/* GLOBALS */

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

/* CLASS */

class CellGrid {
  #app: Application<Renderer> | undefined;
  #cells: Array<Cell>[] = [];
  #tickers: Record<string, Ticker> = {};

  /* PUBLIC */

  /**
   * Initializes the CellGrid instance without mounting it to Pixi yet.
   */
  constructor() {
    this.#app = undefined;
  }

  get cells(): ReadonlyArray<ReadonlyArray<Readonly<Cell>>> {
    return this.#cells;
  }

  /**
   * Boots the Pixi application, inserts the canvas, and creates the initial dead grid.
   */
  async init() {
    let cellsIndex = 0;

    // Retrieve pixi container div from the DOM
    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer === null) {
      // TEMP ERROR HANDLING
      console.error("Error retrieving pixi container");
      return;
    }

    // Create a new application
    this.#app = new Application();

    // Initialize the application
    await this.#app.init({ background: "#000000", resizeTo: pixiContainer });

    // Append the application canvas to the document body
    pixiContainer.appendChild(this.#app.canvas);

    // Create the main container that will host the entire cell grid.
    const container = new Container({ label: LABEL_MAIN_CONTAINER });
    this.#app.stage.addChild(container);

    // Populate the container with a uniform grid of dead cells and track each as a Cell.
    for (let i = 0; i < this.#app.screen.height / CELL_SIZE; i++) {
      const cellRow: Cell[] = [];

      for (let j = 0; j < this.#app.screen.width / CELL_SIZE; j++) {
        const dc = new Graphics(FRAMES.cells["dead"]);

        dc.x = j * CELL_SIZE;
        dc.y = i * CELL_SIZE;

        container.addChild(dc);
        cellRow.push({ index: cellsIndex, state: "dead", updated: true });
        cellsIndex++;
      }

      this.#cells.push(cellRow);
    }

    this.#showInfo();
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
    cell.updated = false;
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
      i >= this.#cells.length ||
      j >= this.#cells[0].length
    ) {
      console.error("Couldn't change cell state with matrix indexes");
      return;
    }

    const cell: Cell = this.#cells[i][j];

    cell.state = state;
    cell.updated = false;
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
        if (cell.updated) continue;

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
        cell.updated = true;
      }
    }
  }

  /**
   * Controls a ticker that runs an animation callback on this grid.
   * @param action Whether to start, stop, or destroy the ticker.
   * @param animation Function executed on each tick when the ticker runs.
   */
  tickLoop(action: ANIMATION_ACTION, animation: (grid: CellGrid) => void) {
    const animate = () => {
      // It can handle time-dependent tasks if needed
      animation(this);
    };

    if (action === "start") {
      if (this.#tickers.rightShift === undefined) {
        this.#tickers.rightShift = new Ticker();
        this.#tickers.rightShift.add(animate);
      }
      this.#tickers.rightShift.start();
    }
    if (action === "stop" && this.#tickers.rightShift !== undefined) {
      this.#tickers.rightShift.stop();
    }
    if (action === "destroy" && this.#tickers.rightShift !== undefined) {
      this.#tickers.rightShift.destroy();
    }
  }

  /* PRIVATE */

  /**
   * Logs the current grid dimensions and calculated pixel counts for debugging.
   */
  #showInfo() {
    if (this.#app === undefined) {
      console.error("undefined app");
      return;
    }

    const width = this.#app.screen.width;
    const height = this.#app.screen.height;
    const pwidth = width / CELL_SIZE;
    const pheight = height / CELL_SIZE;

    console.log(`cell size: ${CELL_SIZE}`);
    console.log(`app screen width: ${width}`);
    console.log(`app screen height: ${height}`);
    console.log(`app screen pixel width: ${pwidth}`);
    console.log(`app screen pixel height: ${pheight}`);
    console.log(`total pixels: ${pwidth * pheight}`);
  }
}

export { CellGrid };