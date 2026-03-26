import { IO } from "../src";

const greet1 = IO.println("Hello, world!").pipe(IO.delay(1000), IO.forever);
const greet2 = IO.println("Bonjour, monde!").pipe(IO.delay(2000), IO.forever);

IO.unsafeRun(IO.forkGlobal(greet1).pipe(IO.zipR(IO.forkGlobal(greet2))));
