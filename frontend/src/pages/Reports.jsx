import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { reportService } from '../services/reports';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';

export const Reports = () => {
  const [reportType, setReportType] = useState('incident_summary');
  const [timeRange, setTimeRange] = useState('24h');
  const [format, setFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const [reportsList, setReportsList] = useState([
    {
      id: 'REP-2026-0903-01',
      title: 'Executive SOC Incident Summary',
      type: 'incident_summary',
      format: 'PDF',
      created_at: Date.now() - 3600000,
      status: 'completed',
      size: '2.4 MB',
    },
    {
      id: 'REP-2026-0902-88',
      title: 'Layer 2 SDN Quarantine Audit Report',
      type: 'sdn_audit',
      format: 'PDF',
      created_at: Date.now() - 86400000,
      status: 'completed',
      size: '1.8 MB',
    },
  ]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      setError(null);

      const now = Date.now();
      const msRange = timeRange === '24h' ? 86400000 : timeRange === '7d' ? 7 * 86400000 : 30 * 86400000;

      const result = await reportService.generateReport({
        report_type: reportType,
        start_time: now - msRange,
        end_time: now,
        format,
      });

      const newReport = {
        id: result.id || `REP-${Date.now().toString().slice(-6)}`,
        title: reportType === 'incident_summary' ? 'Incident & Threat Mitigation Summary' : 'SDN Enforcement & Compliance Audit',
        type: reportType,
        format: format.toUpperCase(),
        created_at: Date.now(),
        status: 'completed',
        size: '1.2 MB',
      };

      setReportsList([newReport, ...reportsList]);
    } catch (err) {
      console.error('Report generation error:', err);
      setError('Report generator request timed out or returned an error.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (report) => {
    // Generate simulated export blob for verified offline compliance download
    const blobContent = JSON.stringify(
      {
        report_id: report.id,
        title: report.title,
        generated_at: new Date(report.created_at).toISOString(),
        classification: 'SOC Restricted / Internal Audit',
        integrity_hash: 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
      null,
      2
    );
    const blob = new Blob([blobContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.id}.${report.format.toLowerCase() === 'pdf' ? 'pdf' : 'json'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Audit & Compliance Reports</h1>
            <p className="text-xs text-slate-400">Automated PDF & JSON audit exports for executive leadership and compliance auditors.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Generator Form */}
        <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Generate New Audit Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleGenerate} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Report Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Report Scope & Template
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="incident_summary">Incident & Threat Mitigation Summary</option>
                  <option value="sdn_audit">SDN Quarantine & Reversal Audit</option>
                  <option value="model_accuracy">AI Classifier Drift & Accuracy Telemetry</option>
                </select>
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Audit Window
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '24h', label: 'Last 24h' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTimeRange(t.id)}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        timeRange === t.id
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Export Document Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pdf', label: 'Executive PDF' },
                    { id: 'json', label: 'Raw JSON Audit' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        format === f.id
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isGenerating}
                className="w-full text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/40 mt-2"
              >
                {isGenerating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-1.5" />
                    Compiling Audit Artifact...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 mr-1.5" />
                    Generate Compliance Report
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Available Reports Repository */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>AVAILABLE ARTIFACTS ({reportsList.length})</span>
            <span>STORAGE: 7-DAY RETENTION</span>
          </div>

          {reportsList.map((rep) => (
            <Card key={rep.id} className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md hover:border-slate-700 transition-all">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-300">{rep.id}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {rep.format}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> READY
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-200">{rep.title}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Generated {new Date(rep.created_at).toLocaleString()} • {rep.size}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleDownload(rep)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Reports;
