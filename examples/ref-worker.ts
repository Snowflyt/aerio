import type { HKT, Kind } from "hkt-core";

import { IO, Ref } from "../src";
import type { Sync } from "../src/typeclass/Sync";

class Worker<F extends HKT<unknown, unknown>> {
  declare readonly id: number;
  declare readonly ref: Ref<F, number>;

  declare readonly start: () => Kind<F, void>;

  constructor(F: Sync<F>, id: number, ref: Ref<F, number>) {
    this.id = id;
    this.ref = ref;

    this.start = () => F.gen(($) => this._start(F, $));
  }

  private *_start(F: Sync<F>, $: Sync.GenAdapter<F>) {
    const c1 = yield* $(this.ref.pipe(Ref.get));
    yield* $(F.sync(() => console.log(`Worker #${this.id} >> ${c1}`)));
    const c2 = yield* $(this.ref.pipe(Ref.updateAndGet((n) => n + 1)));
    yield* $(F.sync(() => console.log(`Worker #${this.id} >> ${c2}`)));
  }
}

const program = IO.do(
  IO.bindV("ref", IO.ref(0)),
  IO.let("w1", ({ ref }) => new Worker(IO, 1, ref)),
  IO.let("w2", ({ ref }) => new Worker(IO, 2, ref)),
  IO.let("w3", ({ ref }) => new Worker(IO, 3, ref)),
  IO.also(({ w1, w2, w3 }) => IO.all([w1.start(), w2.start(), w3.start()])),
);

IO.unsafeRun(program);
