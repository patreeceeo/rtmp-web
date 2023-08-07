import * as asserts from "asserts";
import * as Event from "./Event.ts";

Deno.test("Event", () => {
  const EVENT_TYPE = Event.registerEventType();

  asserts.assert(Event.isRegisteredEventType(EVENT_TYPE));
  asserts.assertFalse(Event.isRegisteredEventType(EVENT_TYPE + 1));

  let wasCalled = 0;
  const handler = () => {
    wasCalled++;
  };

  Event.addEventHandler(EVENT_TYPE, handler);
  Event.addEventHandler(EVENT_TYPE, handler);
  asserts.assertFalse(wasCalled);

  Event.executeEventHandlers({ type: EVENT_TYPE, data: null });
  asserts.assertEquals(wasCalled, 1);

  wasCalled = 0;
  Event.removeEventHandler(EVENT_TYPE, handler);

  Event.executeEventHandlers({ type: EVENT_TYPE, data: null });
  asserts.assertFalse(wasCalled);

  Event.unregisterEventType(EVENT_TYPE);
  asserts.assertThrows(() => Event.addEventHandler(EVENT_TYPE, handler));
});
