import { describe, expect, it } from "vitest";

import { Fiber, IO, Outcome } from "../src";
import type { IOHKT } from "../src/IO";

const IOOutcome = {
  Succeeded: <A>(fa: IO<A>): Outcome<IOHKT, unknown, A> => Outcome.Succeeded(fa),
  Failed: <A>(e: unknown): Outcome<IOHKT, unknown, A> => Outcome.Failed(e),
  Cancelled: <A>(): Outcome<IOHKT, unknown, A> =>
    IO.cancelled().pipe(IO.unsafeRunFork, Fiber.await, IO.unsafeRunSync) as Outcome<
      IOHKT,
      unknown,
      A
    >,
} as const;

const getSucceededValue = <A>(outcome: Outcome<IOHKT, unknown, A>): A => {
  expect(outcome._tag).toBe("Succeeded");
  if (outcome._tag !== "Succeeded") throw new Error("Expected a succeeded outcome");
  return IO.unsafeRunSync(outcome._0);
};

const getFailedError = (outcome: Outcome<IOHKT, unknown, unknown>): unknown => {
  expect(outcome._tag).toBe("Failed");
  if (outcome._tag !== "Failed") throw new Error("Expected a failed outcome");
  return outcome._0;
};

describe("Outcome.Succeeded and Outcome.Failed", () => {
  it("constructs tagged outcomes", () => {
    const succeeded = Outcome.Succeeded<IOHKT, unknown, number>(IO.of(1));
    const failed = Outcome.Failed<IOHKT, unknown, number>("boom");

    expect(getSucceededValue(succeeded)).toBe(1);
    expect(getFailedError(failed)).toBe("boom");
  });
});

describe("Outcome.throw", () => {
  it("constructs a failed outcome", () => {
    expect(getFailedError(Outcome.throw("boom"))).toBe("boom");
  });
});

describe("Outcome.isOutcome", () => {
  it("recognizes outcome-shaped values", () => {
    expect(Outcome.isOutcome(Outcome.Succeeded<IOHKT, unknown, number>(IO.of(1)))).toBe(true);
    expect(Outcome.isOutcome({ _tag: "Succeeded" })).toBe(false);
    expect(Outcome.isOutcome(null)).toBe(false);
  });
});

describe("Outcome.imap", () => {
  it("maps both reads and writes through the underlying effect", () => {
    const outcome = Outcome.Succeeded<IOHKT, unknown, string>(IO.of("42")).pipe(
      Outcome.imap<IOHKT>(IO)(Number, String),
    );

    expect(getSucceededValue(outcome)).toBe(42);
  });
});

describe("Outcome.map", () => {
  it("maps successful outcomes", () => {
    const outcome = Outcome.Succeeded<IOHKT, unknown, number>(IO.of(1)).pipe(
      Outcome.map<IOHKT>(IO)((n) => n + 1),
    );

    expect(getSucceededValue(outcome)).toBe(2);
  });
});

describe("Outcome.tap", () => {
  it("runs a callback on successful outcomes and preserves the value", () => {
    let seen = 0;

    const outcome = Outcome.Succeeded<IOHKT, unknown, number>(IO.of(2)).pipe(
      Outcome.tap<IOHKT>(IO)((n) => {
        seen = n;
      }),
    );

    expect(getSucceededValue(outcome)).toBe(2);
    expect(seen).toBe(2);
  });
});

describe("Outcome.as and Outcome.asVoid", () => {
  it("replaces successful values", () => {
    const asOutcome = Outcome.Succeeded<IOHKT, unknown, number>(IO.of(1)).pipe(
      Outcome.as<IOHKT>(IO)("done"),
    );
    const asVoidOutcome = Outcome.Succeeded<IOHKT, unknown, number>(IO.of(1)).pipe(
      Outcome.asVoid<IOHKT>(IO),
    );

    expect(getSucceededValue(asOutcome)).toBe("done");
    expect(getSucceededValue(asVoidOutcome)).toBeUndefined();
  });
});

describe("Outcome.of and Outcome.void", () => {
  it("lifts values into successful outcomes", () => {
    expect(getSucceededValue(Outcome.of<IOHKT>(IO)(42))).toBe(42);
    expect(getSucceededValue(Outcome.void<IOHKT>(IO)())).toBeUndefined();
  });
});

describe("Outcome.ap", () => {
  it("applies successful function outcomes", () => {
    const result = IOOutcome.Succeeded(IO.of((n: number) => n + 1)).pipe(
      Outcome.ap<IOHKT>(IO)(IOOutcome.Succeeded(IO.of(1))),
    );

    expect(getSucceededValue(result)).toBe(2);
  });
});

describe("Outcome.product", () => {
  it("propagates a failed left outcome", () => {
    const result = IOOutcome.Failed("boom").pipe(Outcome.product<IOHKT>(IO)(IOOutcome.Cancelled()));

    expect(getFailedError(result)).toBe("boom");
  });

  it("propagates a failed right outcome after a successful left outcome", () => {
    const result = IOOutcome.Succeeded(IO.of(1)).pipe(
      Outcome.product<IOHKT>(IO)(IOOutcome.Failed("boom")),
    );

    expect(getFailedError(result)).toBe("boom");
  });
});

describe("Outcome.productL and Outcome.productR", () => {
  it("keeps the requested side on success", () => {
    const left = IOOutcome.Succeeded(IO.of(1)).pipe(
      Outcome.productL<IOHKT>(IO)(IOOutcome.Succeeded(IO.of("right"))),
    );
    const right = IOOutcome.Succeeded(IO.of(1)).pipe(
      Outcome.productR<IOHKT>(IO)(IOOutcome.Succeeded(IO.of("right"))),
    );

    expect(getSucceededValue(left)).toBe(1);
    expect(getSucceededValue(right)).toBe("right");
  });
});

describe("Outcome.when and Outcome.unless", () => {
  it("keeps or skips the provided outcome according to the condition", () => {
    const whenKept = Outcome.when<IOHKT>(IO)(true, IOOutcome.Failed("boom"));
    const whenSkipped = Outcome.when<IOHKT>(IO)(false, IOOutcome.Failed("boom"));
    const unlessKept = Outcome.unless<IOHKT>(IO)(false, IOOutcome.Failed("boom"));
    const unlessSkipped = Outcome.unless<IOHKT>(IO)(true, IOOutcome.Failed("boom"));

    expect(getFailedError(whenKept)).toBe("boom");
    expect(getSucceededValue(whenSkipped)).toBeUndefined();
    expect(getFailedError(unlessKept)).toBe("boom");
    expect(getSucceededValue(unlessSkipped)).toBeUndefined();
  });
});

describe("Outcome.ignore", () => {
  it("discards successful values without nesting the effect", () => {
    const ignored = IOOutcome.Succeeded(IO.of(1)).pipe(Outcome.ignore(IO));

    expect(getSucceededValue(ignored)).toBeUndefined();
  });

  it("turns failures into a successful void outcome", () => {
    const ignored = IOOutcome.Failed("boom").pipe(Outcome.ignore(IO));

    expect(getSucceededValue(ignored)).toBeUndefined();
  });

  it("preserves cancellation", () => {
    const ignored = IOOutcome.Cancelled().pipe(Outcome.ignore(IO));

    expect(ignored._tag).toBe("Cancelled");
  });
});

describe("Outcome.catch", () => {
  it("handles only failed outcomes", () => {
    const recovered = IOOutcome.Failed("boom").pipe(
      Outcome.catch((error) => IOOutcome.Succeeded(IO.of((error as string).length))),
    );
    const kept = IOOutcome.Succeeded(IO.of(1)).pipe(
      Outcome.catch(() => IOOutcome.Succeeded(IO.of(2))),
    );

    expect(getSucceededValue(recovered)).toBe(4);
    expect(getSucceededValue(kept)).toBe(1);
  });
});

describe("Outcome.throwWhen and Outcome.throwUnless", () => {
  it("follows the condition", () => {
    const thrown = Outcome.throwWhen<IOHKT, unknown>(IO)(true, "boom");
    const skipped = Outcome.throwWhen<IOHKT, unknown>(IO)(false, "boom");
    const allowed = Outcome.throwUnless<IOHKT, unknown>(IO)(true, "boom");
    const rejected = Outcome.throwUnless<IOHKT, unknown>(IO)(false, "boom");

    expect(getFailedError(thrown)).toBe("boom");
    expect(getSucceededValue(skipped)).toBeUndefined();
    expect(getSucceededValue(allowed)).toBeUndefined();
    expect(getFailedError(rejected)).toBe("boom");
  });
});

describe("Outcome.isSucceeded, Outcome.isFailed, and Outcome.isCancelled", () => {
  it("reports the outcome tag", () => {
    expect(Outcome.isSucceeded(IOOutcome.Succeeded(IO.of(1)))).toBe(true);
    expect(Outcome.isSucceeded(IOOutcome.Failed("boom"))).toBe(false);

    expect(Outcome.isFailed(IOOutcome.Failed("boom"))).toBe(true);
    expect(Outcome.isFailed(IOOutcome.Succeeded(IO.of(1)))).toBe(false);

    expect(Outcome.isCancelled(IOOutcome.Cancelled())).toBe(true);
    expect(Outcome.isCancelled(IOOutcome.Succeeded(IO.of(1)))).toBe(false);
  });
});
