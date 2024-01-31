#!/bin/sh -e

cd fix_paths
cp -f tests/data/toto.js.tmpl tests/data/toto.js
node index.js tests/data/
diff tests/data/toto.js tests/data/toto.js.expected
cd -
