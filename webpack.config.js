
module.exports = {
  plugins: [
    // new CopyPlugin({
    //   patterns: [
    //     // {
    //     //   from: 'src/kernels/**/*',
    //     //   to({ context, absoluteFilename }) {
    //     //       console.log(context, absoluteFilename);

    //     //       // get rel path by substracting context from absoluteFilename
    //     //       const relPath = absoluteFilename.replace(context, '');
    //     //       console.log(relPath);
    //     //       // remove the "src/" part of the path
    //     //       return relPath.replace('/src/', './');
    //     //   },
    //     // }
    //   ]
    // })
  ],
  optimization: {
    minimize: false
  }
};
