import React, { useEffect, useState } from 'react';
import { fetchMLMetrics, fetchPredictionAnalytics } from '../services/api';
import { TrafficCharts } from '../components/TrafficCharts';
import { Cpu, Award, Zap } from 'lucide-react';

export const MLAnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [predAnalytics, setPredAnalytics] = useState<any>(null);

  useEffect(() => {
    Promise.all([fetchMLMetrics(), fetchPredictionAnalytics()])
      .then(([m, p]) => {
        setMetrics(m);
        setPredAnalytics(p);
      })
      .catch(console.error);
  }, []);

  const featureImportances = metrics?.feature_importances || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
          <Cpu className="w-6 h-6" />
          <span>Machine Learning Models & Performance Analytics</span>
        </div>
        <p className="text-xs text-slate-400">
          Evaluated on Nagpur Traffic Dataset using chronological train/validation/test splits.
          Benchmarking XGBoost Regressor against Random Forest and Linear Regression baseline.
        </p>
      </div>

      {/* Model Benchmark Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* XGBoost */}
        <div className="bg-slate-900/90 backdrop-blur border-2 border-cyan-500/60 rounded-2xl p-5 shadow-2xl relative overflow-hidden space-y-3">
          <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
            <Award className="w-3 h-3" /> Selected Model
          </div>
          <div>
            <span className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">Primary Regressor</span>
            <h3 className="text-lg font-extrabold text-white mt-0.5">XGBoost Regressor</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">MAE</span>
              <span className="font-bold text-emerald-400">0.0010</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">RMSE</span>
              <span className="font-bold text-emerald-400">0.0026</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">R² Score</span>
              <span className="font-bold text-cyan-300">0.9994</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Gradient boosted decision tree model offering high predictive accuracy and fast inference for dynamic A* route cost recalculation.
          </p>
        </div>

        {/* Random Forest */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Comparison Model</span>
            <h3 className="text-lg font-bold text-slate-200 mt-0.5">Random Forest</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">MAE</span>
              <span className="font-bold text-slate-200">0.0003</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">RMSE</span>
              <span className="font-bold text-slate-200">0.0018</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">R² Score</span>
              <span className="font-bold text-slate-200">0.9997</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Ensemble decision trees benchmark providing high stability across historical Nagpur traffic patterns.
          </p>
        </div>

        {/* Linear Regression */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Baseline Model</span>
            <h3 className="text-lg font-bold text-slate-200 mt-0.5">Linear Regression</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">MAE</span>
              <span className="font-bold text-slate-200">0.0070</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">RMSE</span>
              <span className="font-bold text-slate-200">0.0107</span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] block">R² Score</span>
              <span className="font-bold text-slate-200">0.9893</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Standard linear baseline for evaluating model improvement and feature weight sanity check.
          </p>
        </div>
      </div>

      {/* Feature Importances Section */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>XGBoost Feature Importance Ranking</span>
          </div>
          <span className="text-xs text-slate-400">Nagpur Predictor Weights</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {Object.entries(featureImportances).map(([feat, imp]: [string, any]) => (
            <div key={feat} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-200">{feat}</span>
                <span className="text-cyan-400 font-bold">{(imp * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full"
                  style={{ width: `${Math.min(100, imp * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recharts Analytics Graphs */}
      <TrafficCharts predictionAnalytics={predAnalytics} />
    </div>
  );
};
