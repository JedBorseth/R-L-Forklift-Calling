/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useEffect, useRef, useState } from "react";
import Pusher from "pusher-js";

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY!;
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER!;
const SERVER_TRIGGER_ENDPOINT = "/api/pusher/trigger";

type Participant = {
  id: string;
  name: string;
  isLocal?: boolean;
  speaking?: boolean;
};

type PeerMap = Record<string, RTCPeerConnection>;
type CandidateQueue = Record<string, RTCIceCandidateInit[]>;

Pusher.logToConsole = true;

export default function useWalkie() {
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localMuted, setLocalMuted] = useState(true);

  // clientId will be set to Pusher's myID on subscription_succeeded
  const clientId = useRef<string>("");

  const pusherRef = useRef<Pusher | null>(null);
  const participantsMapRef = useRef<Map<string, Participant>>(new Map());
  const pcMap = useRef<PeerMap>({});
  const candidateQueue = useRef<CandidateQueue>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  // sync map -> state
  const updateParticipantsState = () => {
    setParticipants(Array.from(participantsMapRef.current.values()));
  };

  useEffect(() => {
    return () => {
      // cleanup
      Object.values(pcMap.current).forEach((pc) => {
        try {
          pc.close();
        } catch {}
      });
      pusherRef.current?.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect({ username = "Guest" }: { username?: string } = {}) {
    if (connected) return;

    // get mic (start muted)
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    localStream.getAudioTracks().forEach((t) => (t.enabled = false));
    localStreamRef.current = localStream;
    setLocalMuted(true);

    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: "/api/pusher-auth",
      auth: {
        // server auth handler reads form-encoded body; pusher-js will send params appropriately
        params: { name: username },
      },
    });
    pusherRef.current = pusher;

    const channel = pusher.subscribe("presence-walkie");

    // handle initial membership snapshot
    channel.bind("pusher:subscription_succeeded", (data: any) => {
      // IMPORTANT: use Pusher's ID as our clientId
      clientId.current = data.myID;

      const membersObj = data.members || {};
      const map = new Map<string, Participant>();

      // membersObj is usually an object keyed by user_id
      Object.entries(membersObj).forEach(([userId, infoAny]) => {
        const info = infoAny as any;
        map.set(userId, {
          id: userId,
          name: (info && info.name) || "Guest",
          isLocal: userId === clientId.current,
          speaking: false,
        });
      });

      participantsMapRef.current = map;
      updateParticipantsState();
      setConnected(true);

      // Tell everyone else we joined (trigger server -> pusher to send 'join' to each other member)
      Object.keys(membersObj).forEach((memberId) => {
        if (memberId !== clientId.current) {
          triggerServerEvent("signal", {
            from: clientId.current,
            to: memberId,
            type: "join",
            payload: { id: clientId.current, name: username },
          });
        }
      });
    });

    // keep map updated (no duplicates because it's a Map keyed by id)
    channel.bind("pusher:member_added", (member: any) => {
      participantsMapRef.current.set(member.id, {
        id: member.id,
        name: member.info?.name || "Guest",
        isLocal: member.id === clientId.current,
        speaking: false,
      });
      updateParticipantsState();
    });

    channel.bind("pusher:member_removed", (member: any) => {
      participantsMapRef.current.delete(member.id);
      updateParticipantsState();

      // cleanup peer
      if (pcMap.current[member.id]) {
        try {
          pcMap.current[member.id].close();
        } catch {}
        delete pcMap.current[member.id];
      }
      // remove any queued candidates
      delete candidateQueue.current[member.id];
    });

    // candidate queue held in memory for candidates arriving early
    candidateQueue.current = {};

    // main signaling handler
    channel.bind("signal", async (data: any) => {
      if (!data) return;
      // accept messages either explicitly to us, or to everyone ("*")
      if (data.to !== clientId.current && data.to !== "*") return;

      const { from, type, payload } = data as {
        from: string;
        to: string;
        type: string;
        payload: any;
      };

      // speaking updates (UI-only)
      if (type === "speaking") {
        const pid = payload?.id;
        if (pid) {
          const existing = participantsMapRef.current.get(pid) || {
            id: pid,
            name: "Guest",
          };
          participantsMapRef.current.set(pid, {
            ...existing,
            speaking: !!payload.speaking,
          });
          updateParticipantsState();
        }
        return;
      }

      // leave message (explicit)
      if (type === "leave") {
        const leavingId = payload?.id;
        if (leavingId) {
          participantsMapRef.current.delete(leavingId);
          updateParticipantsState();
          if (pcMap.current[leavingId]) {
            try {
              pcMap.current[leavingId].close();
            } catch {}
            delete pcMap.current[leavingId];
          }
        }
        return;
      }

      // join -> create peer and act as initiator: createOffer -> send offer
      if (type === "join") {
        const remoteId = payload?.id;
        if (!remoteId || remoteId === clientId.current) return;

        // add to participants map
        participantsMapRef.current.set(remoteId, {
          id: remoteId,
          name: payload?.name || "Guest",
          isLocal: false,
          speaking: false,
        });
        updateParticipantsState();

        // create peer and offer
        let pc = pcMap.current[remoteId];
        if (!pc) pc = createPeer(remoteId);

        // only create an offer if we don't already have a localDescription for this pc
        if (!pc.localDescription) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await triggerServerEvent("signal", {
            from: clientId.current,
            to: remoteId,
            type: "offer",
            payload: pc.localDescription,
          });
        }
        return;
      }

      // offer: we are the callee
      if (type === "offer") {
        const remoteId = from;
        let pc = pcMap.current[remoteId];
        if (!pc) pc = createPeer(remoteId);

        await pc.setRemoteDescription(new RTCSessionDescription(payload));

        // flush queued candidates
        if (candidateQueue.current[remoteId]) {
          for (const c of candidateQueue.current[remoteId]) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) {
              console.warn(e);
            }
          }
          delete candidateQueue.current[remoteId];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await triggerServerEvent("signal", {
          from: clientId.current,
          to: remoteId,
          type: "answer",
          payload: pc.localDescription,
        });
        return;
      }

      // answer: set remote description for the offerer
      if (type === "answer") {
        const remoteId = from;
        const pc = pcMap.current[remoteId];
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(payload));

        if (candidateQueue.current[remoteId]) {
          for (const c of candidateQueue.current[remoteId]) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) {
              console.warn(e);
            }
          }
          delete candidateQueue.current[remoteId];
        }
        return;
      }

      // candidate
      if (type === "candidate") {
        const remoteId = from;
        const pc = pcMap.current[remoteId];
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload));
          } catch (e) {
            console.warn("addIceCandidate failed:", e);
          }
        } else {
          if (!candidateQueue.current[remoteId])
            candidateQueue.current[remoteId] = [];
          candidateQueue.current[remoteId].push(payload);
        }
        return;
      }
    });
  }

  function createPeer(remoteId: string) {
    if (pcMap.current[remoteId]) {
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
      // Create audio element for incoming stream
      try {
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.srcObject = ev.streams[0];
        audioEl.dataset.remoteId = remoteId;
        document.body.appendChild(audioEl);
      } catch (e) {
        console.warn("ontrack error", e);
      }
    };

    pc.onconnectionstatechange = () => {
      // optional: cleanup when closed
      if (
        pc.connectionState === "closed" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        try {
          pc.close();
        } catch {}
        delete pcMap.current[remoteId];
      }
    };

    // add local audio tracks (if available)
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((t) => {
          pc.addTrack(t, localStreamRef.current!);
        });
      } catch (e) {
        console.warn("addTrack failed", e);
      }
    }

    pcMap.current[remoteId] = pc;
    return pc;
  }

  async function triggerServerEvent(event: string, payload: any) {
    // send { event, payload } so server can forward to Pusher
    try {
      await fetch(SERVER_TRIGGER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, payload }),
      });
    } catch (e) {
      console.warn("triggerServerEvent failed", e);
    }
  }

  async function startTalking() {
    // ensure mic exists and enabled
    if (!localStreamRef.current) {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    }
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
    setLocalMuted(false);

    // Notify everyone we are speaking
    await triggerServerEvent("signal", {
      from: clientId.current,
      to: "*",
      type: "speaking",
      payload: { id: clientId.current, speaking: true },
    });

    // Make sure peer connections exist for all remote participants.
    // If a peer is missing, create one and send an offer.
    for (const [id, p] of participantsMapRef.current.entries()) {
      if (id === clientId.current) continue;

      let pc = pcMap.current[id];
      if (!pc) {
        pc = createPeer(id);
        // create offer and send
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await triggerServerEvent("signal", {
            from: clientId.current,
            to: id,
            type: "offer",
            payload: pc.localDescription,
          });
        } catch (e) {
          console.warn("createOffer failed for", id, e);
        }
      } else {
        // if pc exists but has no localDescription (we haven't initiated), we can create an offer
        if (!pc.localDescription) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await triggerServerEvent("signal", {
              from: clientId.current,
              to: id,
              type: "offer",
              payload: pc.localDescription,
            });
          } catch (e) {
            console.warn("createOffer failed for existing pc", id, e);
          }
        }
      }
    }
  }

  async function stopTalking() {
    if (localStreamRef.current) {
      localStreamRef.current
        .getAudioTracks()
        .forEach((t) => (t.enabled = false));
    }
    setLocalMuted(true);
    await triggerServerEvent("signal", {
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
