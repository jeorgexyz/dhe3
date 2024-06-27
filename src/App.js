import React, { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DHe3FusionSimulator = () => {
  const [temperature, setTemperature] = useState(50);
  const [confinement, setConfinement] = useState(50);
  const [density, setDensity] = useState(50);
  const [energy, setEnergy] = useState(0);
  const [isReacting, setIsReacting] = useState(false);
  const [time, setTime] = useState(0);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    let interval;
    if (isReacting) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
        setEnergy((prevEnergy) => {
          const fusionRate = calculateFusionRate(temperature, density);
          const confinementLoss = calculateConfinementLoss(prevEnergy, confinement);
          const bremstrahlungLoss = calculateBremstrahlungLoss(temperature, density);
          
          const newEnergy = prevEnergy + fusionRate - confinementLoss - bremstrahlungLoss;
          return Math.max(0, Math.min(newEnergy, 100));
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isReacting, temperature, confinement, density]);

  useEffect(() => {
    if (isReacting) {
      setChartData(prevData => [...prevData, { time, energy }].slice(-10));
    }
  }, [time, energy, isReacting]);

  const calculateFusionRate = (temp, dens) => {
    // Simplified fusion rate calculation
    return (temp / 100) * (dens / 100) * 0.5;
  };

  const calculateConfinementLoss = (energy, conf) => {
    // Simplified confinement loss calculation
    return energy * (1 - conf / 100) * 0.1;
  };

  const calculateBremstrahlungLoss = (temp, dens) => {
    // Simplified bremsstrahlung radiation loss calculation
    return (temp / 100) * Math.pow(dens / 100, 2) * 0.05;
  };

  const handleStartReaction = () => {
    setIsReacting(true);
    setEnergy(0);
    setTime(0);
    setChartData([]);
  };

  const handleStopReaction = () => {
    setIsReacting(false);
  };

  const handleReset = () => {
    setIsReacting(false);
    setEnergy(0);
    setTime(0);
    setChartData([]);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Enhanced D-He-3 Fusion Simulator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Temperature (million °C)</label>
            <Slider
              value={[temperature]}
              onValueChange={(value) => setTemperature(value[0])}
              max={100}
              step={1}
            />
            <span className="text-sm text-gray-500">{temperature} million °C</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Plasma Confinement</label>
            <Slider
              value={[confinement]}
              onValueChange={(value) => setConfinement(value[0])}
              max={100}
              step={1}
            />
            <span className="text-sm text-gray-500">{confinement}%</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Particle Density</label>
            <Slider
              value={[density]}
              onValueChange={(value) => setDensity(value[0])}
              max={100}
              step={1}
            />
            <span className="text-sm text-gray-500">{density}%</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Energy Output</label>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${energy}%` }}
              ></div>
            </div>
            <span className="text-sm text-gray-500">{energy.toFixed(2)} MeV</span>
          </div>
          <div className="flex justify-center space-x-2">
            {!isReacting ? (
              <Button onClick={handleStartReaction}>Start Reaction</Button>
            ) : (
              <Button onClick={handleStopReaction} variant="secondary">Stop Reaction</Button>
            )}
            <Button onClick={handleReset} variant="outline">Reset</Button>
          </div>
          <div className="text-center">
            <p className="text-sm">D + <sup>3</sup>He <ArrowRight className="inline" /> <sup>4</sup>He + p + 18.3 MeV</p>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Energy (MeV)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="energy" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DHe3FusionSimulator;