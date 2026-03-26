const { Console, Effect } = require("effect");

const program = Console.log("Hello, world!");

Effect.runSync(program);
