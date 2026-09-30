import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { IncidentCard } from '../components/IncidentCard';
import { IncidentDetailDrawer } from '../components/IncidentDetailDrawer';
import { DeviceActivityDrawer } from '../components/DeviceActivityDrawer';
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
  Plus,
  AlertTriangle,
  Bell,
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
  const [selectedDeviceIp, setSelectedDeviceIp] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    actionType: 'quarantine',
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
        const exists = prev.some((item) => item.id === payload.id);
        if (exists) {
          return prev.map((item) => (item.id === payload.id ? { ...item, ...payload } : item));
        }
        return [payload, ...prev];
      });

      const code = payload.incident_code || (payload.id ? `INC-${payload.id.slice(-4).toUpperCase()}` : 'INC-NEW');
      setToastMessage(`New Incident ${code} recorded`);
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
        setToastMessage(`Quarantine enforced for ${target_ip}`);
      }

      setDialogState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
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
      if (filterStatus !== 'ALL') {
        const itemStatus = (item.status || 'active').toUpperCase();
        if (filterStatus === 'ACTIVE' && itemStatus !== 'ACTIVE' && itemStatus !== 'OPEN') return false;
        if (filterStatus !== 'ACTIVE' && itemStatus !== filterStatus) return false;
      }

      if (filterSeverity !== 'ALL') {
        const itemSev = (item.severity || 'LOW').toUpperCase();
        if (itemSev !== filterSeverity) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id && item.id.toLowerCase().includes(q);
        const matchesCode = item.incident_code && item.incident_code.toLowerCase().includes(q);
        const matchesDesc = item.description && item.description.toLowerCase().includes(q);
        const matchesSrc = item.src_ip && item.src_ip.toLowerCase().includes(q);
        const matchesDst = item.dst_ip && item.dst_ip.toLowerCase().includes(q);
        const matchesAsset =
          item.affected_assets &&
          item.affected_assets.some((ip) => ip.toLowerCase().includes(q));
        if (!matchesId && !matchesCode && !matchesDesc && !matchesSrc && !matchesDst && !matchesAsset) return false;
      }


      return true;
    });
  }, [incidents, filterStatus, filterSeverity, searchQuery]);

  const activeCount = incidents.filter(
    (i) => (i.status || 'active').toLowerCase() === 'active' || (i.status || '').toLowerCase() === 'open'
  ).length;

  return (
    <div className="space-y-5 pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] text-xs font-medium px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-[#D3A35D]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#19242E] border border-[#2A3944] p-5 rounded-lg shadow-none">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-lg font-semibold tracking-normal text-[#E7ECEF] flex items-center gap-2 font-sans">
              <ShieldAlert className="w-5 h-5 text-[#DF857C]" />
              Threat Incidents
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#DF857C]/15 text-[#DF857C] border border-[#DF857C]/30">
              {activeCount} Active
            </span>
          </div>
          <p className="text-xs text-[#9AA8B2] font-sans">
            Detection audit records, host containment status, and manual mitigation actions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchIncidents}
            disabled={isLoading}
            className="text-xs border-[#2A3944] bg-[#101820] hover:bg-[#202D36] text-[#E7ECEF] flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canEnforce && (
            <button
              onClick={() =>
                openResponseDialog({
                  actionType: 'quarantine',
                  targetIp: '',
                  initialAction: 'quarantine',
                })
              }
              className="text-xs bg-[#DF857C]/15 hover:bg-[#DF857C]/25 text-[#DF857C] border border-[#DF857C]/40 font-sans font-semibold h-8 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Manual Quarantine
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="bg-[#19242E] border border-[#2A3944] text-[#E7ECEF] shadow-none rounded-lg">
        <CardContent className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#687883]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IP, ID, or threat..."
              className="w-full bg-[#101820] border border-[#2A3944] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#E7ECEF] placeholder-[#687883] focus:outline-none focus:border-[#71A99D] transition-colors font-sans"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto justify-end font-sans">
            {/* Status Pills */}
            <div className="flex items-center gap-1 bg-[#101820] p-1 rounded-lg border border-[#2A3944]">
              {['ALL', 'ACTIVE', 'INVESTIGATING', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    filterStatus === st
                      ? 'bg-[#202D36] text-[#E7ECEF] border border-[#2A3944]'
                      : 'text-[#9AA8B2] hover:text-[#E7ECEF]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Severity Pills */}
            <div className="flex items-center gap-1 bg-[#101820] p-1 rounded-lg border border-[#2A3944]">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    filterSeverity === sev
                      ? 'bg-[#202D36] text-[#E7ECEF] border border-[#2A3944]'
                      : 'text-[#9AA8B2] hover:text-[#E7ECEF]'
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
        <div className="p-12 text-center text-[#9AA8B2] space-y-3">
          <div className="w-7 h-7 border-2 border-[#2A3944] border-t-[#71A99D] rounded-full animate-spin mx-auto" />
          <p className="text-xs font-sans">Loading active incidents...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-[#19242E] border border-[#DF857C]/40 rounded-lg text-[#DF857C] text-xs font-sans">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1.5" />
          <p>{error}</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="p-12 text-center bg-[#19242E] border border-[#2A3944] rounded-lg space-y-2">
          <ShieldCheck className="w-7 h-7 text-[#71A99D] mx-auto" />
          <h4 className="text-sm font-semibold text-[#E7ECEF] font-sans">No Incidents Found</h4>
          <p className="text-xs text-[#9AA8B2] max-w-sm mx-auto font-sans">
            There are currently no incidents matching the selected filter criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#9AA8B2] px-1 font-mono">
            <span>SHOWING {filteredIncidents.length} OF {incidents.length} INCIDENTS</span>
          </div>

          {filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onSelect={openDrawer}
              onOpenResponseDialog={openResponseDialog}
              onSelectDevice={setSelectedDeviceIp}
            />
          ))}
        </div>
      )}

      {/* Incident Detail Drawer */}
      <IncidentDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        incident={selectedIncident}
        onUpdateStatus={handleUpdateStatus}
        onOpenResponseDialog={openResponseDialog}
        isUpdating={isUpdating}
        onSelectDevice={setSelectedDeviceIp}
      />

      {/* Device Activity Trail Drawer */}
      <DeviceActivityDrawer
        isOpen={!!selectedDeviceIp}
        onClose={() => setSelectedDeviceIp(null)}
        srcIp={selectedDeviceIp}
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
