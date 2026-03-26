//> using scala "2.13.18"
//> using dep "org.typelevel::cats-effect:2.5.5"

import cats.effect.ContextShift
import cats.effect.IO
import cats.effect.Timer

import scala.concurrent.ExecutionContext
import scala.concurrent.duration._

object MyApp {
  implicit val ec: ExecutionContext = ExecutionContext.global
  implicit val cs: ContextShift[IO] = IO.contextShift(ec)
  implicit val timer: Timer[IO] = IO.timer(ec)

  def main(args: Array[String]): Unit = {
    IO(println("Hello, world")).unsafeRunSync()

    val fiber1 = IO.sleep(1.seconds).start.unsafeRunSync()
    fiber1.join.unsafeRunSync()
    println("Fiber 1 completed")

    val fiber2 = IO.sleep(1.seconds).start.unsafeRunSync()
    fiber2.cancel.unsafeRunSync()
    println("Fiber 2 cancelled")
    fiber2.join.unsafeRunSync()
    println("Fiber 2 joined after cancellation")
  }
}
