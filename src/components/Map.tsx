import React from "react";

const Map = ({ currentMachine }: { currentMachine: string }) => {
  const machineAsTitle = currentMachine
    ? currentMachine.charAt(0).toUpperCase() + currentMachine.slice(1)
    : "No Machine Selected";
  return (
    <div className="">
      <h1 className="text-2xl font-bold w-full text-center">
        You Are:{" "}
        <span className="underline">
          {machineAsTitle || "No Machine Selected"}
        </span>
      </h1>
      <div className="border-2 aspect-square flex">
        <div className="w-1/2 flex justify-evenly m-2 bg-gray-200/25 flex-col text-center gap-1 relative">
          <span>Rotary</span>
          <span>Slitter</span>
          <span className="animate-caret-blink">Guillotine</span>
          <span>AOPACK</span>
          <span>Langston</span>
        </div>
        <div className="w-1/2 flex justify-center m-2 bg-gray-200/25 relative">
          <span>Office</span>
          <span className="absolute bottom-10">Jumbo</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">
        Currently the machine location features are not implemented and the push
        to talk is the only thing working -jed
      </p>
    </div>
  );
};

export default Map;
