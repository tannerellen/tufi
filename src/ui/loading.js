import blessed from "../../external-dependencies/reblessed";
import { getScreen } from "../screen";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const totalFrames = frames.length;

const fps = 15;
const frameTime = 1000 / fps;

export function startLoader(container, message) {
  const screen = getScreen();

  const fg = container.style.fg;
  const bg = container.style.bg;
  const animationContainer = createElement(fg, bg);
  container.append(animationContainer);

  let currentFrame = 0;
  let animationTimeout;

  // Start the animation loop
  animate();

  // Watch for the element to be destroyed to make sure we clean up
  animationContainer.on("destroy", () => {
    if (animationTimeout) {
      clearTimeout(animationTimeout);
    }
  });

  return stopLoader;

  // Return the stop function
  function stopLoader() {
    clearTimeout(animationTimeout);
    animationContainer.destroy();
  }

  function animate() {
    paint();
    animationTimeout = setTimeout(animate, frameTime); // Or setTimeout(animate, frameTime)
  }

  function paint() {
    animationContainer.content =
      frames[currentFrame % totalFrames] + (message ? ` ${message}` : "");
    screen.render();
    currentFrame++;
  }
}

function createElement(fgColor, bgColor) {
  const style = {};
  if (fgColor) {
    style.fg = fgColor;
  }
  if (bgColor) {
    style.bg = bgColor;
  }

  const config = {
    name: "loader-text",
    align: "center",
    shrink: true,
    style: style,
  };

  return blessed.text(config);
}
