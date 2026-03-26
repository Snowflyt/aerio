import { IO } from "../src";

function sleep(ms: number): IO<void> {
  return IO.promise(
    (signal) =>
      new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, ms);
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          console.log("Aborted");
          reject(new Error("Aborted"));
        });
      }),
  );
}

const { cancel, promise } = IO.unsafeRunPromiseCancellable(sleep(1000));

setTimeout(() => void cancel(), 500);

await promise;
