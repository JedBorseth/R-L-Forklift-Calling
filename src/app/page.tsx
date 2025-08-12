"use client";
import React, { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import TalkButton from "~/components/TalkButton";
import useWalkie from "~/hooks/useWalkie";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { BoxIcon, Check, Menu, Send } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "~/components/ui/badge";
import Pusher from "pusher-js";

export default function Page() {
  const [machine, setMachine] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const {
    connected,
    connect,
    startTalking,
    stopTalking,
    participants,
    localMuted,
  } = useWalkie();

  const saveToLocalStorage = (key: string, value: string) => {
    localStorage.setItem(key, value);
  };

  const getFromLocalStorage = (key: string): string | null => {
    return localStorage.getItem(key);
  };
  useEffect(() => {
    const value = getFromLocalStorage("machine");
    const username = getFromLocalStorage("name");
    if (username !== null) {
      setUsername(username);
    }
    if (value !== null) {
      setMachine(value);
    }
  }, []);

  const handleSave = (key: string, value: string) => {
    saveToLocalStorage(key, value);
    setMachine(value);
  };
  type ItemType = {
    dateAdded: string;
    id: number;
    machine: string;
    request: string;
    username: string;
  };
  const [items, setItems] = useState([] as ItemType[]);
  useEffect(() => {
    const loadData = async () => {
      const res = await fetch("/api/requests"); // make sure this matches your route
      const data = await res.json();
      setItems(data);
    };

    loadData();
  }, []);

  const deleteItem = async (id: number) => {
    try {
      const res = await fetch("/api/requests", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: id }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete request");
      }

      setItems((prev) => prev.filter((i) => i.id !== id));
      const audio = new Audio("/ding.mp3");
      audio.volume = 0.5; // Adjust volume as needed
      audio.play().catch((err) => console.error("Audio playback failed:", err));
    } catch (err) {
      console.error("Error deleting request:", err);
      alert("Failed to delete request");
    }
  };
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe("requests");

    channel.bind("new-request", (data: ItemType) => {
      setItems((prev) => [data, ...prev]); // prepend new item
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [setItems]);
  console.log(participants, "participants");
  return (
    <>
      {connected ? (
        <div className="min-h-screen flex flex-col justify-center items-center gap-4">
          <Button
            onClick={() => {
              connect({
                username: getFromLocalStorage("name") || "Guest",
              });
            }}
            disabled={connected}
          >
            {connected ? "Connected" : "Join"}
          </Button>
        </div>
      ) : (
        <main className="min-h-screen flex justify-center">
          <Tabs defaultValue="main" className="w-96">
            <TabsList
              className={twMerge(
                `grid w-full mt-2 ${
                  machine === "forklift" ? "grid-cols-3" : "grid-cols-2"
                }`
              )}
            >
              <TabsTrigger value="main">Home</TabsTrigger>
              <TabsTrigger value="online">Currently Online</TabsTrigger>
              {machine === "forklift" ? (
                <TabsTrigger value="requests" className="relative">
                  Material Requests{" "}
                  {items.length > 0 && (
                    <Badge
                      className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums absolute -top-2 -right-4"
                      variant="default"
                    >
                      {items.length}
                    </Badge>
                  )}
                </TabsTrigger>
              ) : null}
            </TabsList>
            <TabsContent value="main">
              <div className="w-full max-w-md space-y-6 flex flex-col justify-around h-full">
                <h1 className="text-2xl font-bold w-full text-center">
                  R&L Radio & Forklift Pager
                </h1>

                {machine === "forklift" ? null : (
                  <form
                    className="grid w-full max-w-sm items-center gap-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const requestInput = form.elements.namedItem(
                        "request"
                      ) as HTMLInputElement;
                      if (requestInput.value.trim() === "") {
                        alert("Please enter a valid request.");
                        return;
                      }
                      const newItem = {
                        dateAdded: null,
                        id: null,
                        machine: machine || "unknown",
                        request: requestInput.value,
                        username: username || "Guest",
                      };
                      try {
                        const res = await fetch("/api/requests", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(newItem),
                        });

                        if (!res.ok) {
                          throw new Error("Failed to add request");
                        }

                        // Optional: re-fetch updated list
                        const updatedItems = await fetch("/api/requests").then(
                          (r) => r.json()
                        );
                        setItems(updatedItems);

                        toast("Request Sent!", {
                          description:
                            "A forklift has been notified and is on its way shortly.",
                          richColors: true,
                        });

                        form.reset();
                      } catch (err) {
                        console.error(err);
                        alert("Something went wrong. Please try again.");
                      }
                    }}
                  >
                    <Label htmlFor="request">Request Material</Label>
                    <div className="flex">
                      <Input
                        type="request"
                        id="request"
                        placeholder="10x20 32C etc."
                      />
                      <Button type="submit" variant="outline">
                        <Send />
                      </Button>
                    </div>
                  </form>
                )}

                <div className="flex justify-center">
                  <TalkButton
                    onStart={startTalking}
                    onEnd={stopTalking}
                    disabled={!connected}
                  />
                </div>

                <div className="text-xs text-muted-foreground justify-end flex">
                  {localMuted ? "Mic Active" : "Mic is muted"}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="online">
              <div className="mt-10">
                <p className="text-sm">Participants:</p>
                <ul className="mt-2">
                  {participants.map((p) => (
                    <li key={p.id} className="text-sm">
                      {p.name} {p.isLocal ? "(you)" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="requests">
              <div className="flex flex-col items-center justify-center gap-4 mt-6">
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }} // Prevent vertical drag
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -100) {
                          // Swipe left past 100px → remove

                          deleteItem(item.id);
                        } else {
                          // Snap back if not far enough
                        }
                      }}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -150 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                      className="cursor-pointer select-none"
                    >
                      <Alert className="relative pb-12 min-w-[80vw] min-h-24">
                        <BoxIcon />
                        <AlertTitle>
                          Material Request from{" "}
                          {item.machine.charAt(0).toUpperCase() +
                            item.machine.slice(1)}
                        </AlertTitle>
                        <AlertDescription className="">
                          {item.request}
                        </AlertDescription>
                        <Button
                          className="absolute bottom-1 right-1 hover:bg-green-100"
                          variant="outline"
                          onClick={() => {
                            deleteItem(item.id);
                          }}
                        >
                          <Check />
                        </Button>
                      </Alert>
                    </motion.div>
                  ))}
                  {items.length === 0 && <h1>No Machine Material Requests</h1>}
                </AnimatePresence>
              </div>
            </TabsContent>
          </Tabs>

          <Drawer>
            <DrawerTrigger className="absolute text-center bottom-4" asChild>
              <Button variant="outline" className="w-40">
                <Menu />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="">
              <DrawerHeader>
                <DrawerTitle>Edit Your Current Machine</DrawerTitle>
                <DrawerDescription>
                  Change your machine that you will be requesting material to
                </DrawerDescription>
              </DrawerHeader>
              <ul className="grid grid-cols-3 gap-2 p-5 place-items-center">
                <li>
                  <Button
                    variant={machine === "rotary" ? "default" : "outline"}
                    onClick={() => {
                      handleSave("machine", "rotary");
                    }}
                  >
                    Rotary
                  </Button>
                </li>
                <li>
                  <Button
                    variant={machine === "slitter" ? "default" : "outline"}
                    onClick={() => {
                      handleSave("machine", "slitter");
                    }}
                  >
                    Slitter
                  </Button>
                </li>
                <li>
                  <Button
                    variant={machine === "aopack" ? "default" : "outline"}
                    onClick={() => {
                      handleSave("machine", "aopack");
                    }}
                  >
                    AOPACK
                  </Button>
                </li>
                <li>
                  <Button
                    variant={machine === "diecut" ? "default" : "outline"}
                    onClick={() => {
                      handleSave("machine", "diecut");
                    }}
                  >
                    Hand Fed Die Cut
                  </Button>
                </li>
                <li>
                  <Button
                    variant={machine === "guillotine" ? "default" : "outline"}
                    onClick={() => {
                      handleSave("machine", "guillotine");
                    }}
                  >
                    Guillotine
                  </Button>
                </li>
                <li>
                  <Button
                    variant={machine === "langston" ? "default" : "outline"}
                    onClick={() => {
                      handleSave("machine", "langston");
                    }}
                  >
                    Langston
                  </Button>
                </li>
                <li>
                  <Button
                    variant={machine === "assembly" ? "default" : "outline"}
                    onClick={() => {
                      handleSave("machine", "assembly");
                    }}
                  >
                    Assembly
                  </Button>
                </li>
                <li>
                  <Button
                    variant={machine === "gluing" ? "default" : "outline"}
                    onClick={() => {
                      handleSave("machine", "gluing");
                    }}
                  >
                    Gluing
                  </Button>
                </li>
                <li>
                  <Button
                    variant={machine === "forklift" ? "default" : "outline"}
                    onClick={() => {
                      handleSave("machine", "forklift");
                    }}
                  >
                    Forklift Operator
                  </Button>
                </li>
              </ul>
              <DrawerFooter>
                <form
                  onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const nameInput = form.elements.namedItem(
                      "name"
                    ) as HTMLInputElement;
                    handleSave("name", nameInput.value);
                    window.location.reload();
                  }}
                >
                  <div className="flex items-center justify-center gap-3 flex-col">
                    <Label htmlFor="name">Enter Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      autoComplete="given-name"
                      className="w-2/3 focus:-translate-y-30 md:focus:-translate-y-0"
                      defaultValue={username}
                    />
                  </div>
                  <Button type="submit" className="w-full mt-4">
                    Submit
                  </Button>
                </form>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </main>
      )}{" "}
    </>
  );
}
