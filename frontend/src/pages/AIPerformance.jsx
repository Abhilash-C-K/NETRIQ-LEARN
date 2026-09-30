import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Cpu, Zap, Activity, CheckCircle2 } from 'lucide-react';

export const AIPerformance = () => {
  return (
    <div className="space-y-5 pb-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#19242E] border border-[#2A3944] p-5 rounded-lg shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#E7ECEF] font-sans">
              Model Performance & Architecture
            </h1>
            <p className="text-xs text-[#9AA8B2] font-sans">
              Supervised ensemble metrics, SHAP feature attribution, and Isolation Forest anomaly parameters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-sans text-[#7895B2] bg-[#7895B2]/10 border border-[#7895B2]/30 px-2.5 py-1 rounded-md font-medium">
            Dual-Layer Fusion Active
          </span>
        </div>
      </div>

      {/* Model Cards Grid: Simple, clean, no glowing backgrounds */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Supervised Model */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-5 space-y-2">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-[#9AA8B2] block">
              SUPERVISED MODEL
            </span>
            <p className="text-base font-semibold text-[#E7ECEF] font-sans">
              XGBoost Classifier
            </p>
            <p className="text-xs text-[#9AA8B2] font-sans">
              Trained on CICIDS-2017
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Zero-Day Detector */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-5 space-y-2">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-[#9AA8B2] block">
              ZERO-DAY DETECTOR
            </span>
            <p className="text-base font-semibold text-[#E7ECEF] font-sans">
              Isolation Forest
            </p>
            <p className="text-xs text-[#9AA8B2] font-sans">
              Unsupervised outlier threshold (0.65)
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Model Accuracy (White number, small steel-blue indicator underneath) */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-[#9AA8B2] block">
              MODEL ACCURACY
            </span>
            <p className="text-2xl font-mono font-bold text-[#E7ECEF]">
              99.42%
            </p>
            {/* Small steel-blue indicator underneath */}
            <p className="text-xs text-[#7895B2] font-sans flex items-center gap-1.5 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7895B2]" />
              Test validation dataset
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Attribution Engine */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-5 space-y-2">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-[#9AA8B2] block">
              ATTRIBUTION ENGINE
            </span>
            <p className="text-base font-semibold text-[#E7ECEF] font-sans">
              SHAP TreeExplainer
            </p>
            <p className="text-xs text-[#9AA8B2] font-sans">
              Sub-millisecond feature values
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latency & Telemetry Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-sans font-medium uppercase text-[#9AA8B2]">Hot Path Latency</span>
              <p className="text-xl font-mono font-semibold text-[#E7ECEF] mt-1">11.4 ms</p>
              <p className="text-xs text-[#9AA8B2] font-sans mt-0.5">Packet ingestion to decision</p>
            </div>
            <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2]">
              <Zap className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-sans font-medium uppercase text-[#9AA8B2]">Flow Features</span>
              <p className="text-xl font-mono font-semibold text-[#E7ECEF] mt-1">71 Features</p>
              <p className="text-xs text-[#9AA8B2] font-sans mt-0.5">Statistical packet distributions</p>
            </div>
            <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2]">
              <Activity className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-sans font-medium uppercase text-[#9AA8B2]">Validation Loss</span>
              <p className="text-xl font-mono font-semibold text-[#E7ECEF] mt-1">0.0124</p>
              <p className="text-xs text-[#9AA8B2] font-sans mt-0.5">Cross-entropy objective</p>
            </div>
            <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#71A99D]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default AIPerformance;
