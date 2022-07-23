import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import path from "path";
import fs from "fs/promises";

import { rollup } from "rollup";
import esbuildPlugin from "rollup-plugin-esbuild";
import esbuild from "esbuild";

// const bundle = await rollup({
//   input: "./src/quote.jsx",
//   onwarn: () => {},
//   plugins: [
//     esbuild({
//       minify: true,
//       target: ["es2021"],
//     }),
//   ],
// });

// await bundle.write({
//   format: "iife",
//   compact: true,
//   file: "./dist/plugin.js",
//   globals(id) {
//     if (id.startsWith("@cordwood")) return id.substring(1).replace(/\//g, ".");
//     return null;
//   },
// });

// await bundle.close();

async function build(args) {
  console.log("Building plugin " + args.plugin);

  const manifest = path.join("plugins", args.plugin, "manifest.json");
  await fs.access(manifest).catch(() => {
    throw new Error("Could not find plugin " + args.plugin);
  });

  let manifestJson;
  try {
    manifestJson = JSON.parse(await fs.readFile(manifest, "utf-8"));
  } catch {
    throw new Error("Could parse manifest of " + args.plugin);
  }

  await fs.access(args.output).catch(() => fs.mkdir(args.output));

  const bundle = await rollup({
    input: path.join("plugins", args.plugin, manifestJson.main),
    onwarn: () => {},
    plugins: [
      esbuildPlugin({
        minify: true,
        target: ["es2021"],
      }),
      {
        name: "import-css", // todo: use css modules instead of this?
        async transform(code, id) {
          if (id.endsWith(".css")) {
            const minified = await (
              await esbuild.transform(code, { minify: true, loader: "css" })
            ).code.trim();
            return {
              code: `import { injectCSS } from "@cordwood/patcher";
              export default () => injectCSS(${JSON.stringify(minified)})`,
            };
          }
        },
      },
    ],
  });

  await bundle.write({
    format: "iife",
    compact: true,
    file: path.join(args.output, "index.js"),
    globals(id) {
      if (id.startsWith("@cordwood")) return id.substring(1).replace(/\//g, ".");
      return null;
    },
  });

  await fs.writeFile(path.join(args.output, "manifest.json"), JSON.stringify(manifestJson));

  console.log("Built plugin to " + path.join(args.output, "/"));
}

yargs(hideBin(process.argv))
  .command(
    ["$0 <plugin>"],
    "Builds a plugin",
    (yargs) =>
      yargs
        .positional("plugin", {
          describe: "the plugin you want to build",
          type: "string",
        })
        .option("o", {
          alias: "output",
          describe: "where to output the plugin",
          type: "string",
          default: "dist",
        }),
    (args) =>
      build(args).catch((err) => {
        console.error(err.message);
        process.exit(1);
      }),
  )
  .wrap(72).argv;
