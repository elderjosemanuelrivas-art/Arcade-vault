export type TouchAction = { code: string; label: string };

export type TouchScheme = {
  dpad: Partial<Record<"up" | "down" | "left" | "right", TouchAction>>;
  actions: TouchAction[];
};

export const TOUCH_CONTROLS: Partial<Record<string, TouchScheme>> = {
  rocas: {
    dpad: {
      left: { code: "ArrowLeft", label: "◀" },
      right: { code: "ArrowRight", label: "▶" },
      up: { code: "ArrowUp", label: "▲" },
    },
    actions: [{ code: "Space", label: "DISPARAR" }],
  },
  tetris: {
    dpad: {
      left: { code: "ArrowLeft", label: "◀" },
      right: { code: "ArrowRight", label: "▶" },
      down: { code: "ArrowDown", label: "BAJAR" },
    },
    actions: [{ code: "ArrowUp", label: "GIRAR" }],
  },
  arkanoid: {
    dpad: {
      left: { code: "ArrowLeft", label: "◀" },
      right: { code: "ArrowRight", label: "▶" },
    },
    actions: [],
  },
  serpentina: {
    dpad: {
      up: { code: "ArrowUp", label: "▲" },
      down: { code: "ArrowDown", label: "▼" },
      left: { code: "ArrowLeft", label: "◀" },
      right: { code: "ArrowRight", label: "▶" },
    },
    actions: [],
  },
};
