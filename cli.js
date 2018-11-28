#!/usr/bin/env node

const rollup = require("rollup");
const babelParser = require("@babel/parser");
const resolve = require("rollup-plugin-node-resolve");
const babel = require("rollup-plugin-babel");
const prettier = require("rollup-plugin-prettier");
const commonjs = require("rollup-plugin-commonjs");
const fs = require("fs");
const program = require("commander");

program
  .version("0.1.0")
  .option("-o, --outputFilename", "Output IE11 code to a named file")
  .action((inputFilename, outputFilename) => {
    if (!inputFilename) {
      console.error(
        "First argument to `ie11` must be the path to a .js script file."
      );
      process.exit();
    }

    rollup
      .rollup({
        input: inputFilename,
        treeshake: true,
        plugins: [
          codeMangler(),
          resolve(),
          commonjs(),
          babel({
            babelrc: false,
            exclude: "node_modules/**", // only transpile our source code
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
          }),
          prettier({ parser: "babylon" })
        ]
      })
      .then(bundle => {
        const outputOptions = {
          format: "iife",
          strict: false,
          indent: false
        };
        if (typeof outputFilename === "string") {
          bundle
            .write({
              ...outputOptions,
              file: outputFilename
            })
            .then(() =>
              console.log(
                "Transmogriffed %s into the IE11-friendly %s 🤠",
                inputFilename,
                outputFilename
              )
            );
        } else {
          bundle
            .generate({
              ...outputOptions
            })
            .then(({ code }) => process.stdout.write(code));
        }
      });
  })
  .parse(process.argv);

let topLevelDeclarations;
function codeMangler() {
  return {
    name: "my-example", // this name will show up in warnings and errors
    resolveId(importee, importer) {
      if (importee === "virtual-module") {
        return importee; // this signals that rollup should not ask other plugins or check the file system to find this id
      }
      return null; // other ids should be handled as usually
    },
    generateBundle(outputOptions, bundle, isWrite) {
      // Strip out IIFE and any window. trickery
      // Not in use because I'm not sure I want polyfills and stuff ending up at the global scope
      /*
      for (let part in bundle) {
        bundle[part].code = bundle[part].code
          .split("\n")
          .slice(1, -(2 + topLevelDeclarations.length))
          .join("\n");
      }
      */
    },
    transform(code, id) {
      if (!topLevelDeclarations) {
        topLevelDeclarations = babelParser
          .parse(code)
          .program.body.map(({ id: { name } = {} }) => name)
          .filter(Boolean);
        const newCode = `
          ${code}
          ${topLevelDeclarations
            .map(identifier => `window.${identifier} = ${identifier};`)
            .join("\n")}
        `;
        return newCode; // the source code for "virtual-module"
      }
    }
  };
}
