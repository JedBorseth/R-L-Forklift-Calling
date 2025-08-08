"use client";
import React from "react";
import { Button } from "./ui/button";
import { Mic } from "lucide-react";

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
    <Button
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
      className="rounded-full select-none w-32 h-32 active:bg-red-500 active:scale-95 transition-transform duration-100 ease-in-out active:outline-none active:ring-2 active:ring-offset-2 active:ring-gray-500"
    >
      <Mic className="text-2xl" />
    </Button>
  );
}
