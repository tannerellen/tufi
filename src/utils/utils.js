/** @type {(delay: number) => Promise<void>} */
export function asyncTimeout(delay) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, delay);
  });
}
