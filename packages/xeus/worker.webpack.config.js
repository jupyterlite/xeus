const path = require('path');
const rules = [
  {
    test: /\.js$/,
    exclude: /node_modules/,
    loader: 'source-map-loader'
  }
];

const resolve = {
  fallback: {
    fs: false,
    child_process: false,
    crypto: false
  },
  extensions: ['.js']
};

module.exports = [
  {
    entry: {
      ['coincident.worker']: './lib/coincident.worker.js',
      ['comlink.worker']: './lib/comlink.worker.js'
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'lib'),
      libraryTarget: 'amd'
    },
    module: {
      rules
    },
    devtool: 'source-map',
    resolve
  }
];
