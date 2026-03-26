import { IO } from "../src";

const chooseSecret = IO.sync(
  // eslint-disable-next-line sonarjs/pseudo-random
  () => Math.floor(Math.random() * 100) + 1,
);

const promptGuess = (message: string, attempt: number): IO<number> =>
  IO.input(
    (message ? message + "\n" : "") + `Attempt ${attempt} - guess a number between 1 and 100: `,
  ).pipe(
    IO.andThen((value) => parseInt(value.trim())),
    IO.andThen((guess) =>
      isNaN(guess) ? promptGuess("Please enter a valid integer.", attempt) : IO.of(guess),
    ),
  );

const play = (secret: number, message = "", attempt = 1): IO<void> =>
  promptGuess(message, attempt).pipe(
    IO.andThen((guess) =>
      guess === secret ?
        IO.notify(`You guessed it in ${attempt} attempt${attempt === 1 ? "" : "s"}!`)
      : play(secret, `Too ${guess < secret ? "low" : "high"}. Try again`, attempt + 1),
    ),
  );

const program = chooseSecret.pipe(
  IO.andThen((secret) => play(secret, "Guess the number between 1 and 100.")),
);

IO.unsafeRun(program);
