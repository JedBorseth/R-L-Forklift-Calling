"use client";
import React from "react";
import { Button } from "~/components/ui/button";
import TalkButton from "~/components/TalkButton";
import useWalkie from "~/hooks/useWalkie";
import Map from "~/components/Map";

export default function Page() {
  const {
    connected,
    connect,
    startTalking,
    stopTalking,
    participants,
    localMuted,
  } = useWalkie();

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Map />
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold">Push to Talk Demo</h1>

        <div className="flex gap-2">
          <Button onClick={connect} disabled={connected}>
            {connected ? "Connected" : "Connect"}
          </Button>
        </div>

        <div>
          <p className="text-sm">Participants:</p>
          <ul className="mt-2">
            {participants.map((p) => (
              <li key={p.id} className="text-sm">
                {p.id} {p.isLocal ? "(you)" : ""}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center">
          <TalkButton
            onStart={startTalking}
            onEnd={stopTalking}
            disabled={!connected}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          {localMuted ? "Currently transmitting" : "Not transmitting"}
        </div>
      </div>
    </main>
  );
}
