#!/bin/sh -e

cp -f tests/data/toto.js.tmpl tests/data/toto.js
node fix_paths_recast.js tests/data/
diff tests/data/toto.js tests/data/toto.js.expected
