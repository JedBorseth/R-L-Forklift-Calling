"use client";
import React from "react";

export default function TalkButton({
  onStart,
  onEnd,
  disabled,
}: {
  onStart: () => void;
  onEnd: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => {
        if (!disabled) onStart();
      }}
      onMouseUp={(e) => {
        if (!disabled) onEnd();
      }}
      onMouseLeave={(e) => {
        if (!disabled) onEnd();
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        if (!disabled) onStart();
      }}
      onTouchEnd={(e) => {
        if (!disabled) onEnd();
      }}
      disabled={disabled}
      className="rounded-full w-40 h-40 flex items-center justify-center text-lg font-semibold shadow-md bg-blue-600 text-white active:scale-95"
    >
      Hold to Talk
    </button>
  );
}
