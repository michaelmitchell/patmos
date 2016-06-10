var path = require('path');
var webpack = require('webpack');
var fs = require('fs');

//
var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });

//
module.exports = {
  entry: [
    'babel-polyfill',
    './src/main',
  ],
  target: 'node',
  output: {
      publicPath: '/',
      filename: 'build/main.js'
  },
  externals: nodeModules,
  devtool: 'source-map',
  devServer: {
    contentBase: "./src"
  },
  module: {
    loaders: [
      {
        test: /\.js?$/,
        include: [
          path.join(__dirname, 'src'),
        ],
        loader: 'babel-loader',
        query: {
          plugins: ['transform-runtime', 'transform-object-rest-spread'],
          presets: ['es2015', 'stage-3', 'react'],
        }
      }
    ]
  },
  debug: true
};
