import { Application } from "pixi.js";

(async () => {
  const pixiContainer = document.getElementById("pixi-container");

  if (pixiContainer === null) {
    console.error("Error retrieving pixi container");
    return;
  }

  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: "#1099bb", resizeTo: pixiContainer });

  // Append the application canvas to the document body
  pixiContainer.appendChild(app.canvas);
})();
