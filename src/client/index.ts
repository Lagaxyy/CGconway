import CellGrid from "./cellGrid/cellGrid";

/* TS */

interface WaitingCell {
  i: number;
  j: number;
  state: "alive" | "dead";
}

interface Pattern {
  id: number;
  data: string;
  name: string;
  canvas: string;
  popularity: number;
  tag: number;
  created_at: string;
}

/* GLOBALS */

let TOGGLE: "start" | "stop" = "stop";

/* HELPERS */

const boundIndex = (index: number, value: number, limit: number): number => {
  if (index + value < 0) {
    return (((index + value) % limit) + limit) % limit;
  }

  return (index + value) % limit;
};

const applyPatternToCanvas = (name: string, data: string) => {
  grid.decompress(data);

  const infoNamePattern = document.getElementById("info-name-pattern");

  if (infoNamePattern !== null)
    infoNamePattern.textContent = `Current pattern: ${name}`;
};

const resetCanvas = () => {
  grid.clean();
  grid.tickLoop("destroy", animationGameOfLife);
  TOGGLE = "stop";
};

const getPatterns = async (filter: string | undefined = undefined) => {
  let result = undefined;

  if (filter !== undefined) {
    result = await fetch(`/api/getCanvas?search=${filter}`, {
      method: "GET",
    });
  } else {
    result = await fetch("/api/getCanvas", {
      method: "GET",
    });
  }

  return result.json();
};

const writeListOfPatterns = async (filter: string | undefined = undefined) => {
  const listOfPatterns = document.getElementById("patterns-list");

  if (listOfPatterns === null) {
    throw Error("No list of patterns <ul> found.");
  }

  const response = await getPatterns(filter);
  const patterns: Array<Pattern> = response.rows;

  for (const pattern of patterns) {
    const element = document.createElement("li");
    const content = document.createElement("span");
    const buttonApply = document.createElement("button");

    content.textContent = pattern.name;

    buttonApply.className = "patterns-list-button-apply";
    buttonApply.addEventListener("click", () => {
      resetCanvas();
      applyPatternToCanvas(pattern.name, pattern.data);
      grid.render();
    });
    buttonApply.textContent = "Apply";

    element.appendChild(content);
    element.appendChild(buttonApply);

    listOfPatterns.appendChild(element);
  }
};

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
    grid.changeCellStateByMatrixIndexes(cell.i, cell.j, cell.state);
  }

  grid.render();
};

/* SCRIPT */

const animationGameOfLife = {
  name: "animationGameOfLife",
  run: gameOfLife,
};

const grid = new CellGrid();
await grid.init();

applyPatternToCanvas("Blank Canvas", "");
grid.render();

// Buttons
document.getElementById("button-toggle")?.addEventListener("click", () => {
  if (TOGGLE === "stop") {
    grid.tickLoop("start", animationGameOfLife);
    TOGGLE = "start";
  } else if (TOGGLE === "start") {
    grid.tickLoop("stop", animationGameOfLife);
    TOGGLE = "stop";
  }
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
  .getElementById("patterns-import-button")
  ?.addEventListener("click", () => {
    const patternsInput = <HTMLInputElement>(
      document.getElementById("patterns-import-input")
    );

    if (patternsInput !== null) {
      resetCanvas();
      applyPatternToCanvas("Imported Canvas", patternsInput.value ?? "");
      grid.render();
    }
  });

document
  .getElementById("patterns-export-button")
  ?.addEventListener("click", async () => {
    const exportDisplayContent = document.getElementById(
      "patterns-export-content",
    );
    const exportDisplayMessage = document.getElementById(
      "patterns-export-message",
    );
    const compressed = grid.compress();

    if (exportDisplayContent !== null) {
      exportDisplayContent.textContent = compressed;
    }
    if (exportDisplayMessage !== null) {
      exportDisplayMessage.setAttribute(
        "style",
        "display: inherit; text-align: center;",
      );

      try {
        await navigator.clipboard.writeText(compressed);
      } catch (e) {
        console.error(e);
      }
    }
  });

// const buttonDebug = document.createElement("button");
// buttonDebug.className = "button";
// buttonDebug.textContent = "Debug";
// buttonDebug.addEventListener("click", () => {
//   grid.decompress(
//     "A4OIcmhLzvX1O6QqgiFEQUcEyB239mV9b9YHhlisWDijj0o0wrNeEqr81xqI60USUXYp0qnVhn0b3d+DuQb9hVDtFwlpvhcaTCq1dC8mVD4DQ1cCMmT+773b9SYrFXkvcNBAXY23k4lGx26ni9MdjbhOE94BWtLwRPVAImLbD3UYh0T8f/4PPpOjQN/nQVi5DVNy3fdagr5K2yRdtQRrAvkfwFCpKzqD6RFK+Xz9dWZ0bSFH27uqh0OTwbreTaqiyfd4qjnZg8pF6g33uJZrZNhXjasJZIaKRrSsoqpWTNUaO73IH8BSfgqeXmoU5DminA1jk87HGdefxnSphVAB1Q==",
//   );
//   grid.render();
// });
// document.getElementById("buttons")?.appendChild(buttonDebug);

document
  .getElementById("button-clean-canvas")
  ?.addEventListener("click", () => {
    resetCanvas();
    applyPatternToCanvas("Blank canvas", "");
    grid.render();
  });

document
  .getElementById("patterns-search-button")
  ?.addEventListener("click", () => {
    const listOfPatterns = document.getElementById("patterns-list");

    if (listOfPatterns === null) {
      throw Error("No list of patterns <ul> found.");
    }

    while (listOfPatterns.lastElementChild) {
      listOfPatterns.removeChild(listOfPatterns.lastElementChild);
    }

    const searchInput = <HTMLInputElement>(
      document.getElementById("patterns-search-input")
    );

    if (searchInput === null) {
      throw Error("No list of patterns <ul> found.");
    }

    if (searchInput.value.length === 0) {
      writeListOfPatterns();
    } else {
      writeListOfPatterns(searchInput.value);
    }
  });

// Canvas handler
writeListOfPatterns();
