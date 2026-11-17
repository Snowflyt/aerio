# Cede scheduling policy proposal

Status: proposed; this document and its Node-host tests do not change the runtime or resolve the existing batching-test failures.

## Proposed contract

`IO.cede()` suspends the current fiber and schedules its continuation through a host macrotask boundary. Automatic operation-budget yielding uses the same boundary. This lets other host work progress; it does not preempt a synchronous callback or impose a wall-clock latency bound.

For `DefaultScheduler`, normal ready work has FIFO order within its queue and a bounded drain budget. Ceded work currently goes directly to host dispatch instead of being promoted into that ready queue. Do not promise a total FIFO order across ordinary work, ceded work, independent scheduler instances, or unrelated host queues. Host dispatch mechanisms may batch callbacks internally, so one ceded task does not necessarily mean one physical host message on every runtime.

The proposal retains the existing direct-dispatch policy. A unified promotion queue would be a separate scheduling design change, not a prerequisite for implementing `cede`. It would change observable interleavings and must be evaluated for host fairness, cancellation, exception handling, and runtime compatibility before adoption.

## Existing tests awaiting a decision

Keep the following tests unchanged and failing where they fail today while this proposal is under review. Do not skip, delete, weaken, or mark them as expected failures to obtain a passing suite.

| Existing batching test                                               | Extra assumption                                                                                  | Proposed disposition after accepting this policy                                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `owns reentrant scheduling until drain exit (cede=true)`             | A directly ceded callback owns a normal ready drain.                                              | Retain the ordinary-drain case; replace the ceded case with an exactly-once reentrant completion check without requiring one particular internal queue. |
| `schedules reentrant work once even when its producer throws`        | Ready and ceded work share a single rescheduled host callback and a particular cross-queue order. | Preserve error identity and exactly-once completion checks; stop requiring consolidated host-callback count or cross-queue order.                       |
| `promotes ceded work behind an unconsumed ready suffix`              | Ready and ceded work enter a shared total order and bounded number of combined drains.            | Check FIFO and batch bounds for normal work independently, plus eventual exactly-once completion of ceded work.                                         |
| `keeps promoted work ahead of reentrant tasks across partial drains` | All ceded callbacks form one bounded ready queue.                                                 | Replace with ceded host progress and no-loss checks, including work enqueued by a callback.                                                             |

These are future test changes, not part of this candidate. If the project instead chooses unified promotion, preserve the original expectations and implement that policy in a separately reviewed runtime change.

## Validation scope

`test/cede-host.test.ts` exercises the real Node host rather than a mocked scheduler: a prequeued `setImmediate` runs before an `IO.cede()` continuation, repeated cedes permit a new host checkpoint, and mixed normal/ceded callbacks complete once. There are no elapsed-time assertions. These tests intentionally describe the Node dispatch path, not a cross-runtime total-order guarantee.

Changing ceded dispatch to a microtask is a negative control: both host-progress tests must fail. A positive result on Node is not evidence for browser MessageChannel, timer fallback, QuickJS, or worker-lifetime behavior. Those paths remain separate compatibility work.
