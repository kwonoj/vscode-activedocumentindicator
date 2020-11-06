//tslint:disable:no-require-imports no-var-requires
const path = require('path');
const webpack = require('webpack');
const terserPlugin = require('terser-webpack-plugin');

// Build time constants
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

console.log(`Build for '${nodeEnv}'`);
/**
 * Base options to be shared between two build targets.
 */
const baseOption = {
  //Output configuration, specify `library` / `libraryTarget` to preseve module exports
  output: {
    path: path.resolve('./dist'),
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    libraryTarget: 'commonjs',
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          transpileOnly: !isProduction,
        },
      },
    ],
  },

  devtool: isProduction ? 'source-map' : 'eval-source-map',

  optimization: {
    minimizer: [] as Array<any>,
  },

  externals: {
    /**
     * Client side externals
     */
    vscode: {
      commonjs: 'vscode',
    },
    'vscode-languageclient': {
      commonjs: 'vscode-languageclient',
    },

    /**
     * Server side externals
     */
    'vscode-languageserver': {
      commonjs: 'vscode-languageserver',
    },
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(nodeEnv),
      },
      isProduction,
    }),
  ],
};

/**
 * Production specific optimization
 *
 */
if (isProduction) {
  baseOption.optimization.minimizer.push(new terserPlugin({}));
}

/**
 * Single configuration defines client, server side entry both.
 *
 * For seperate target config, refer
 * https://github.com/kwonoj/vscode-autospell/blob/f15b3a48040ebe4bd0b819c687da86e710e2cf7c/webpack.config.ts#L95-L122
 */
module.exports = {
  ...baseOption,

  // Target / node configuration is for mainly server side configuration,
  // client still works with same target config.
  target: 'node',

  mode: isProduction ? 'production' : 'development',

  node: false,

  entry: {
    index: './src/index.ts',
  },
};
