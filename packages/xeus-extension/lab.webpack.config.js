const path = require('path');
const { CopyRspackPlugin } = require('@rspack/core');

const wasmPath = [
  __dirname,
  '..',
  '..',
  'node_modules',
  '@emscripten-forge',
  'mambajs-core',
  'lib',
  '*.wasm'
];
const staticPath = [
  __dirname,
  '..',
  '..',
  'jupyterlite_xeus',
  'labextension',
  'static',
  '[name].wasm'
];

module.exports = {
  // Rspack's RealContentHashPlugin panics with a "circular hash dependency" when
  // an asset whose filename already contains a hash is copied into the output and
  // also referenced by name in the bundled JS (here, mambajs-core's
  // `unpack-<hash>.wasm`). Disabling realContentHash avoids the cycle; the
  // labextension chunk hashes stay internally consistent.
  // See https://github.com/jupyterlab/jupyterlab/issues/18245#issuecomment-3675392312
  optimization: {
    realContentHash: false
  },
  plugins: [
    new CopyRspackPlugin({
      patterns: [
        {
          from: path.resolve(...wasmPath),
          to: path.join(...staticPath)
        }
      ]
    })
  ]
};
