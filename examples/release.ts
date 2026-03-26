import { IO } from "../src/index";

interface FileHandle {
  readLine: () => IO<string>;
  close: () => IO<void>;
}

function acquireResource(): IO<FileHandle> {
  return IO.log("Acquiring resource...").pipe(
    IO.zipR(IO.sleep(1000)),
    IO.zipR(IO.log("Resource acquired")),
    IO.as({
      readLine: () => IO.sleep(2000).pipe(IO.as("line")),
      close: () => IO.log("File closed"),
    }),
  );
}

function releaseResource(handle: FileHandle): IO<void> {
  return IO.log("Releasing resource...").pipe(
    IO.zipR(IO.sleep(1000)),
    IO.flatMap(() => handle.close()),
  );
}

const program = IO.uncancellable((poll) =>
  acquireResource().pipe(
    IO.flatMap((handle) =>
      poll(handle.readLine().pipe(IO.flatMap(IO.log))).pipe(
        IO.onCancel(releaseResource(handle)),
        IO.flatTap(() => releaseResource(handle)),
      ),
    ),
  ),
);

IO.unsafeRun(program);
