import { create } from 'zustand';

export const useSensorStore = create((set) => ({
  sensorData: null,
  analysis: null,
  alerts: [],
  setSensorData: (data) => set({ sensorData: data }),
  setAnalysis: (data) => set({ analysis: data }),
  setAlerts: (alerts) => set({ alerts }),
}));