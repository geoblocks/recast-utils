# Recast utilities

## Fix typescript paths

The Typescript convention is to write js imports without their extension: '.js'.
This script rewrites the imports/exports paths so that they resolve to actual files.
This is useful to ensure the files are usable without a bundler (direct node imports, import maps, ...).

```shell
node @geoblocks/recast-utils/fix_paths_recast.js transpiled_dir
```

This can be used in your `package.json` *prepare* script:

```json
{
  "scripts": {
    "prepare": "tsc --pretty && node node_modules/@geoblocks/recast-utils/fix_paths_recast.js lib"
  }
}
```
