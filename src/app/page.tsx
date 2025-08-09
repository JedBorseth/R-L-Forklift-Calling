"use client";
import React from "react";
import { Button } from "~/components/ui/button";
import TalkButton from "~/components/TalkButton";
import useWalkie from "~/hooks/useWalkie";
import Map from "~/components/Map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
import { Menu } from "lucide-react";

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
    <main className="min-h-screen flex justify-center">
      <Tabs defaultValue="main" className="w-96">
        <TabsList className="grid w-full grid-cols-2 mt-2">
          <TabsTrigger value="main">Home</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>
        <TabsContent value="main">
          <div className="w-full max-w-md space-y-6">
            <h1 className="text-2xl font-bold w-full text-center">
              Push to Talk Demo
            </h1>

            <div className="flex gap-2 justify-center">
              <Button onClick={connect} disabled={connected}>
                {connected ? "Connected" : "Connect Mic"}
              </Button>
            </div>
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="request">Request Material</Label>
              <Input type="request" id="request" placeholder="10x20 32C etc." />
            </div>
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
        <TabsContent value="map">
          <Map currentMachine="Guillotine" />
        </TabsContent>
      </Tabs>

      <Drawer>
        <DrawerTrigger className="absolute text-center bottom-4" asChild>
          <Button variant="outline" className="w-40">
            <Menu />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit Your Current Machine</DrawerTitle>
            <DrawerDescription>
              Change your machine that you will be requesting material to
            </DrawerDescription>
          </DrawerHeader>
          <ul className="grid grid-cols-2 gap-2 p-5 place-items-center">
            <li>
              <Button variant="outline">Rotary</Button>
            </li>
            <li>
              <Button variant="outline">Slitter</Button>
            </li>
            <li>
              <Button variant="outline">AOPACK</Button>
            </li>
            <li>
              <Button variant="outline">Hand Fed Die Cut</Button>
            </li>
            <li>
              <Button variant="outline">Guillotine</Button>
            </li>
            <li>
              <Button variant="outline">Langston</Button>
            </li>
            <li>
              <Button variant="outline">Assembly</Button>
            </li>
          </ul>
          <div className="flex items-center justify-center gap-3 flex-col">
            <Label htmlFor="name">Enter Name</Label>
            <Input id="name" placeholder="John Doe" className="w-2/3" />
          </div>
          <DrawerFooter>
            <Button>Submit</Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </main>
  );
}
