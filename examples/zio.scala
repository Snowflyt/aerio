//> using scala "3.8.2"
//> using dep "dev.zio::zio:2.1.24"

import zio.Console
import zio.Runtime
import zio.Unsafe
import zio.ZIO
import zio.durationInt

object MyApp {
  def main(args: Array[String]): Unit = {
    val program = ZIO.collectAllPar(
      List(
        ZIO.succeed("A").delay(1.second).tap(Console.printLine(_)),
        ZIO.succeed("B").delay(2.seconds).tap(Console.printLine(_)),
        ZIO.interrupt
      )
    )

    Unsafe.unsafely {
      val fiber =
        Runtime.default.unsafe.run(program.forkDaemon).getOrThrowFiberFailure()
      val exit =
        Runtime.default.unsafe.run(fiber.await).getOrThrowFiberFailure()
      println(s"Outcome: $exit")
    }
  }
}
