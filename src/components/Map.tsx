import React from "react";

const Map = () => {
  return (
    <div className="">
      <h1 className="text-2xl font-bold w-full text-center">The Map </h1>
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
    </div>
  );
};

export default Map;
