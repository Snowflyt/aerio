import { IO } from "../src";

import { importUrl } from "./import-url";

const { show } = await importUrl<any>("https://esm.sh/showify@0.2.8");

const program = IO.bothOutcome(
  IO.throw("Oops!").pipe(IO.delay(1000)),
  IO.of("OK").pipe(IO.delay(2000)),
);

const result = await IO.unsafeRunPromise(program);
console.log(show(result, { indent: 2, colors: true }));
