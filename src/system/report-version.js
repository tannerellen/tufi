import packageJson from "../../package.json";

/** @type {() => void} */
export function reportVersion() {
  try {
    const version = getVersion();
    if (!version) {
      throw new Error("Version does not exist");
    }
    console.log(`v${version}`);
  } catch (err) {
    console.log(`The version number could not be read: ${err.message}`);
  }
}

/** @type {() => string} */
export function getVersion() {
  try {
    return packageJson.version;
  } catch (err) {
    throw err;
  }
}
