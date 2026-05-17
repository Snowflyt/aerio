import type { Arg0, HKT } from "hkt-core";

import * as IOCore from "../src/core/IO";

interface MyEffect<A> extends IOCore.IO<A> {
  as: <B>(a: B) => MyEffect<B>;
  map: <B>(f: (a: A) => B) => MyEffect<B>;
  flatMap: <B>(f: (a: A) => MyEffect<B>) => MyEffect<B>;
  flatTap: <B>(f: (a: A) => MyEffect<B>) => MyEffect<A>;
}

interface MyEffectHKT extends HKT<unknown, unknown> {
  return: MyEffect<Arg0<this>>;
}

const MyEffectProto = {
  as(this: MyEffect<any>, a: any): MyEffect<any> {
    return _as(this, a);
  },
  map(this: MyEffect<any>, f: (a: any) => any): MyEffect<any> {
    return _map(this, f);
  },
  flatMap(this: MyEffect<any>, f: (a: any) => MyEffect<any>): MyEffect<any> {
    return _flatMap(this, f);
  },
  flatTap(this: MyEffect<any>, f: (a: any) => MyEffect<any>): MyEffect<any> {
    return _flatTap(this, f);
  },
};

const _as = IOCore.deriveAs<MyEffectHKT>(MyEffectProto);
const _map = IOCore.deriveMap<MyEffectHKT>(MyEffectProto);
const _flatMap = IOCore.deriveFlatMap<MyEffectHKT>(MyEffectProto);
const _flatTap = IOCore.deriveFlatTap<MyEffectHKT>(MyEffectProto);

const MyEffect = {
  of: IOCore.deriveOf<MyEffectHKT>(MyEffectProto),
  throw: IOCore.deriveThrow<MyEffectHKT>(MyEffectProto),
  sleep: IOCore.deriveSleep<MyEffectHKT>(MyEffectProto),
  never: IOCore.deriveNever<MyEffectHKT>(MyEffectProto),
  println: IOCore.derivePrintln<MyEffectHKT>(MyEffectProto),
  log: IOCore.deriveLog<MyEffectHKT>(MyEffectProto),

  unsafeRunPromise: IOCore.deriveUnsafeRunPromise<MyEffectHKT>(),
  unsafeRunPromiseCancellable: IOCore.deriveUnsafeRunPromiseCancellable<MyEffectHKT>(),
};

const program = MyEffect.sleep(1000)
  .as(42)
  .map((n) => n + 1)
  .flatTap((n) => MyEffect.println("seen", n))
  .flatMap((n) => MyEffect.of(n * 2))
  .map((n) => n - 2);

await MyEffect.unsafeRunPromise(program.flatMap(MyEffect.log));
