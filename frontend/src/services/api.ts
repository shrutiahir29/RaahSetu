import axios from 'axios';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchCurrentTraffic = async () => {
  const res = await api.get('/traffic/current');
  return res.data;
};

export const fetchTrafficSegments = async () => {
  const res = await api.get('/traffic/segments');
  return res.data;
};

export const fetchTrafficHotspots = async () => {
  const res = await api.get('/traffic/hotspots');
  return res.data;
};

export const findRoute = async (payload: { from_location: string; to_location: string }) => {
  const res = await api.post('/routes/find', payload);
  return res.data;
};

export const fetchIncidents = async () => {
  const res = await api.get('/incidents');
  return res.data;
};

export const createIncident = async (payload: { segment_id: string; title: string; type: string; severity: number; description: string }) => {
  const res = await api.post('/incidents', payload);
  return res.data;
};

export const updateIncident = async (id: number, payload: any) => {
  const res = await api.patch(`/incidents/${id}`, payload);
  return res.data;
};

export const deleteIncident = async (id: number) => {
  const res = await api.delete(`/incidents/${id}`);
  return res.data;
};

export const fetchCurrentWeather = async () => {
  const res = await api.get('/weather/current');
  return res.data;
};

export const fetchAlerts = async () => {
  const res = await api.get('/alerts');
  return res.data;
};

export const fetchDashboardOverview = async () => {
  const res = await api.get('/dashboard/overview');
  return res.data;
};

export const fetchTrafficAnalytics = async () => {
  const res = await api.get('/analytics/traffic');
  return res.data;
};

export const fetchPredictionAnalytics = async () => {
  const res = await api.get('/analytics/predictions');
  return res.data;
};

export const fetchMLMetrics = async () => {
  const res = await api.get('/ml/metrics');
  return res.data;
};

export const triggerMLRetrain = async () => {
  const res = await api.post('/ml/retrain');
  return res.data;
};

export const submitFeedback = async (payload: { user_email: string; category: string; comment: string; rating: number }) => {
  const res = await api.post('/feedback', payload);
  return res.data;
};

export const fetchSearchHistory = async () => {
  const res = await api.get('/history');
  return res.data;
};

export const fetchTrafficDistribution = async (peak_window: string = 'evening', hour: number = 18) => {
  const res = await api.get(`/simulation/distribution?peak_window=${peak_window}&hour=${hour}`);
  return res.data;
};

export const fetchDiversionPlan = async (peak_window: string = 'evening', hour: number = 18) => {
  const res = await api.get(`/simulation/diversion-plan?peak_window=${peak_window}&hour=${hour}`);
  return res.data;
};

export const fetchSignalRecommendations = async (intersection_id?: string) => {
  const url = intersection_id ? `/simulation/signal-recommendations?intersection_id=${intersection_id}` : '/simulation/signal-recommendations';
  const res = await api.get(url);
  return res.data;
};

export const runWhatIfSimulation = async (payload: {
  from_segment_id: string;
  to_segment_id: string;
  diversion_pct: number;
  time_period: string;
}) => {
  const res = await api.post('/simulation/what-if', payload);
  return res.data;
};

export const fetchSumoComparison = async (diversion_pct: number = 15) => {
  const res = await api.get(`/simulation/sumo-compare?diversion_pct=${diversion_pct}`);
  return res.data;
};

export const runSimulation = async (payload: { peak_window: string; target_hour: number; strategies?: string[] }) => {
  const res = await api.post('/simulation/run', payload);
  return res.data;
};

export const fetchSimulationHistory = async () => {
  const res = await api.get('/simulation/history');
  return res.data;
};
