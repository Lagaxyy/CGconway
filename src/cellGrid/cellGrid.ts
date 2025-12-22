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

const boundIndex = (index: number, value: number, limit: number): number => {
  if (index + value >= limit) {
    return index + value - limit;
  }
  if (index + value < 0) {
    return limit - index + value;
  }

  return index + value;
};

/* CLASS */

class CellGrid {
  #app: Application<Renderer> | undefined;
  #cells: Array<Cell>[] = [];
  #tickers: Record<string, Ticker> = {};

  /* PUBLIC */

  constructor() {
    this.#app = undefined;
  }

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
  }

  /* PRIVATE */

  showInfo() {
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

  renderCells() {
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

  changeCellStateByIndex(index: number, state: CELL_STATE) {
    // Mark the requested cell as specified state so the next render pass replaces its Graphics.
    for (let i = 0; i < this.#cells.length; i++) {
      const cellRow = this.#cells[i];

      for (let j = 0; j < cellRow.length; j++) {
        const cell: Cell = cellRow[j];

        if (cell.index === index) {
          cell.state = state;
          cell.updated = false;
        }
      }
    }
  }

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

  animationRightShift(action: ANIMATION_ACTION) {
    const animate = () => {
      for (let i = 0; i < this.#cells.length; i++) {
        const cellRow = this.#cells[i];

        for (let j = 0; j < cellRow.length; j++) {
          const cell: Cell = cellRow[j];

          if (cell.updated && cell.state === "alive") {
            this.changeCellStateByMatrixIndexes(
              i,
              boundIndex(j, 1, cellRow.length),
              "alive",
            );
            this.changeCellStateByIndex(cell.index, "dead");
          }
        }
      }

      this.renderCells();
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
}

export { CellGrid };

/**
 * TODO:
 *    - connect animation actions with buttons
 *    - one of the exported functions should handle all the animations (with corresponding buttons ?)
 */
