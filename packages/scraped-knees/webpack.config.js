const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
      entry: {
    background: './src/background.js',
    content: ['./src/content.js', './src/content.css'],
    popup: ['./src/popup.js', './src/popup.css'],
    injected: './src/injected.js',
    options: ['./src/options.js', './src/options.css']
  },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader'
          ]
        }
      ]
    },
               plugins: [
             new HtmlWebpackPlugin({
               template: './src/popup.html',
               filename: 'popup.html',
               chunks: ['popup']
             }),
             new HtmlWebpackPlugin({
               template: './src/options.html',
               filename: 'options.html',
               chunks: ['options']
             }),
      new MiniCssExtractPlugin({
        filename: '[name].css'
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/icons', to: 'icons' },
          { from: 'manifest.json', to: 'manifest.json' }
        ]
      })
    ],
    devtool: isProduction ? false : 'cheap-module-source-map',
    optimization: {
      splitChunks: {
        chunks: 'all'
      }
    }
  };
};