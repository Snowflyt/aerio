/*!
 * Copyright (c) 2026 Ge Gao (Snowflyt) and Kindlevel contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Window } from "happy-dom";
import * as V from "vitest";

import { IO } from "../../src";

export interface TestAPI extends V.TestAPI {
  gen: {
    <ExtraContext extends object>(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      name: string | Function,
      fn?: (
        ...args: Parameters<V.TestFunction<ExtraContext>>
      ) => Iterable<IO<unknown>, void, unknown>,
      options?: number,
    ): void;
    <ExtraContext extends object>(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      name: string | Function,
      options?: Omit<V.TestOptions, "shuffle">,
      fn?: (
        ...args: Parameters<V.TestFunction<ExtraContext>>
      ) => Iterable<IO<unknown>, void, unknown>,
    ): void;
  };
}

export const it: TestAPI = Object.assign(V.it, {
  gen: ((...args) => {
    if (args.length === 2 || (args.length === 3 && typeof args[2] === "number")) {
      (it as any)(
        ...args.slice(0, 1),
        (...innerArgs: any[]) => IO.unsafeRunPromise(IO.gen(() => (args[1] as any)(...innerArgs))),
        ...args.slice(2),
      );
      return;
    }

    (it as any)(
      ...args.slice(0, 2),
      (...innerArgs: any[]) => IO.unsafeRunPromise(IO.gen(() => (args[2] as any)(...innerArgs))),
      ...args.slice(3),
    );
  }) satisfies TestAPI["gen"],
});

const restoreProperty = (target: object, name: string, descriptor?: PropertyDescriptor) => {
  if (descriptor) Object.defineProperty(target, name, descriptor);
  else Reflect.deleteProperty(target, name);
};

export const withPatchedProperties = async <T>(
  target: object,
  patches: Record<string, unknown>,
  run: () => Promise<T> | T,
): Promise<T> => {
  const originals = Object.entries(patches).map(
    ([name]) => [name, Object.getOwnPropertyDescriptor(target, name)] as const,
  );

  for (const [name, value] of Object.entries(patches)) {
    Object.defineProperty(target, name, {
      configurable: true,
      writable: true,
      value,
    });
  }

  try {
    return await run();
  } finally {
    for (const [name, descriptor] of originals) {
      restoreProperty(target, name, descriptor);
    }
  }
};

export const withPatchedGlobals = async <T>(
  patches: Record<string, unknown>,
  run: () => Promise<T> | T,
): Promise<T> => {
  return withPatchedProperties(globalThis, patches, async () => {
    V.vi.resetModules();

    try {
      return await run();
    } finally {
      V.vi.resetModules();
    }
  });
};

export const withDOM = async <T>(run: (window: Window) => Promise<T> | T): Promise<T> => {
  const window = new Window();

  return withPatchedGlobals(
    {
      window,
      document: window.document,
    },
    () => run(window),
  );
};
