import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { js, runCompat } from "./test-utils/compat.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distEntrypoint = path.join(projectRoot, "dist", "index.js");
const distCJSEntrypoint = path.join(projectRoot, "dist", "cjs", "index.js");

const runNode = async (code: string) => {
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      process.execPath,
      ["--input-type=module", "--eval", code],
      {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      },
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      (error, stdout) => (error ? reject(error) : resolve(stdout)),
    );
  });
  return { stdout };
};

const runNodeCJS = async (code: string) => {
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      process.execPath,
      ["--eval", code],
      {
        cwd: projectRoot,
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
      },
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      (error, stdout) => (error ? reject(error) : resolve(stdout)),
    );
  });
  return { stdout };
};

const runNode6CJS = async <Result = unknown>(code: string) =>
  await runCompat<"node6", Result>("node6", code, { useDist: true });

const runQuickJS = async <Result = unknown>(code: string) =>
  await runCompat<"quickjs", Result>("quickjs", code, { useDist: true });

const runQuickJSNG = async <Result = unknown>(code: string) =>
  await runCompat<"quickjs-ng", Result>("quickjs-ng", code, { useDist: true });

void test("current node runs the built entrypoint", async () => {
  const { stdout } = await runNode(
    js`
      import { IO } from ${JSON.stringify(pathToFileURL(distEntrypoint).href)};

      const program = IO.println("node-esm-smoke");

      IO.unsafeRun(program);
    `,
  );

  assert.equal(stdout.trim(), "node-esm-smoke");
});

void test("current node runs the built CJS entrypoint", async () => {
  const { stdout } = await runNodeCJS(
    js`
      const { IO } = require(${JSON.stringify(distCJSEntrypoint)});

      const program = IO.println("node-cjs-smoke");

      IO.unsafeRun(program);
    `,
  );

  assert.equal(stdout.trim(), "node-cjs-smoke");
});

void test("node 6 runs the built CJS entrypoint", async () => {
  const { probe, stdout } = await runNode6CJS(
    js`
      const { IO } = require("aerio");

      const program = IO.println("node6-cjs-smoke");

      IO.unsafeRun(program);
    `,
  );

  assert.match(probe.observedVersion, /^v6\./);
  assert.equal(stdout.trim(), "node6-cjs-smoke");
});

void test("quickjs runs the built entrypoint", async () => {
  const { stdout } = await runQuickJS(
    js`
      import { IO } from "aerio/index.js";

      const program = IO.println("quickjs-smoke");

      IO.unsafeRun(program);
    `,
  );

  assert.equal(stdout.trim(), "quickjs-smoke");
});

void test("quickjs-ng runs the built entrypoint", async () => {
  const { stdout } = await runQuickJSNG(
    js`
      import { IO } from "aerio/index.js";

      const program = IO.println("quickjs-ng-smoke");

      IO.unsafeRun(program);
    `,
  );

  assert.equal(stdout.trim(), "quickjs-ng-smoke");
});
