// @ts-check

const { IO } = require("../dist");

const chooseSecret = IO.sync(
  // eslint-disable-next-line sonarjs/pseudo-random
  () => Math.floor(Math.random() * 100) + 1
);

/**
 * Prompts the user to guess a number and validates the input.
 * @param {string} message
 * @param {number} attempt
 * @returns {IO<number>}
 */
const promptGuess = (message, attempt) =>
  IO.do(
    IO.bindV(
      "value",
      IO.input(
        (message ? message + "\n" : "") + `Attempt ${attempt} - guess a number between 1 and 100: `
      )
    ),
    IO.let("guess", ({ value }) => parseInt(value.trim())),
    IO.returnM(({ guess }) =>
      isNaN(guess) ? promptGuess("Please enter a valid integer.", attempt) : IO.of(guess)
    )
  );

/**
 * The main game loop that checks the user’s guess against the secret number.
 * @param {number} secret
 * @param {string} message
 * @param {number} attempt
 * @returns {IO<void>}
 */
const play = (secret, message = "", attempt = 1) =>
  IO.do(
    IO.bindV("guess", promptGuess(message, attempt)),
    IO.also(({ guess }) =>
      guess === secret ?
        IO.notify(`You guessed it in ${attempt} attempt${attempt === 1 ? "" : "s"}!`)
      : play(secret, `Too ${guess < secret ? "low" : "high"}. Try again`, attempt + 1)
    )
  );

const program = IO.do(
  IO.bindV("secret", chooseSecret),
  IO.also(({ secret }) => play(secret, "Welcome to the Guess the Number Game!"))
);

IO.unsafeRun(program);
