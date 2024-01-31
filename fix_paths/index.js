/**
 * This file resolves extension-less imports to JS files if they exist, preserving sourcemaps.
 * This allows to write extension-less imports in typescript files (which is required to allow transpilation).
 * And still produces correctly resolving transpiled results, which can be used even without bundler.
 * Note that we use inline sourcemaps here, as it is what we configure in tsconfig.json.
 */

import {walk} from './walkDir.js';
import {PathRewriter} from './PathRewriter.js';

function parseOptions() {
  const argv = process.argv;
  argv.shift(); // remove node
  argv.shift(); // remove script name
  let showHelp = argv.length === 0;
  let debug = false;
  let dir;
  while (argv.length) {
    switch (argv[0]) {
      case '--help':
      case '-h':
        showHelp = true;
        break;
      case '--debug':
      case '-v':
        debug = true;
        break;
      default:
        dir = argv[0];
    }
    argv.shift();
  }
  return {
    dir,
    debug,
    showHelp,
  }
}

const {dir, debug, showHelp} = parseOptions();
if (showHelp) {
  console.log(
`
Usage: node ${process.argv[1]} [path]

Rewrite paths in imports / exports to contain .js extension.
The rewritten paths should resolve to actual files.
The eventual sourcemap is also updated.
`);
  process.exit([0])
}


for await (const p of walk(dir)) {
  if (p.endsWith('.js')) {
    if (debug) {
      console.log(p);
    }
    const rewriter = new PathRewriter({
      filePath: p,
      relativePath: p.substring(dir.length),
      verbose: debug,
    });
    await rewriter.fixIt();
  }
}
