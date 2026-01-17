import path from "path";

import CopyPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import { merge } from "webpack-merge"

import common from "./webpack.common.mjs"

export default (_env, argv) => {
  return [
  merge(common(_env, argv), {
    context: path.resolve(process.cwd(), "src/client"),
    stats: "minimal", // Keep console output easy to read.
    entry: "./index.ts",

    // Your build destination
    output: {
      path: path.resolve(process.cwd(), "dist", "browser"),
      filename: "bundle.js",
      clean: true,
    },

    // Config for your testing server
    devServer: {
      compress: true,
      allowedHosts: ["localhost"], // Restrict allowed hosts to localhost to avoid exposing the dev server to untrusted hosts.
      static: false,
      client: {
        logging: "warn",
        overlay: {
          errors: true,
          warnings: false,
        },
        progress: true,
      },
      port: 5143,
      host: "localhost",
    },

    plugins: [
      // Copy our static assets to the final build
      new CopyPlugin({
        patterns: [{ from: path.resolve(process.cwd(), "public/static/") }],
      }),

      // Make an index.html from the template
      new HtmlWebpackPlugin({
        template: path.resolve(process.cwd(), "public/", "index.ejs"),
        hash: true,
        minify: false,
      }),

      new NodePolyfillPlugin(),
    ],
  }),
  merge(common(_env, argv), {
    context: path.resolve(process.cwd(), "src/server"),
    entry: './main.ts',
    target: 'node',
    output: {
      filename: 'node-bundle.cjs',
      path: path.resolve(process.cwd(), "dist", "node"),
      clean: true,
      library: {
        type: "commonjs-static"
      }
    },
  })
]
};
