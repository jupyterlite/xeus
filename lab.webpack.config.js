const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const wasmPath = [
  __dirname,
  'node_modules',
  '@emscripten-forge',
  'mambajs',
  'lib',
  '*.wasm'
];
const staticPath = [
  __dirname,
  'jupyterlite_xeus',
  'labextension',
  'static',
  '[name].wasm'
];

module.exports = {
    plugins: [
        new CopyPlugin({
            patterns: [
            {
                from: path.resolve(...wasmPath),
                to: path.join(...staticPath)
            }
            ]
        })
        ]
};
