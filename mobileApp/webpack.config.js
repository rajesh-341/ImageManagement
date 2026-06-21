const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'web/dist'),
    filename: 'bundle.js',
    clean: true,
  },
  cache: false,
  devServer: {
    port: 3000,
    hot: true,
    liveReload: true,
    historyApiFallback: true,
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-screens': path.resolve(__dirname, 'web/mock/Screens.js'),
      'react-native-document-picker': path.resolve(__dirname, 'web/mock/DocumentPicker.js'),
      'react-native-fs': path.resolve(__dirname, 'web/mock/RNFS.js'),
      'react-native-safe-area-context': path.resolve(__dirname, 'web/mock/SafeAreaContext.js'),
      'react-native-image-picker': path.resolve(__dirname, 'web/mock/ImagePicker.js'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'web/mock/AsyncStorage.js'),
      '@react-native-community/netinfo': path.resolve(__dirname, 'web/mock/NetInfo.js'),
      '@react-navigation/native-stack': path.resolve(__dirname, 'web/mock/NativeStack.js'),
    },
    extensions: ['.web.js', '.js', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['module:@react-native/babel-preset'],
          },
        },
      },
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
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
    new webpack.NormalModuleReplacementPlugin(
      /react-native-document-picker/,
      path.resolve(__dirname, 'web/mock/DocumentPicker.js'),
    ),
    new HtmlWebpackPlugin({
      template: './web/index.html',
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
    }),
  ],
};
