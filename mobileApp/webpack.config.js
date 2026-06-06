const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'web/dist'),
    filename: 'bundle.js',
  },
  devServer: {
    port: 3000,
    hot: true,
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-screens': path.resolve(__dirname, 'web/mock/Screens.js'),
      'react-native-fs': path.resolve(__dirname, 'web/mock/RNFS.js'),
    },
    extensions: ['.web.js', '.js', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        exclude: /node_modules\/(?!(@react-navigation|react-native-gesture-handler|react-native-reanimated)\/)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['module:@react-native/babel-preset'],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: { loader: 'url-loader', options: { limit: 8192 } },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './web/index.html',
    }),
  ],
};
