/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import { v4 as uuidv4 } from "uuid";

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY!;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER!;
const SERVER_TRIGGER_ENDPOINT = "/api/pusher/trigger";

type PeerMap = Record<string, RTCPeerConnection>;
Pusher.logToConsole = true; // Enable Pusher logging for debugging
export default function useWalkie() {
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<
    Array<{ id: string; name: string; isLocal?: boolean }>
  >([]);
  const [localMuted, setLocalMuted] = useState(false);

  const clientId = useRef<string>(uuidv4());
  const pusherRef = useRef<Pusher | null>(null);
  const pcMap = useRef<PeerMap>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      Object.values(pcMap.current).forEach((pc) => pc.close());
      pusherRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function connect({ username = "Guest" }: { username?: string } = {}) {
    if (connected) return;
    console.log("username", username);
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    localStream.getAudioTracks().forEach((t) => (t.enabled = false));
    localStreamRef.current = localStream;

    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: "/api/pusher-auth",
      auth: {
        headers: { "Content-Type": "application/json" },
      },
    });
    pusherRef.current = pusher;

    const channel = pusher.subscribe("presence-walkie");
    type PusherDataType = {
      members: {
        [id: string]: {
          name: string;
        };
      };
      count: number;
      myID: string;
      me: {
        id: string;
        info: {
          name: string;
        };
      };
    };
    type PusherMemberType = {
      id: string;
      info: {
        name: string;
      };
    };

    channel.bind("pusher:subscription_succeeded", (data: PusherDataType) => {
      const membersObj = data.members;

      const memberList = Object.entries(membersObj).map(
        ([user_id, user_info]: [string, any]) => ({
          id: user_id,
          name: username || "Guest",
          isLocal: user_id === clientId.current,
        })
      );

      setParticipants(memberList);
      setConnected(true);

      triggerServerEvent("signal", {
        from: clientId.current,
        to: "*",
        type: "join",
        payload: {
          id: clientId.current,
          name: username,
        },
      });
    });

    channel.bind("pusher:member_added", (member: PusherMemberType) => {
      setParticipants((prev) => [
        ...prev,
        { id: member.id, name: member.info?.name || "Guest" },
      ]);
    });

    channel.bind("pusher:member_removed", (member: PusherMemberType) => {
      console.log("Member removed:", member);
      setParticipants((prev) => prev.filter((p) => p.id !== member.id));
    });

    channel.bind(
      "signal",
      async (data: { from: string; to: string; type: string }) => {
        console.log("Received signal:", data);
        if (!data || (data.to !== clientId.current && data.to !== "*")) return;
        const { from, type, payload } = data as {
          from: string;
          to: string;
          type: string;
          payload: any;
        };

        if (type === "offer") {
          let pc = pcMap.current[from];
          if (!pc) pc = createPeer(from);
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await triggerServerEvent("signal", {
            from: clientId.current,
            to: from,
            type: "answer",
            payload: pc.localDescription,
          });
        }

        if (type === "answer") {
          const pc = pcMap.current[from];
          if (pc)
            await pc.setRemoteDescription(new RTCSessionDescription(payload));
        }

        if (type === "candidate") {
          const pc = pcMap.current[from];
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload));
        }

        if (type === "join") {
          const remoteId = payload.id;
          if (remoteId === clientId.current) return;

          if (!participants.find((p) => p.id === remoteId)) {
            setParticipants((prev) => [
              ...prev,
              { id: remoteId, name: payload.name || "Guest" },
            ]);
          }

          let pc = pcMap.current[remoteId];
          if (!pc) {
            pc = createPeer(remoteId);
          }
          // createOffer and rest as before
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await triggerServerEvent("signal", {
            from: clientId.current,
            to: remoteId,
            type: "offer",
            payload: pc.localDescription,
          });
        }

        if (type === "leave") {
          const leavingId = payload.id;
          if (pcMap.current[leavingId]) {
            pcMap.current[leavingId].close();
            delete pcMap.current[leavingId];
          }
          setParticipants((prev) => prev.filter((p) => p.id !== leavingId));
        }
      }
    );
  }
  function createPeer(remoteId: string) {
    if (pcMap.current[remoteId]) {
      // Peer already exists, don't create or add tracks again
      return pcMap.current[remoteId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        triggerServerEvent("signal", {
          from: clientId.current,
          to: remoteId,
          type: "candidate",
          payload: ev.candidate,
        });
      }
    };

    pc.ontrack = (ev) => {
      console.log("ontrack fired for peer:", remoteId);
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.srcObject = ev.streams[0];
      document.body.appendChild(audioEl);
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        console.log("Adding track to peer:", t);
        pc.addTrack(t, localStreamRef.current!);
      });
    }

    pcMap.current[remoteId] = pc;
    return pc;
  }

  async function triggerServerEvent(event: string, payload: any) {
    await fetch(SERVER_TRIGGER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload }),
    });
  }

  function startTalking() {
    console.log(pcMap.current, "pcMap before talking");
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = true));
    setLocalMuted(true);
    triggerServerEvent("signal", {
      from: clientId.current,
      to: "*",
      type: "speaking",
      payload: { id: clientId.current, speaking: true },
    });
  }

  function stopTalking() {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = false));
    setLocalMuted(false);
    triggerServerEvent("signal", {
      from: clientId.current,
      to: "*",
      type: "speaking",
      payload: { id: clientId.current, speaking: false },
    });
  }

  return {
    connected,
    connect,
    startTalking,
    stopTalking,
    participants,
    localMuted,
  };
}
