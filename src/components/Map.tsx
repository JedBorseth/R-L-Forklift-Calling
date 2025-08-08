import React from "react";

const Map = () => {
  return (
    <div className="absolute  top-4 right-4">
      Map
      <div className="border-2 w-48 h-48 flex">
        <div className="w-1/2 flex justify-center m-2 bg-gray-200/25 flex-col text-center gap-1 relative">
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
