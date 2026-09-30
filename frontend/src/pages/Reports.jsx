import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { reportService } from '../services/reports';
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck,
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
    const blobContent = JSON.stringify(
      {
        report_id: report.id,
        title: report.title,
        generated_at: new Date(report.created_at).toISOString(),
        classification: 'SOC Restricted / Internal Compliance',
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
    <div className="space-y-5 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#19242E] border border-[#2A3944] p-5 rounded-lg shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#E7ECEF] font-sans">Compliance & Audit Reports</h1>
            <p className="text-xs text-[#9AA8B2] font-sans">Automated compliance artifacts and technical audit records</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Generator Form */}
        <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
          <CardHeader className="border-b border-[#2A3944] pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#E7ECEF] font-sans">
              <FileCheck className="w-4 h-4 text-[#71A99D]" />
              Generate Audit Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleGenerate} className="space-y-4">
              {error && (
                <div className="p-2.5 bg-[#DF857C]/15 border border-[#DF857C]/30 rounded-lg text-[#DF857C] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Report Scope */}
              <div>
                <label className="block text-xs font-sans font-medium text-[#9AA8B2] mb-1.5">
                  Report Scope
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full text-xs bg-[#101820] border border-[#2A3944] rounded-lg p-2.5 text-[#E7ECEF] focus:outline-none focus:border-[#71A99D] font-sans"
                >
                  <option value="incident_summary">Incident & Threat Mitigation Summary</option>
                  <option value="sdn_audit">SDN Quarantine & Reversal Audit</option>
                  <option value="model_accuracy">Classifier Drift & Accuracy Telemetry</option>
                </select>
              </div>

              {/* Audit Window */}
              <div>
                <label className="block text-xs font-sans font-medium text-[#9AA8B2] mb-1.5">
                  Audit Window
                </label>
                <div className="grid grid-cols-3 gap-2 font-sans">
                  {[
                    { id: '24h', label: 'Last 24h' },
                    { id: '7d', label: 'Last 7 Days' },
                    { id: '30d', label: 'Last 30 Days' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTimeRange(t.id)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        timeRange === t.id
                          ? 'bg-[#202D36] text-[#E7ECEF] border border-[#2A3944]'
                          : 'bg-[#101820] border border-[#2A3944] text-[#9AA8B2] hover:text-[#E7ECEF]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-xs font-sans font-medium text-[#9AA8B2] mb-1.5">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-2 font-sans">
                  {[
                    { id: 'pdf', label: 'Executive PDF' },
                    { id: 'json', label: 'Raw JSON Audit' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        format === f.id
                          ? 'bg-[#202D36] text-[#E7ECEF] border border-[#2A3944]'
                          : 'bg-[#101820] border border-[#2A3944] text-[#9AA8B2] hover:text-[#E7ECEF]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button: #71A99D */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full text-xs font-sans font-semibold bg-[#71A99D] hover:bg-[#60958a] text-[#101820] py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 mt-2"
              >
                {isGenerating ? 'Compiling Artifact...' : 'Generate Report'}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Available Reports Repository */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#9AA8B2] font-sans px-1">
            <span>AVAILABLE ARTIFACTS ({reportsList.length})</span>
            <span>RETENTION: 7 DAYS</span>
          </div>

          {reportsList.map((rep) => (
            <Card key={rep.id} className="bg-[#19242E] hover:bg-[#202D36] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#101820] border border-[#2A3944] text-[#7895B2] shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#9AA8B2]">{rep.id}</span>
                      {/* Format label: Neutral */}
                      <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-[#202D36] text-[#9AA8B2] border border-[#2A3944]">
                        {rep.format}
                      </span>
                      {/* Status: READY in #71A99D */}
                      <span className="text-[10px] font-sans font-medium px-1.5 py-0.2 rounded bg-[#71A99D]/15 text-[#71A99D] border border-[#71A99D]/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> READY
                      </span>
                    </div>
                    <h4 className="text-xs font-medium text-[#E7ECEF] font-sans">{rep.title}</h4>
                    <p className="text-[11px] text-[#9AA8B2] font-mono">
                      {new Date(rep.created_at).toLocaleDateString()} • {rep.size}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(rep)}
                  className="text-xs border-[#2A3944] bg-[#101820] hover:bg-[#202D36] text-[#E7ECEF] flex items-center gap-1.5 shrink-0 h-8 font-sans"
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
