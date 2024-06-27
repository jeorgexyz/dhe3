import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FusionSimulator = () => {
  const [temperature, setTemperature] = useState(0);
  const [selectedReaction, setSelectedReaction] = useState('D-D');
  const [reactionProbability, setReactionProbability] = useState(0);
  const [energyOutput, setEnergyOutput] = useState(0);
  const [cost, setCost] = useState(0);

  const reactions = {
    'D-D': {
      threshold: 100,
      maxEnergy: 3.02,
      neutronProduction: 0.5,
      costFactor: 1.2,
      products: [
        { name: 'Triton (1 MeV)', probability: 0.5 },
        { name: 'Proton (3.02 MeV)', probability: 0.5 },
        { name: 'Helion (0.8 MeV)', probability: 0.5 },
        { name: 'Neutron (2.45 MeV)', probability: 0.5 }
      ]
    },
    'D-T': {
      threshold: 50,
      maxEnergy: 17.6,
      neutronProduction: 1,
      costFactor: 1.5,
      products: [
        { name: 'Alpha (3.5 MeV)', probability: 1 },
        { name: 'Neutron (14.1 MeV)', probability: 1 }
      ]
    },
    'D-He-3': {
      threshold: 200,
      maxEnergy: 18.3,
      neutronProduction: 0.1,
      costFactor: 1.8,
      products: [
        { name: 'Alpha (3.6 MeV)', probability: 1 },
        { name: 'Proton (14.7 MeV)', probability: 1 },
        { name: 'Triton (1 MeV)', probability: 0.1 },
        { name: 'Neutron (2.45 MeV)', probability: 0.1 }
      ]
    }
  };

  useEffect(() => {
    const reaction = reactions[selectedReaction];
    const probabilityFactor = Math.max(0, Math.min(1, (temperature - reaction.threshold) / 100));
    setReactionProbability(probabilityFactor);
    setEnergyOutput(reaction.maxEnergy * probabilityFactor);
    setCost(reaction.costFactor * (1 + reaction.neutronProduction) * temperature / 100);
  }, [temperature, selectedReaction]);

  const handleTemperatureChange = (newValue) => {
    setTemperature(newValue[0]);
  };

  const renderProductList = () => {
    const reaction = reactions[selectedReaction];
    return reaction.products.map((product, index) => (
      <li key={index}>
        {product.name}: {(product.probability * reactionProbability * 100).toFixed(2)}% chance
      </li>
    ));
  };

  const chartData = [
    { name: 'D-D', energy: reactions['D-D'].maxEnergy, cost: reactions['D-D'].costFactor },
    { name: 'D-T', energy: reactions['D-T'].maxEnergy, cost: reactions['D-T'].costFactor },
    { name: 'D-He-3', energy: reactions['D-He-3'].maxEnergy, cost: reactions['D-He-3'].costFactor },
  ];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Fusion Reaction Simulator</h1>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Temperature Control</h2>
        <Slider
          value={[temperature]}
          onValueChange={handleTemperatureChange}
          max={300}
          step={1}
          className="w-full"
        />
        <p>Current Temperature: {temperature} M°C</p>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Select Reaction</h2>
        {Object.keys(reactions).map((reaction) => (
          <Button
            key={reaction}
            onClick={() => setSelectedReaction(reaction)}
            variant={selectedReaction === reaction ? "default" : "outline"}
            className="mr-2 mb-2"
          >
            {reaction}
          </Button>
        ))}
      </div>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Reaction Details: {selectedReaction}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Threshold Temperature: {reactions[selectedReaction].threshold} M°C</p>
          <p>Reaction Probability: {(reactionProbability * 100).toFixed(2)}%</p>
          <p>Energy Output: {energyOutput.toFixed(2)} MeV</p>
          <p>Relative Cost: {cost.toFixed(2)}</p>
          <h3 className="font-semibold mt-2">Products:</h3>
          <ul>{renderProductList()}</ul>
        </CardContent>
      </Card>
      
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Reaction Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="energy" stroke="#8884d8" name="Max Energy (MeV)" />
              <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#82ca9d" name="Relative Cost" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Feasibility Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            {selectedReaction === 'D-D' && "D-D fusion has a lower energy output and requires high temperatures, making it less feasible for commercial operations."}
            {selectedReaction === 'D-T' && "D-T fusion has high energy output but produces energetic neutrons, leading to material degradation and safety concerns. It's currently the most feasible for near-term fusion reactors."}
            {selectedReaction === 'D-He-3' && "D-He-3 fusion requires the highest temperatures but produces charged particles, allowing for direct energy conversion and reduced neutron damage. It's promising for future fusion reactors if engineering challenges can be overcome."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FusionSimulator;