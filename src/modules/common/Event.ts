import { incrementId } from "~/common/functions/id.ts";
import { invariant } from "~/common/Error.ts";

export type Event<Data> = {
  type: number;
  data: Data;
};
export type EventHandler<Data> = (event: Event<Data>) => void;

const _eventTypes = new Set<number>();
// deno-lint-ignore no-explicit-any
const _eventHandlers: Array<Set<EventHandler<any>>> = [];

export function registerEventType(eventType = incrementId("eventType")) {
  invariant(
    !isRegisteredEventType(eventType),
    `Event type ${eventType} is already registered`,
  );
  _eventTypes.add(eventType);
  return eventType;
}

export function isRegisteredEventType(eventType: number) {
  return _eventTypes.has(eventType);
}

export function unregisterEventType(eventType: number) {
  _eventTypes.delete(eventType);
}

export function unregisterAllEventTypes() {
  _eventTypes.clear();
}

export function addEventHandler<Data>(
  eventType: number,
  handler: EventHandler<Data>,
): void {
  invariant(
    isRegisteredEventType(eventType),
    `Event type ${eventType} is not registered`,
  );
  const handlers = _eventHandlers[eventType] || new Set();
  handlers.add(handler);
  _eventHandlers[eventType] = handlers;
}

// deno-lint-ignore no-explicit-any
export function removeEventHandler(
  eventType: number,
  handler: EventHandler<any>,
) {
  invariant(
    isRegisteredEventType(eventType),
    `Event type ${eventType} is not registered`,
  );
  invariant(
    _eventHandlers[eventType].has(handler),
    `${handler.name} is not a handler for event type ${eventType}`,
  );
  const handlers = _eventHandlers[eventType] || [];
  handlers.delete(handler);
}

export function executeEventHandlers<Data>(event: Event<Data>) {
  invariant(
    isRegisteredEventType(event.type),
    `Event type ${event.type} is not registered`,
  );
  const handlers = _eventHandlers[event.type] || [];
  for (const handler of handlers) {
    handler(event);
  }
}
