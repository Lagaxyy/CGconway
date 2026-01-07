import { CellGrid } from "./cellGrid/cellGrid";

/* GLOBALS */

/* HELPERS */

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

/* SCRIPT */

document.getElementById("button-test")?.addEventListener("click", async () => {
  try {
    const response = await fetch("/test");
    const data = await response.json();
    const result = document.getElementById("result");

    if (result !== null) {
      result.textContent = "Result: " + JSON.stringify(data);
    }
  } catch (e) {
    console.error(e);
  }
});

const asyncScript = async () => {
  const simpleAnimation = {
    name: "animationRightShift",
    run: animationRightShift,
  };
  const a1 = 5;
  const a2 = 2047;
  const a3 = 1;

  const grid = new CellGrid();

  await grid.init();

  grid.changeCellStateByIndex(a1, "alive");
  grid.changeCellStateByIndex(a2, "alive");
  grid.render();

  grid.changeCellStateByIndex(a3, "alive");

  grid.tickLoop("start", simpleAnimation);
  await sleep(5);

  grid.tickLoop("stop", simpleAnimation);
  await sleep(3);

  grid.tickLoop("start", simpleAnimation);
  await sleep(4);

  grid.tickLoop("destroy", simpleAnimation);
};

asyncScript();
