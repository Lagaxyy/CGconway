import { CellGrid } from "./cellGrid/cellGrid";

const boundIndex = (index: number, value: number, limit: number): number => {
  if (index + value < 0) {
    return (((index + value) % limit) + limit) % limit;
  }

  return (index + value) % limit;
};

async function sleep(s: number) {
  return new Promise((resolve) => setTimeout(resolve, 1000 * s));
}

const animationRightShift = (grid: CellGrid) => {
  for (let i = 0; i < grid.cells.length; i++) {
    const cellRow = grid.cells[i];

    for (let j = 0; j < cellRow.length; j++) {
      const cell = cellRow[j];

      if (cell.rendered && cell.state === "alive") {
        grid.changeCellStateByMatrixIndexes(
          i,
          boundIndex(j, 1, cellRow.length),
          "alive",
        );
        grid.changeCellStateByIndex(cell.index, "dead");
      }
    }
  }

  grid.render();
};

const asyncScript = async () => {
  const grid = new CellGrid();
  const simpleAnimation = {
    name: "animationRightShift",
    run: animationRightShift,
  };

  await grid.init();

  grid.changeCellStateByIndex(5, "alive");
  grid.changeCellStateByIndex(2047, "alive");
  grid.render();

  grid.changeCellStateByIndex(1, "alive");
  grid.tickLoop("start", simpleAnimation);

  await sleep(5);
  grid.tickLoop("stop", simpleAnimation);

  await sleep(3);
  grid.tickLoop("start", simpleAnimation);

  await sleep(4);
  grid.tickLoop("destroy", simpleAnimation);
};

asyncScript();
