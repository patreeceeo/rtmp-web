/**
 * All possible buttons: keyboard keys, mouse buttons, (common) gamepad buttons
 * Using KeyCode because it maps 1-1 to physical buttons. KeyboardEvent["key"] will depend on whether modifiers are pressed. Will it be confusing if players are using an alternative keyboard layout, since KeyCode does not take layout into consideration? TODO provide a way for users to remap keys in their settings and display a message letting users know.
 */
export enum Button {
  Mouse0 = "Mouse0",
  Mouse1 = "Mouse1",
  Mouse2 = "Mouse2",
  Mouse3 = "Mouse3",
  Mouse4 = "Mouse3",
  // Alphanumeric keys
  "Digit0" = "Digit0",
  "Digit1" = "Digit1",
  "Digit2" = "Digit2",
  "Digit3" = "Digit3",
  "Digit4" = "Digit4",
  "Digit5" = "Digit5",
  "Digit6" = "Digit6",
  "Digit7" = "Digit7",
  "Digit8" = "Digit8",
  "Digit9" = "Digit9",
  "KeyA" = "KeyA",
  "KeyB" = "KeyB",
  "KeyC" = "KeyC",
  "KeyD" = "KeyD",
  "KeyE" = "KeyE",
  "KeyF" = "KeyF",
  "KeyG" = "KeyG",
  "KeyH" = "KeyH",
  "KeyI" = "KeyI",
  "KeyJ" = "KeyJ",
  "KeyK" = "KeyK",
  "KeyL" = "KeyL",
  "KeyM" = "KeyM",
  "KeyN" = "KeyN",
  "KeyO" = "KeyO",
  "KeyP" = "KeyP",
  "KeyQ" = "KeyQ",
  "KeyR" = "KeyR",
  "KeyS" = "KeyS",
  "KeyT" = "KeyT",
  "KeyU" = "KeyU",
  "KeyV" = "KeyV",
  "KeyW" = "KeyW",
  "KeyX" = "KeyX",
  "KeyY" = "KeyY",
  "KeyZ" = "KeyZ",
  "Space" = "Space",

  // Function keys
  "F1" = "F1",
  "F2" = "F2",
  "F3" = "F3",
  "F4" = "F4",
  "F5" = "F5",
  "F6" = "F6",
  "F7" = "F7",
  "F8" = "F8",
  "F9" = "F9",
  "F10" = "F10",
  "F11" = "F11",
  "F12" = "F12",

  // Control keys
  "ShiftLeft" = "ShiftLeft",
  "ShiftRight" = "ShiftRight",
  "ControlLeft" = "ControlLeft",
  "ControlRight" = "ControlRight",
  "AltLeft" = "AltLeft",
  "AltRight" = "AltRight",
  "MetaLeft" = "MetaLeft",
  "MetaRight" = "MetaRight",

  // Navigation keys
  "ArrowUp" = "ArrowUp",
  "ArrowDown" = "ArrowDown",
  "ArrowLeft" = "ArrowLeft",
  "ArrowRight" = "ArrowRight",
  "Home" = "Home",
  "End" = "End",
  "PageUp" = "PageUp",
  "PageDown" = "PageDown",

  // Editing keys
  "Backspace" = "Backspace",
  "Tab" = "Tab",
  "Enter" = "Enter",
  "Escape" = "Escape",
  "Delete" = "Delete",
  "Insert" = "Insert",

  // Miscellaneous keys
  "CapsLock" = "CapsLock",
  "NumLock" = "NumLock",
  "ScrollLock" = "ScrollLock",
}

const mouseButtons = [
  Button.Mouse0,
  Button.Mouse1,
  Button.Mouse2,
  Button.Mouse3,
  Button.Mouse4,
];
export function mouseButton(n: number) {
  return mouseButtons[n];
}
