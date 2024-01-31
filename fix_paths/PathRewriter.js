import { readFile, stat, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';

import {parse, print} from 'recast';
import * as typescript from 'recast/parsers/typescript.js';


/**
 * @typedef {Object} Options
 * @property {string} filePath The full path to the file being processed
 * @property {string} reliativeFilePath The relative path of the file being processed
 * @property {boolean} verbose Whether to output debug information
 */

/**
 * This class rewrites the imports / exports paths of a single file.
 * '.js' is added to all imports/exports if the new path resolves to a file.
 * Sourcemaps are rewritten.
 */
export class PathRewriter {
  /**
   * @param {Options} options
   */
  constructor(options) {
    this.filePath = options.filePath;
    this.relativePath = options.relativePath;
    this.verbose = options.verbose;
    this.changed = false;
  }

  async fixIt() {
    // FIXME: should actually read it from source?
    // (note that the map file may not be linked)
    this.sourceMapPath = this.path + '.map';

    const [sourceResult, inputSourceMapResult] = await Promise.allSettled([readFile(this.filePath), readFile(this.sourceMapPath)]);
    if (sourceResult.status !== 'fulfilled') {
      console.error('Something went wrong while reading', this.filePath, sourceResult.reason);
      return Promise.reject();
    }
    this.ast = parse(sourceResult.value, {
      sourceFileName: this.relativePath,
      parser: typescript,
      inputSourceMap: inputSourceMapResult.status === 'fulfilled' ? inputSourceMapResult.value : undefined,
    });
    await this.navigateASTAndRewrite();
    if (this.changed) {
      this.removeOldSourcemaps();
      await this.writeUpdatedFileAndSourceMaps();
    }
  }

  async writeUpdatedFileAndSourceMaps() {
    const p = this.filePath;
    const ast = this.ast;
    // Write new file
    const output = print(ast, {
      sourceMapName: this.sourceMapPath,
    });
    await writeFile(p, output.code);

    // Write sourcemap
    if (this.hasInlineSourceMap) {
      const inlineSourceMap = `
//# sourceMappingURL=data:application/json;base64,${btoa(JSON.stringify(output.map))}
`;
      await appendFile(p, inlineSourceMap);
    } else if (this.hasExternalSourceMap) {
      const externalSourceMap = `
//# sourceMappingURL=${p}.map}
`;
      await appendFile(p, externalSourceMap);
      await writeFile(`${p}.map`, JSON.stringify(output.map));
    }
  }

  /**
   *
   * @param {string} source
   * @return {string} if import rewritten
   */
  async sourceRewrite(source) {
    if (!source.startsWith('.')) {
      return; // non relative paths are not in our project
    }
    const newSource = source + '.js';
    const newsourcePath = path.join(path.dirname(this.filePath), newSource);
    const fileExists = await stat(newsourcePath).then(
      () => true,
      () => false,
    );
    if (this.verbose)
      console.log('  stats', this.relativePath, newsourcePath, fileExists);
    if (!fileExists) {
      return; // if there is no js there that means we should not rewrite it
    }
    if (this.verbose) {
      console.log('  changed', source, '->', newSource);
    }
    this.changed = true;
    return newSource;
  }

  /**
   *
   */
  async navigateASTAndRewrite() {
    const body = this.ast.program.body;
    for (const node of body) {
      if (this.verbose)
        console.log(' type', this.relativePath, node.type);
      switch (node.type) {
        case 'ExportAllDeclaration':
        case 'ImportDeclaration':
        case 'ExportNamedDeclaration': {
          if (!node.source) {
            continue;
          }
          /**
           * @type {string}
           */
          const source = node.source.value;
          if (!source.endsWith('.js')) {
            const newSource = await this.sourceRewrite(source);
            if (newSource) {
              node.source.value = newSource;
            }
          }
          break;
        }
        default: {
          // pass
        }
      }
    }
  }

  removeOldSourcemaps() {
    // Remove sourcemaps
    const ast = this.ast;
    const comments = ast.program.body.at(-1).comments;
    const hasInlineSourceMap = this.hasInlineSourceMap =
      comments && comments[0].value.startsWith('# sourceMappingURL=data:');
    const hasExternalSourceMap = this.hasExternalSourceMap =
      !hasInlineSourceMap &&
      comments &&
      comments[0].value.startsWith('# sourceMappingURL');
    if (hasInlineSourceMap || hasExternalSourceMap) {
      ast.program.body.at(-1).comments = undefined; // remove comment
    }
  }
}
