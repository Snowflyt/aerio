//> using scala "3.8.3"
//> using dep "dev.zio::zio:2.1.25"

import zio.Console
import zio.Random
import zio.Runtime
import zio.Schedule
import zio.Unsafe
import zio.ZIO
import zio.durationInt

object MyApp {
  def main(args: Array[String]): Unit = {
    val randomPrint = Random.nextIntBounded(100).flatMap(
      n => Console.printLine("Hello, world")
    )

    val program = randomPrint
      .schedule(Schedule.fixed(1.second) && Schedule.recurs(3))
      .flatMap((r) => Console.printLine(s"Schedule result: $r"))

    Unsafe.unsafely {
      Runtime.default.unsafe.run(program).getOrThrowFiberFailure()
    }
  }
}
