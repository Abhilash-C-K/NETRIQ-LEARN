import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { IncidentCard } from '../components/IncidentCard';
import { IncidentDetailDrawer } from '../components/IncidentDetailDrawer';
import { ResponseActionDialog } from '../components/ResponseActionDialog';
import { incidentService } from '../services/incidents';
import { responseService } from '../services/response';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Filter,
  Plus,
  AlertTriangle,
  Server,
  Bell,
  Lock,
} from 'lucide-react';

export const Incidents = () => {
  const { role, hasCapability } = useAuth();
  const canEnforce = hasCapability('TRIGGER_QUARANTINE') || role === 'admin' || role === 'analyst';

  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer & Dialog State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    actionType: 'quarantine', // 'quarantine' or 'reverse'
    targetIp: '',
    targetMac: null,
    initialAction: 'quarantine',
    isLoading: false,
  });

  const [toastMessage, setToastMessage] = useState(null);

  // Fetch initial incidents
  const fetchIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await incidentService.getIncidents(100);
      setIncidents(data);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
      setError('Unable to load incidents. Please verify connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // WebSocket Live Updates
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const handleNewIncident = (payload) => {
      if (!payload || !payload.id) return;

      setIncidents((prev) => {
        // Deduplicate by ID
        const exists = prev.some((item) => item.id === payload.id);
        if (exists) {
          return prev.map((item) => (item.id === payload.id ? { ...item, ...payload } : item));
        }
        return [payload, ...prev];
      });

      // Show toast
      setToastMessage(`New ${payload.severity || 'Threat'} Incident #${payload.id.slice(-6)} logged!`);
      setTimeout(() => setToastMessage(null), 4000);
    };

    const unsub = subscribe('new_incident', handleNewIncident);
    return () => unsub();
  }, [subscribe]);

  // Update Status & Notes handler
  const handleUpdateStatus = async (incidentId, updates) => {
    try {
      setIsUpdating(true);
      const updated = await incidentService.updateIncident(incidentId, updates);
      setIncidents((prev) =>
        prev.map((item) => (item.id === incidentId ? { ...item, ...updated } : item))
      );
      if (selectedIncident && selectedIncident.id === incidentId) {
        setSelectedIncident((prev) => ({ ...prev, ...updated }));
      }
    } catch (err) {
      console.error('Failed to update incident:', err);
      alert('Failed to update incident status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Response Enforcement Execution
  const handleConfirmResponseAction = async ({ action, target_ip, target_mac, reason }) => {
    try {
      setDialogState((prev) => ({ ...prev, isLoading: true }));

      if (dialogState.actionType === 'reverse') {
        await responseService.reverseAction({
          action,
          target_ip,
          target_mac,
        });
        setToastMessage(`Successfully reversed ${action} for ${target_ip}`);
      } else {
        await responseService.triggerQuarantine({
          target_ip,
          target_mac,
          reason,
        });
        setToastMessage(`Layer 2 Quarantine enforced for ${target_ip}`);
      }

      setDialogState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
      // Refresh to pull updated incident audit logs
      fetchIncidents();
    } catch (err) {
      console.error('Enforcement action error:', err);
      alert('Failed to dispatch enforcement action.');
      setDialogState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const openDrawer = (incident) => {
    setSelectedIncident(incident);
    setIsDrawerOpen(true);
  };

  const openResponseDialog = ({ actionType, targetIp, initialAction = 'quarantine' }) => {
    setDialogState({
      isOpen: true,
      actionType,
      targetIp,
      targetMac: null,
      initialAction,
      isLoading: false,
    });
  };

  // Filtered Incidents calculation
  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      // Status filter
      if (filterStatus !== 'ALL') {
        const itemStatus = (item.status || 'active').toUpperCase();
        if (filterStatus === 'ACTIVE' && itemStatus !== 'ACTIVE' && itemStatus !== 'OPEN') return false;
        if (filterStatus !== 'ACTIVE' && itemStatus !== filterStatus) return false;
      }

      // Severity filter
      if (filterSeverity !== 'ALL') {
        const itemSev = (item.severity || 'LOW').toUpperCase();
        if (itemSev !== filterSeverity) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id && item.id.toLowerCase().includes(q);
        const matchesDesc = item.description && item.description.toLowerCase().includes(q);
        const matchesAsset =
          item.affected_assets &&
          item.affected_assets.some((ip) => ip.toLowerCase().includes(q));
        if (!matchesId && !matchesDesc && !matchesAsset) return false;
      }

      return true;
    });
  }, [incidents, filterStatus, filterSeverity, searchQuery]);

  const activeCount = incidents.filter(
    (i) => (i.status || 'active').toLowerCase() === 'active' || (i.status || '').toLowerCase() === 'open'
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5">
          <Bell className="w-4 h-4 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
              Incidents & Threat Management
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {activeCount} Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Autonomous threat response audits, containment reviews, and manual SDN mitigation controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchIncidents}
            disabled={isLoading}
            className="text-xs border-slate-700 hover:bg-slate-800 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canEnforce && (
            <Button
              size="sm"
              onClick={() =>
                openResponseDialog({
                  actionType: 'quarantine',
                  targetIp: '',
                  initialAction: 'quarantine',
                })
              }
              className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              Manual Quarantine
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IP, ID, or threat..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-4 text-xs w-full md:w-auto justify-end">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              {['ALL', 'ACTIVE', 'INVESTIGATING', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    filterStatus === st
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Severity Pills */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2 py-1 rounded font-medium transition-all ${
                    filterSeverity === sev
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incident List Content */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Loading active incidents from database...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
          <p>{error}</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-200">No Incidents Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no incidents matching the selected status and severity filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <span>SHOWING {filteredIncidents.length} OF {incidents.length} INCIDENTS</span>
          </div>

          {filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onSelect={openDrawer}
              onOpenResponseDialog={openResponseDialog}
            />
          ))}
        </div>
      )}

      {/* Drawer */}
      <IncidentDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        incident={selectedIncident}
        onUpdateStatus={handleUpdateStatus}
        onOpenResponseDialog={openResponseDialog}
        isUpdating={isUpdating}
      />

      {/* Enforcement Confirmation Dialog */}
      <ResponseActionDialog
        isOpen={dialogState.isOpen}
        onClose={() => setDialogState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmResponseAction}
        actionType={dialogState.actionType}
        targetIp={dialogState.targetIp}
        targetMac={dialogState.targetMac}
        initialAction={dialogState.initialAction}
        isLoading={dialogState.isLoading}
      />
    </div>
  );
};
export default Incidents;
