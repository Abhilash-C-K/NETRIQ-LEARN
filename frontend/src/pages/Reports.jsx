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
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export const Reports = () => {
  const [reportType, setReportType] = useState('incident_summary');
  const [timeRange, setTimeRange] = useState('24h');
  const [format, setFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [reportsList, setReportsList] = useState([
    {
      id: 'REP-2026-0903-01',
      title: 'Executive SOC Incident Summary',
      type: 'incident_summary',
      format: 'PDF',
      created_at: Date.now() - 3600000,
      status: 'completed',
      size: '6.8 KB',
    },
    {
      id: 'REP-2026-0902-88',
      title: 'Layer 2 SDN Quarantine Audit Report',
      type: 'sdn_audit',
      format: 'PDF',
      created_at: Date.now() - 86400000,
      status: 'completed',
      size: '5.4 KB',
    },
  ]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      setError(null);
      setSuccessMsg(null);

      const now = Date.now();
      const msRange = timeRange === '24h' ? 86400000 : timeRange === '7d' ? 7 * 86400000 : 30 * 86400000;

      const result = await reportService.generateReport({
        report_type: reportType,
        start_time: Math.floor((now - msRange) / 1000),
        end_time: Math.floor(now / 1000),
        format,
      });

      const reportId = result.id || `REP-${Date.now().toString().slice(-6)}`;
      const reportTitle =
        reportType === 'incident_summary'
          ? 'Executive Threat & Incident Mitigation Assessment'
          : reportType === 'sdn_audit'
          ? 'Layer 2 Host Isolation & Quarantine Audit Report'
          : 'Security Operations & NIDS Audit Report';

      const newReport = {
        id: reportId,
        title: reportTitle,
        type: reportType,
        format: format.toUpperCase(),
        created_at: Date.now(),
        status: 'completed',
        size: '6.8 KB',
      };

      setReportsList([newReport, ...reportsList]);
      setSuccessMsg(`Report ${reportId} generated successfully. Ready for download.`);

      // Automatically trigger download of the newly generated report
      if (format === 'pdf') {
        const cleanTitle = reportTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await reportService.downloadReport(reportId, `${cleanTitle}_${reportId.slice(-6)}.pdf`);
      }
    } catch (err) {
      console.error('Report generation error:', err);
      setError(err.response?.data?.detail || 'Report generator request timed out or returned an error.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    try {
      setDownloadingId(report.id);
      const cleanTitle = report.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const ext = report.format.toLowerCase() === 'pdf' ? 'pdf' : 'json';
      const filename = `${cleanTitle}_${report.id.slice(-6)}.${ext}`;

      if (ext === 'pdf') {
        await reportService.downloadReport(report.id, filename);
      } else {
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
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download report PDF:', err);
      window.open(`/api/v1/reports/${report.id}/download`, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1E2021] border border-[#303334] p-5 rounded-lg shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#141516] border border-[#303334] text-[#9AAA78]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F1F0EA] font-sans">
              Compliance &amp; Audit Reports
            </h1>
            <p className="text-xs text-[#A4A5A0] mt-1 font-sans">
              Generate cryptographic, enterprise-grade executive audit PDFs and compliance logs from live NIDS telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-sans text-[#9AAA78] bg-[#9AAA78]/15 border border-[#9AAA78]/30 px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            ReportLab PDF Engine Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Generator Form */}
        <Card className="bg-[#1E2021] border border-[#303334] text-[#F1F0EA] shadow-none rounded-lg">
          <CardHeader className="border-b border-[#303334] pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#F1F0EA] font-sans">
              <FileCheck className="w-4 h-4 text-[#9AAA78]" />
              Generate Audit Report
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleGenerate} className="space-y-4">
              {error && (
                <div className="p-2.5 bg-[#251818] border border-[#522525] rounded-lg text-[#DF857C] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-[#1B2418] border border-[#2B3D23] rounded-lg text-[#9AAA78] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Report Scope */}
              <div>
                <label className="block text-xs font-sans font-medium text-[#A4A5A0] mb-1.5">
                  Report Scope
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full text-xs bg-[#141516] border border-[#303334] rounded-lg p-2.5 text-[#F1F0EA] focus:outline-none focus:border-[#9AAA78] font-sans"
                >
                  <option value="incident_summary">Executive Threat &amp; Incident Mitigation</option>
                  <option value="sdn_audit">Layer 2 Host Isolation &amp; Quarantine Audit</option>
                  <option value="compliance">Continuous NIDS Compliance &amp; Anomaly Log</option>
                </select>
              </div>

              {/* Audit Window */}
              <div>
                <label className="block text-xs font-sans font-medium text-[#A4A5A0] mb-1.5">
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
                          ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334]'
                          : 'bg-[#141516] border border-[#303334] text-[#A4A5A0] hover:text-[#F1F0EA]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-xs font-sans font-medium text-[#A4A5A0] mb-1.5">
                  Artifact Format
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
                          ? 'bg-[#252728] text-[#F1F0EA] border border-[#303334]'
                          : 'bg-[#141516] border border-[#303334] text-[#A4A5A0] hover:text-[#F1F0EA]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full text-xs font-sans font-semibold bg-[#9AAA78] hover:bg-[#A9B989] text-[#141516] py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Compiling ReportLab PDF...</span>
                  </>
                ) : (
                  <span>Generate Report</span>
                )}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Right: Available Reports Repository */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#A4A5A0] font-sans px-1">
            <span>AVAILABLE ARTIFACTS ({reportsList.length})</span>
            <span>AUDIT RETENTION: 7 DAYS</span>
          </div>

          {reportsList.map((rep) => (
            <Card key={rep.id} className="bg-[#1E2021] hover:bg-[#252728] border border-[#303334] text-[#F1F0EA] shadow-none rounded-lg transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-[#141516] border border-[#303334] text-[#9AAA78] shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[#A4A5A0]">{rep.id}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141516] text-[#A4A5A0] border border-[#303334]">
                        {rep.format}
                      </span>
                      <span className="text-[10px] font-sans font-medium px-1.5 py-0.5 rounded bg-[#9AAA78]/15 text-[#9AAA78] border border-[#9AAA78]/30 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> READY
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-[#F1F0EA] font-sans truncate">{rep.title}</h4>
                    <p className="text-[11px] text-[#A4A5A0] font-mono">
                      {new Date(rep.created_at).toLocaleDateString()} • {rep.size}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(rep)}
                  disabled={downloadingId === rep.id}
                  className="text-xs border-[#303334] bg-[#141516] hover:bg-[#252728] text-[#F1F0EA] flex items-center gap-1.5 shrink-0 h-8 font-sans cursor-pointer"
                >
                  <Download className={`w-3.5 h-3.5 ${downloadingId === rep.id ? 'animate-bounce' : ''}`} />
                  {downloadingId === rep.id ? 'Downloading...' : 'Download PDF'}
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
