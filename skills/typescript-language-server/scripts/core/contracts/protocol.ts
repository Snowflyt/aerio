import { isRecord } from "../common.ts";

export interface TsServerResponseMessage {
  seq: number;
  type: "response";
  request_seq: number;
  command: string;
  success: boolean;
  message?: string;
  body?: unknown;
}

export interface TsServerEventMessage {
  seq: number;
  type: "event";
  event: string;
  body?: unknown;
}

export type TsServerMessage = TsServerResponseMessage | TsServerEventMessage;

export interface PendingResponse {
  resolve: (message: TsServerResponseMessage) => void;
  reject: (error: Error) => void;
  timeoutHandle: NodeJS.Timeout;
}

export interface PendingEventRequest {
  command: string;
  requestSeq: number;
  resolve: (message: TsServerRequestCompletedEventMessage) => void;
  reject: (error: Error) => void;
  timeoutHandle: NodeJS.Timeout;
}

export interface TsServerRequestCompletedEventMessage extends TsServerEventMessage {
  event: "requestCompleted";
  body: {
    request_seq: number;
  };
}

export function isTsServerResponseMessage(value: unknown): value is TsServerResponseMessage {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.type === "response" &&
    typeof value.seq === "number" &&
    typeof value.request_seq === "number" &&
    typeof value.command === "string" &&
    typeof value.success === "boolean"
  );
}

export function isTsServerEventMessage(value: unknown): value is TsServerEventMessage {
  if (!isRecord(value)) {
    return false;
  }
  return value.type === "event" && typeof value.seq === "number" && typeof value.event === "string";
}

export function isTsServerRequestCompletedEventMessage(
  value: unknown,
): value is TsServerRequestCompletedEventMessage {
  if (
    !isTsServerEventMessage(value) ||
    value.event !== "requestCompleted" ||
    !isRecord(value.body)
  ) {
    return false;
  }
  return typeof value.body.request_seq === "number";
}
