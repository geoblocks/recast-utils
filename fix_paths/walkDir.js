import { opendir } from 'node:fs/promises';
import path from 'node:path';


/**
* Recursively walk directory and yield on each file.
 * @param {string} dir
 */
export async function* walk(dir) {
  for await (const d of await opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield* walk(entry);
    } else if (d.isFile()) {
      yield entry;
    }
  }
}