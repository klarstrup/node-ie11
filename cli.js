#!/usr/bin/env node

const rollup = require("rollup");
const resolve = require("rollup-plugin-node-resolve");
const babel = require("rollup-plugin-babel");
const [input] = process.argv.slice(2);

if (!input) {
  console.error(
    "First argument to `ie11` must be the path to a .js script file."
  );
  process.exit();
}
const output = input
  .split(".")
  .map(s => (s === "js" ? "ie11.js" : s))
  .join(".");
rollup
  .rollup({
    input,
    plugins: [
      resolve(),
      babel({
        babelrc: false,
        presets: [
          [
            "@babel/preset-env",
            {
              targets: {
                browsers: ["ie 11"]
              },
              modules: false,
              useBuiltIns: "usage"
            }
          ]
        ]
      })
    ]
  })
  .then(bundle =>
    bundle
      .write({
        file: output,
        format: "iife"
      })
      .then(() =>
        console.log(
          "Transmogriffed %s into the IE11-friendly %s 🤠",
          input,
          output
        )
      )
  );
