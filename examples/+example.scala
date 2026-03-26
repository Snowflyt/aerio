//> using scala "3.8.2"
//> using dep "org.typelevel::cats-effect:3.7.0"

import cats.effect.IO
import cats.effect.unsafe.implicits.global

import scala.concurrent.duration.*

case class FileHandle(readLine: () => IO[String], close: () => IO[Unit])

def acquireResource(): IO[FileHandle] = {
  IO.println("Acquiring resource...") *>
    IO.sleep(1.second) *>
    IO.println("Resource acquired") *>
    IO.pure(
      FileHandle(
        readLine = () => IO.sleep(2.seconds) *> IO.pure("line"),
        close = () => IO.println("File closed")
      )
    )
}

def releaseResource(handle: FileHandle): IO[Unit] = {
  IO.println("Releasing resource...") *>
    IO.sleep(1.second) *>
    handle.close()
}

val program: IO[Unit] = IO.uncancelable { poll =>
  for {
    handle <- acquireResource()
    _ <- poll(handle.readLine().flatMap(IO.println))
      .onCancel(releaseResource(handle))
    _ <- releaseResource(handle)
  } yield ()
}

def run(): Unit = {
  val fiber = program.start.unsafeRunSync()
  // Cancel the operation after 1 second
  // Thread.sleep(1000)
  // fiber.cancel.unsafeRunSync()
  // Wait for the fiber to complete
  fiber.join.unsafeRunSync()
}

val program2 = (
  IO.sleep(1.second).as("A").flatTap(IO.println),
  IO.sleep(2.seconds).as("B").flatTap(IO.println),
  IO.canceled
).parTupled

@main def run2(): Unit = {
  val fiber = program2.start.unsafeRunSync()
  val outcome = fiber.join.unsafeRunSync()
  println(s"Outcome: $outcome")
}
