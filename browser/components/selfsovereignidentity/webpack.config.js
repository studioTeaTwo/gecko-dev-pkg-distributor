/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
/* eslint-env node */

const path = require("path")
const webpack = require("webpack")

module.exports = (env, argv) => {
  return {
    mode: "production",
    entry: {
      main: path.resolve(__dirname, "./src/main.ts"),
    },
    output: {
      filename: "[name].bundle.js",
      path: `${__dirname}/content/js/`,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: path.resolve(__dirname, "/node_modules"),
          loader: "ts-loader",
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        "process.env": {
          NODE_ENV: JSON.stringify(
            env.WEBPACK_WATCH ? "development" : "production"
          ),
        },
      }),
    ],
    resolve: {
      extensions: [".js", ".ts", ".tsx"],
    },
    optimization: {
      minimize: false,
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|object-assign|@chakra-ui\/react|@emotion\/react|@emotion\/styled|framer-motion)[\\/]/,
            name: "vendor",
            chunks: "all",
          },
        },
      },
    },
  }
}
