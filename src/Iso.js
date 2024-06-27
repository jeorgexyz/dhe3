import React, { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const IsotopeVisualization = () => {
  const [currentIsotope, setCurrentIsotope] = useState(0);
  const isotopes = [
    { name: 'Deuterium', symbol: 'D', protons: 1, neutrons: 1, electrons: 1 },
    { name: 'Tritium', symbol: 'T', protons: 1, neutrons: 2, electrons: 1 },
    { name: 'Helium-3', symbol: 'He-3', protons: 2, neutrons: 1, electrons: 2 },
  ];

  const handlePrevious = () => {
    setCurrentIsotope((prev) => (prev === 0 ? isotopes.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIsotope((prev) => (prev === isotopes.length - 1 ? 0 : prev + 1));
  };

  const currentItem = isotopes[currentIsotope];

  return (
    <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">{currentItem.name} ({currentItem.symbol})</h2>
      <div className="relative w-64 h-64 bg-white rounded-full border-4 border-gray-300 mb-4">
        {/* Nucleus */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {[...Array(currentItem.protons)].map((_, i) => (
            <div key={`proton-${i}`} className="absolute w-6 h-6 bg-red-500 rounded-full" style={{
              top: `${Math.sin(i * 2 * Math.PI / currentItem.protons) * 30}px`,
              left: `${Math.cos(i * 2 * Math.PI / currentItem.protons) * 30}px`
            }}></div>
          ))}
          {[...Array(currentItem.neutrons)].map((_, i) => (
            <div key={`neutron-${i}`} className="absolute w-6 h-6 bg-blue-500 rounded-full" style={{
              top: `${Math.sin((i + 0.5) * 2 * Math.PI / currentItem.neutrons) * 15}px`,
              left: `${Math.cos((i + 0.5) * 2 * Math.PI / currentItem.neutrons) * 15}px`
            }}></div>
          ))}
        </div>
        {/* Electrons */}
        {[...Array(currentItem.electrons)].map((_, i) => (
          <div key={`electron-${i}`} className="absolute w-4 h-4 bg-yellow-400 rounded-full" style={{
            top: `${Math.sin(i * 2 * Math.PI / currentItem.electrons) * 120 + 128}px`,
            left: `${Math.cos(i * 2 * Math.PI / currentItem.electrons) * 120 + 128}px`
          }}></div>
        ))}
      </div>
      <div className="flex justify-between w-full">
        <button onClick={handlePrevious} className="bg-blue-500 text-white px-4 py-2 rounded">
          <ArrowLeft size={24} />
        </button>
        <button onClick={handleNext} className="bg-blue-500 text-white px-4 py-2 rounded">
          <ArrowRight size={24} />
        </button>
      </div>
      <div className="mt-4 text-center">
        <p>Protons: {currentItem.protons}</p>
        <p>Neutrons: {currentItem.neutrons}</p>
        <p>Electrons: {currentItem.electrons}</p>
      </div>
    </div>
  );
};

export default IsotopeVisualization;