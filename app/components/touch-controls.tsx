"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TouchAction, TouchScheme } from "@/lib/games/touch-controls";

// A synthetic keydown only fires once per tap — a held physical key keeps
// firing keydown (no keyup in between) via the OS's own auto-repeat, which is
// what tetris's move-on-keydown handler relies on for continuous movement.
// Mirror that here so holding a touch button behaves the same way.
const REPEAT_DELAY = 180;
const REPEAT_INTERVAL = 50;

function dispatchKey(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
}

function TouchButton({ action, className }: { action: TouchAction; className?: string }) {
  const pressed = useRef(false);
  const delayId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (delayId.current !== null) {
      clearTimeout(delayId.current);
      delayId.current = null;
    }
    if (intervalId.current !== null) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }, []);

  const press = useCallback(() => {
    if (pressed.current) return;
    pressed.current = true;
    dispatchKey("keydown", action.code);
    delayId.current = setTimeout(() => {
      intervalId.current = setInterval(() => dispatchKey("keydown", action.code), REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  }, [action.code]);

  const release = useCallback(() => {
    if (!pressed.current) return;
    pressed.current = false;
    clearTimers();
    dispatchKey("keyup", action.code);
  }, [action.code, clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (pressed.current) {
        pressed.current = false;
        dispatchKey("keyup", action.code);
      }
    };
  }, [action.code, clearTimers]);

  return (
    <button
      type="button"
      className={"touch-btn" + (className ? ` ${className}` : "")}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      aria-label={action.label}
    >
      {action.label}
    </button>
  );
}

export function TouchControls({ scheme }: { scheme: TouchScheme }) {
  const { dpad, actions } = scheme;

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {dpad.up && <TouchButton action={dpad.up} className="dpad-up" />}
        {dpad.left && <TouchButton action={dpad.left} className="dpad-left" />}
        {dpad.right && <TouchButton action={dpad.right} className="dpad-right" />}
        {dpad.down && <TouchButton action={dpad.down} className="dpad-down" />}
      </div>
      {actions.length > 0 && (
        <div className="touch-actions">
          {actions.map((action) => (
            <TouchButton key={action.code} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
