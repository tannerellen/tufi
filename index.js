import { initialize } from "./src/app";
import { reportVersion } from "./src/system/report-version";
import { help } from "./src/system/help";

run();

/** @type {() => void} */
function run() {
  const { command } = processArgs();
  switch (command) {
    case "--version":
      reportVersion();
      return;
    case "--help":
      help();
      return;
    default:
      initialize();
      return;
  }
}

/** @type {() => {[key: string]: string}} */
function processArgs() {
  const command = parseCommand(process.argv[2]);
  return {
    command: command,
  };
}

/** @type {(command?: string) => string} */
function parseCommand(command) {
  if (!command) {
    return "";
  }

  const shortMap = new Map();
  shortMap.set("-v", "--version");
  shortMap.set("-h", "--help");

  const short = shortMap.get(command);
  return short ? short : command;
}
