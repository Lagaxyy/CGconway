import { CellGrid } from "./cellGrid/cellGrid";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, 1000 * ms));
}

const asyncScript = async () => {
  const grid = new CellGrid();

  await grid.init();

  grid.showInfo();

  grid.changeCellStateByIndex(5, "alive");
  grid.changeCellStateByIndex(2047, "alive");
  grid.renderCells();

  grid.changeCellStateByIndex(1, "alive");
  grid.animationRightShift("start");

  await sleep(5);
  grid.animationRightShift("stop");

  await sleep(3);
  grid.animationRightShift("start");

  await sleep(4);
  grid.animationRightShift("destroy");
};

asyncScript();
