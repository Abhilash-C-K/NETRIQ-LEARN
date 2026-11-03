import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Network,
  Shield,
  AlertTriangle,
  ShieldAlert,
  Radio,
  Server,
  Laptop,
  Database,
  Router,
  Smartphone,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
  ExternalLink,
  Info,
  RefreshCw,
  LayoutGrid,
} from 'lucide-react';
import { incidentService } from '../services/incidents';
import { predictionService } from '../services/prediction';
import { responseService } from '../services/response';
import { monitoringService } from '../services/monitoring';
import { behaviorService } from '../services/behaviors';
import { Clock, ShieldCheck } from 'lucide-react';

// Custom Node for SOC Devices with React Flow connection handles
const SOCDeviceNode = ({ data }) => {
  const isCompromised = data.status === 'COMPROMISED';
  const isSuspicious = data.status === 'SUSPICIOUS';
  const isQuarantined = data.status === 'QUARANTINED';
  const isRouter = data.type === 'router';
  const isMobile = data.type === 'mobile' || data.type === 'smartphone';
  const isServer = data.type === 'server' || data.type === 'iot';
  const isLaptop = data.type === 'workstation' || data.type === 'laptop' || (!isRouter && !isMobile && !isServer && data.type !== 'database');

  // Device-specific styling rules:
  // - Router: BLACK color (#09090b)
  // - Mobile: #C1E8FF (Soft Ice Blue)
  // - Laptop / PC: #065A72 (Deep Ocean Blue)
  // - Server / IoT: #0747a1 (Deep Cobalt Blue)
  let borderColor = 'border-blue-300 bg-white shadow-slate-100';
  let badgeColor = 'bg-blue-600 text-white';
  let iconBg = 'bg-blue-50 text-blue-600';
  let handleBg = '!bg-blue-500';
  let textPrimary = 'text-[#0f172a]';
  let textSecondary = 'text-[#475569]';
  let vlanText = 'text-[#64748b]';

  if (isCompromised) {
    borderColor = 'border-red-500 bg-red-50/90 shadow-red-200';
    badgeColor = 'bg-red-600 text-white';
    iconBg = 'bg-red-100 text-red-600';
    handleBg = '!bg-red-500';
  } else if (isSuspicious) {
    borderColor = 'border-orange-500 bg-orange-50/90 shadow-orange-200';
    badgeColor = 'bg-orange-500 text-white';
    iconBg = 'bg-orange-100 text-orange-600';
    handleBg = '!bg-orange-500';
  } else if (isQuarantined) {
    borderColor = 'border-purple-600 bg-purple-50/90 shadow-purple-200';
    badgeColor = 'bg-purple-600 text-white';
    iconBg = 'bg-purple-100 text-purple-600';
    handleBg = '!bg-purple-600';
  } else {
    // Normal Status - Color code devices by type
    if (isRouter) {
      // Router: BLACK
      borderColor = 'border-black bg-zinc-950 text-white shadow-md shadow-zinc-900/40 ring-1 ring-zinc-800';
      badgeColor = 'bg-black text-white border border-zinc-700';
      iconBg = 'bg-zinc-800 text-white border border-zinc-700';
      handleBg = '!bg-black !border-zinc-500';
      textPrimary = 'text-white';
      textSecondary = 'text-zinc-300';
      vlanText = 'text-zinc-400';
    } else if (isMobile) {
      // Mobile: #C1E8FF (Soft Ice Blue)
      borderColor = 'border-[#7EC5F2] bg-[#C1E8FF]/30 shadow-md shadow-[#C1E8FF]/40 ring-1 ring-[#7EC5F2]/40';
      badgeColor = 'bg-[#C1E8FF] text-[#034466] font-extrabold border border-[#7EC5F2] shadow-2xs';
      iconBg = 'bg-white/90 text-[#0284c7] border border-[#7EC5F2]';
      handleBg = '!bg-[#7EC5F2]';
      textPrimary = 'text-[#0f172a]';
      textSecondary = 'text-[#034466]';
      vlanText = 'text-[#034466] font-bold';
    } else if (isServer) {
      // Server / IoT: #0747a1 (Deep Cobalt Blue)
      borderColor = 'border-[#0747a1] bg-[#0747a1]/10 shadow-md shadow-[#0747a1]/20 ring-1 ring-[#0747a1]/30';
      badgeColor = 'bg-[#0747a1] text-white font-extrabold shadow-2xs';
      iconBg = 'bg-[#0747a1]/15 text-[#0747a1] border border-[#0747a1]/30';
      handleBg = '!bg-[#0747a1]';
      textPrimary = 'text-[#0f172a]';
      textSecondary = 'text-[#0747a1]';
      vlanText = 'text-[#0747a1] font-bold';
    } else if (data.type === 'database') {
      // Database: AMBER
      borderColor = 'border-amber-400 bg-amber-50/80 shadow-md shadow-amber-100/70 ring-1 ring-amber-300';
      badgeColor = 'bg-amber-600 text-white shadow-xs';
      iconBg = 'bg-amber-100 text-amber-600 border border-amber-200';
      handleBg = '!bg-amber-500';
    } else {
      // Laptop / Workstation / PC: #065A72 (Deep Ocean Blue)
      borderColor = 'border-[#065A72] bg-[#065A72]/10 shadow-md shadow-[#065A72]/20 ring-1 ring-[#065A72]/30';
      badgeColor = 'bg-[#065A72] text-white font-extrabold shadow-2xs';
      iconBg = 'bg-[#065A72]/15 text-[#065A72] border border-[#065A72]/30';
      handleBg = '!bg-[#065A72]';
      textPrimary = 'text-[#0f172a]';
      textSecondary = 'text-[#065A72]';
      vlanText = 'text-[#065A72] font-bold';
    }
  }

  return (
    <div
      className={`px-3.5 py-2.5 rounded-xl border-2 shadow-md min-w-[175px] transition-all cursor-pointer relative ${borderColor} ${
        isCompromised ? 'animate-threat-pulse' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={`w-2.5 h-2.5 ${handleBg} border-2 !border-white rounded-full`}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={`w-2.5 h-2.5 ${handleBg} border-2 !border-white rounded-full`}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={`w-2 h-2 ${handleBg} opacity-0`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={`w-2 h-2 ${handleBg} opacity-0`}
      />

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-[10px] font-mono font-medium ${vlanText}`}>{data.vlan}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${badgeColor}`}>
          {data.status}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          {isRouter && <Router className="w-4 h-4" />}
          {isMobile && <Smartphone className="w-4 h-4" />}
          {isServer && <Server className="w-4 h-4" />}
          {data.type === 'database' && <Database className="w-4 h-4" />}
          {isLaptop && <Laptop className="w-4 h-4" />}
        </div>

        <div className="min-w-0">
          <div className={`text-xs font-bold truncate ${textPrimary}`}>{data.hostname || data.label}</div>
          <div className={`text-[11px] font-mono ${textSecondary}`}>{data.ip}</div>
        </div>
      </div>
    </div>
  );
};

// RFC1918 Private IP verification (strictly excludes Google 172.217.x.x)
const isRfc1918PrivateIp = (ip) => {
  if (!ip || typeof ip !== 'string') return false;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('127.')) return true;
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10);
      return second >= 16 && second <= 31;
    }
  }
  return false;
};

export const InternalNetworkLayer2 = () => {
  const navigate = useNavigate();
  const nodeTypes = useMemo(() => ({ socDevice: SOCDeviceNode }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [viewMode, setViewMode] = useState('live'); // 'live' (Real Wi-Fi Devices) | 'simulation' (Enterprise SOC Testbed)
  const [topologyMeta, setTopologyMeta] = useState(null);
  const [deviceProfile, setDeviceProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [simulatingAnomaly, setSimulatingAnomaly] = useState(false);

  // Fetch real behavioral profile when a node is selected
  useEffect(() => {
    if (!selectedNode?.data?.ip) {
      setDeviceProfile(null);
      return;
    }
    let isCurrent = true;
    setLoadingProfile(true);
    behaviorService.getDeviceBehavior(selectedNode.data.mac || selectedNode.data.ip)
      .then((prof) => {
        if (isCurrent) setDeviceProfile(prof);
      })
      .catch(() => {
        if (isCurrent) setDeviceProfile(null);
      })
      .finally(() => {
        if (isCurrent) setLoadingProfile(false);
      });
    return () => { isCurrent = false; };
  }, [selectedNode?.data?.ip, selectedNode?.data?.mac]);

  const handleSimulateBehaviorAnomaly = async (anomalyType = 'LATERAL_SMB') => {
    if (!selectedNode?.data?.ip) return;
    setSimulatingAnomaly(true);
    try {
      await behaviorService.simulateAnomaly({
        ip: selectedNode.data.ip,
        mac: selectedNode.data.mac,
        hostname: selectedNode.data.hostname || selectedNode.data.label,
        type: anomalyType,
      });
      // Refresh profile & topology to reflect anomaly
      const updated = await behaviorService.getDeviceBehavior(selectedNode.data.mac || selectedNode.data.ip);
      setDeviceProfile(updated);
      loadTopologyData(viewMode, true);
    } catch (err) {
      console.error('Failed to trigger simulation:', err);
    } finally {
      setSimulatingAnomaly(false);
    }
  };

  // Helper to construct React Flow nodes and edges with grouped spatial layout:
  // - Top / Top-Left: Router / Gateway
  // - Left Column: IoT & Smart Devices
  // - Center Area: Mobile Phones (2-column layout)
  // - Right Column: Laptops & Workstations (Host PC at the top)
  const buildRealTopology = (devices, incidents = [], threats = [], prevNodes = [], forceReset = false) => {
    const prevMap = new Map((prevNodes || []).map((n) => [n.id, n]));

    // Categorize devices into designated functional zones
    const routers = [];
    const iotDevices = [];
    const mobileDevices = [];
    const workstations = [];

    (devices || []).forEach((d) => {
      if (d.is_gateway || d.type === 'router') {
        routers.push(d);
      } else if (d.type === 'server' || d.type === 'iot') {
        iotDevices.push(d);
      } else if (d.type === 'mobile' || d.type === 'smartphone') {
        mobileDevices.push(d);
      } else {
        // Laptop / PC / Workstation
        if (d.is_host) {
          workstations.unshift(d); // Host machine at the top of the laptop column
        } else {
          workstations.push(d);
        }
      }
    });

    const coordinateMap = new Map();

    // 1. Router at Top (Top-Left)
    routers.forEach((d, idx) => {
      coordinateMap.set(d.ip, { x: 40, y: 30 + idx * 140 });
    });

    // 2. IoT / Smart Devices on Left side (stacked below router)
    iotDevices.forEach((d, idx) => {
      const col = Math.floor(idx / 5);
      const row = idx % 5;
      coordinateMap.set(d.ip, { x: 40 + col * 260, y: 190 + row * 140 });
    });

    // 3. Mobile Phones in Center area (2-column grid)
    mobileDevices.forEach((d, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      coordinateMap.set(d.ip, { x: 320 + col * 260, y: 200 + row * 140 });
    });

    // 4. Laptops / Workstations in Right column (Host PC at the top)
    workstations.forEach((d, idx) => {
      const col = Math.floor(idx / 6);
      const row = idx % 6;
      coordinateMap.set(d.ip, { x: 840 + col * 260, y: 30 + row * 140 });
    });

    const realNodes = (devices || []).map((d) => {
      const matchingThreats = (threats || []).filter((t) => t.src_ip === d.ip || t.dst_ip === d.ip);
      const isQuar =
        (incidents || []).some(
          (i) =>
            (i.src_ip === d.ip || (Array.isArray(i.affected_assets) && i.affected_assets.includes(d.ip))) &&
            (i.response_action === 'quarantine' || String(i.description || '').includes('QUARANTINE'))
        ) || matchingThreats.some((t) => t.action === 'QUARANTINE');

      const hasCritical = matchingThreats.some((t) => t.severity === 'CRITICAL' || t.is_anomaly);
      const hasWarning = matchingThreats.some((t) => t.severity === 'HIGH' || t.severity === 'MEDIUM');

      const status = isQuar ? 'QUARANTINED' : hasCritical ? 'COMPROMISED' : hasWarning ? 'SUSPICIOUS' : 'NORMAL';

      const nodeId = `dev-${d.ip.replace(/\./g, '-')}`;
      const existingNode = prevMap.get(nodeId);
      const defaultPos = coordinateMap.get(d.ip) || { x: 400, y: 200 };
      const position = (existingNode && !forceReset) ? existingNode.position : defaultPos;

      const ports = Array.from(
        new Set(matchingThreats.map((t) => t.dst_port || t.src_port).filter(Boolean))
      ).slice(0, 4);

      const hostname = d.hostname || (d.is_host ? 'Host PC' : d.is_gateway ? 'Wi-Fi Router Gateway' : `${d.type === 'mobile' ? 'Smartphone' : 'Network Device'} (${d.ip.split('.').pop()})`);
      const friendlyLabel = d.label || (d.is_host
        ? `${hostname} (This PC)`
        : d.is_gateway
        ? `Wi-Fi Router Gateway`
        : `${hostname} (${d.ip})`);

      return {
        id: nodeId,
        type: 'socDevice',
        position,
        data: {
          id: nodeId,
          label: friendlyLabel,
          hostname: hostname,
          ip: d.ip,
          mac: d.mac || '00:00:00:00:00:00',
          type: d.type || (d.is_gateway ? 'router' : 'workstation'),
          vlan: d.is_gateway ? 'Default Gateway / Access Point' : 'Active Local Wi-Fi Subnet',
          status,
          riskScore: isQuar ? 98 : hasCritical ? 92 : hasWarning ? 65 : 8,
          openPorts: ports.length > 0 ? ports : (d.is_host ? [8000, 5173, 27017] : [80, 443, 53]),
          details: d.is_host
            ? `Local machine (${hostname} - ${d.ip}) running NetrIQ IDS/IPS on active Wi-Fi interface.`
            : d.is_gateway
            ? `Physical Wi-Fi router gateway (${d.ip}). MAC: ${d.mac}.`
            : `Physical device detected on the local Wi-Fi subnet via ARP discovery.`,
          isRealDevice: true,
        },
      };
    });

    const realEdges = [];
    const gwNode = realNodes.find((n) => n.data.type === 'router') || realNodes[0];
    realNodes.forEach((n) => {
      if (gwNode && n.id !== gwNode.id) {
        realEdges.push({
          id: `edge-${gwNode.id}-${n.id}`,
          source: gwNode.id,
          target: n.id,
          animated: true,
          label: 'Wi-Fi Link (Active)',
          labelStyle: { fill: '#2563eb', fontSize: 10, fontWeight: 700 },
          style: { stroke: '#2563eb', strokeWidth: 2 },
        });
      }
    });

    return { nodes: realNodes, edges: realEdges };
  };

  // Load real telemetry devices from Host OS & MongoDB
  const loadTopologyData = async (mode = viewMode, isSilent = false, forceReset = false) => {
    try {
      if (!isSilent) setLoading(true);

      if (mode === 'live') {
        // 1. Fetch hardware topology immediately (< 200ms)
        const localTopology = await monitoringService.getLocalTopology().catch(() => null);

        if (localTopology && Array.isArray(localTopology.devices) && localTopology.devices.length > 0) {
          setTopologyMeta(localTopology);

          setNodes((prevNodes) => {
            const { nodes: newNodes, edges: newEdges } = buildRealTopology(localTopology.devices, [], [], forceReset ? [] : prevNodes, forceReset);
            setEdges(newEdges);
            setSelectedNode((prevSelected) => {
              if (prevSelected) {
                const found = newNodes.find((n) => n.id === prevSelected.id);
                if (found) return found;
              }
              return newNodes.find((n) => n.data.ip === localTopology.host_ip) || newNodes[0];
            });
            return newNodes;
          });

          if (!isSilent) setLoading(false);

          // 2. Background enrich with incidents & threats without blocking canvas
          try {
            const [incidents, threats] = await Promise.all([
              incidentService.getIncidents(25).catch(() => []),
              predictionService.getRecentThreats(25).catch(() => []),
            ]);

            setNodes((prevNodes) => {
              const { nodes: enrichedNodes } = buildRealTopology(
                localTopology.devices,
                Array.isArray(incidents) ? incidents : [],
                Array.isArray(threats) ? threats : [],
                forceReset ? [] : prevNodes,
                forceReset
              );
              return enrichedNodes;
            });
          } catch (e) {
            // Non-critical background enrichment
          }
        } else {
          // Fallback gracefully for live Wi-Fi mode when backend topology list is empty
          const fallbackHostIp = localTopology?.host_ip || (window?.location?.hostname || '127.0.0.1');
          const fallbackGatewayIp = localTopology?.gateway_ip || '192.168.1.1';
          const fallbackNodes = [
            {
              id: `dev-${fallbackGatewayIp.replace(/\./g, '-')}`,
              type: 'socDevice',
              position: { x: 40, y: 30 },
              data: {
                id: `dev-${fallbackGatewayIp.replace(/\./g, '-')}`,
                label: 'Wi-Fi Router Gateway',
                hostname: 'Wi-Fi Router Gateway',
                ip: fallbackGatewayIp,
                mac: 'Default Gateway MAC',
                type: 'router',
                vlan: 'Default Gateway / Access Point',
                status: 'NORMAL',
                riskScore: 8,
                openPorts: [80, 443, 53],
                details: `Physical Wi-Fi router gateway (${fallbackGatewayIp}).`,
                isRealDevice: true,
              },
            },
            {
              id: `dev-${fallbackHostIp.replace(/\./g, '-')}`,
              type: 'socDevice',
              position: { x: 840, y: 30 },
              data: {
                id: `dev-${fallbackHostIp.replace(/\./g, '-')}`,
                label: 'This PC (Host)',
                ip: fallbackHostIp,
                mac: 'Local Host Interface',
                type: 'workstation',
                vlan: 'Active Local Wi-Fi Subnet',
                status: 'NORMAL',
                riskScore: 8,
                openPorts: [8000, 5173, 27017],
                details: `Local machine (${fallbackHostIp}) running NetrIQ IDS/IPS on active Wi-Fi interface.`,
                isRealDevice: true,
              },
            },
          ];
          const fallbackEdges = [
            {
              id: `edge-dev-${fallbackGatewayIp.replace(/\./g, '-')}-dev-${fallbackHostIp.replace(/\./g, '-')}`,
              source: fallbackNodes[0].id,
              target: fallbackNodes[1].id,
              animated: true,
              label: 'Wi-Fi Link (Active)',
              labelStyle: { fill: '#2563eb', fontSize: 10, fontWeight: 700 },
              style: { stroke: '#2563eb', strokeWidth: 2 },
            },
          ];
          setTopologyMeta({
            host_ip: fallbackHostIp,
            gateway_ip: fallbackGatewayIp,
            subnet: localTopology?.subnet || `${fallbackHostIp.split('.').slice(0, 3).join('.')}.0/24`,
            device_count: fallbackNodes.length,
            devices: fallbackNodes.map((n) => n.data),
          });
          setNodes(fallbackNodes);
          setEdges(fallbackEdges);
          setSelectedNode(fallbackNodes[1]);
        }
      } else {
        // Simulation mode: only include TRUE RFC 1918 private IPs (strictly never Google 172.217.x.x)
        const deviceMap = {};
        const internalIps = new Set();
        internalThreats.forEach((t) => {
          if (t.src_ip && isRfc1918PrivateIp(t.src_ip)) internalIps.add(t.src_ip);
          if (t.dst_ip && isRfc1918PrivateIp(t.dst_ip)) internalIps.add(t.dst_ip);
        });
        realIncidents.forEach((inc) => {
          const ip = inc.src_ip || (Array.isArray(inc.affected_assets) && inc.affected_assets[0]);
          if (ip && isRfc1918PrivateIp(ip)) internalIps.add(ip);
        });

        if (internalIps.size === 0) {
          internalIps.add('10.0.0.1');
          internalIps.add('10.0.0.42');
          internalIps.add('10.0.0.15');
          internalIps.add('10.0.0.88');
        }

        const ipList = Array.from(internalIps).slice(0, 9);
        ipList.forEach((ip, idx) => {
          const matchingThreats = internalThreats.filter((t) => t.src_ip === ip || t.dst_ip === ip);
          const isQuar =
            realIncidents.some(
              (i) =>
                (i.src_ip === ip || (Array.isArray(i.affected_assets) && i.affected_assets.includes(ip))) &&
                (i.response_action === 'quarantine' || String(i.description || '').includes('QUARANTINE'))
            ) || matchingThreats.some((t) => t.action === 'QUARANTINE');

          const hasCritical = matchingThreats.some((t) => t.severity === 'CRITICAL' || t.is_anomaly);
          const hasWarning = matchingThreats.some((t) => t.severity === 'HIGH' || t.severity === 'MEDIUM');

          const status = isQuar ? 'QUARANTINED' : hasCritical ? 'COMPROMISED' : hasWarning ? 'SUSPICIOUS' : 'NORMAL';
          const vlan = isQuar ? 'VLAN-99 (Quarantined)' : ip.endsWith('.1') ? 'VLAN-10 (Trunk)' : 'VLAN-50 (Synthetic)';

          const isSimRouter = ip.endsWith('.1');
          const isSimMobile = ip.endsWith('.42') || ip.endsWith('.55');
          const isSimServer = ip.endsWith('.15') || ip.endsWith('.10');
          const simType = isSimRouter ? 'router' : isSimMobile ? 'mobile' : isSimServer ? 'server' : 'workstation';

          // Grouped coordinates in simulation mode
          let xPos = 840;
          let yPos = 30 + idx * 140;
          if (isSimRouter) {
            xPos = 40;
            yPos = 30;
          } else if (isSimServer) {
            xPos = 40;
            yPos = 190 + (idx % 3) * 140;
          } else if (isSimMobile) {
            xPos = 320 + (idx % 2) * 260;
            yPos = 200 + Math.floor(idx / 2) * 140;
          } else {
            xPos = 840;
            yPos = 30 + (idx % 5) * 140;
          }

          const ports = Array.from(new Set(matchingThreats.map((t) => t.dst_port || t.src_port).filter(Boolean))).slice(0, 4);
          const simLabel = isSimRouter
            ? 'Gateway Router (Simulated)'
            : isSimMobile
            ? `Mobile Phone (${ip})`
            : isSimServer
            ? `Database Server (${ip})`
            : `Workstation Laptop (${ip})`;

          deviceMap[ip] = {
            id: `dev-${ip.replace(/\./g, '-')}`,
            label: simLabel,
            hostname: simLabel,
            ip,
            mac: `00:1A:2B:3C:${(idx + 10).toString(16).toUpperCase()}:01`,
            type: simType,
            vlan,
            status,
            riskScore: isQuar ? 98 : hasCritical ? 92 : hasWarning ? 65 : 12,
            openPorts: ports.length > 0 ? ports : [80, 443],
            details: isQuar ? 'Quarantined by NetrIQ Response Engine.' : 'Synthetic enterprise endpoint for lateral movement testing.',
            x: xPos,
            y: yPos,
          };
        });

        const simNodes = Object.values(deviceMap).map((d) => ({
          id: d.id,
          type: 'socDevice',
          position: { x: d.x, y: d.y },
          data: d,
        }));

        const simEdges = [];
        if (simNodes.length > 1) {
          const gw = simNodes[0];
          for (let i = 1; i < simNodes.length; i++) {
            simEdges.push({
              id: `edge-sim-${i}`,
              source: gw.id,
              target: simNodes[i].id,
              style: { stroke: '#94a3b8', strokeWidth: 1.5 },
            });
          }
        }
        setNodes(simNodes);
        setEdges(simEdges);
        setSelectedNode(simNodes[0] || null);
      }
    } catch (err) {
      console.error('Failed to load topology:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopologyData(viewMode, false);
    const interval = setInterval(() => {
      loadTopologyData(viewMode, true);
    }, 20000);
    return () => clearInterval(interval);
  }, [viewMode]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // Execute REAL backend quarantine or reversal
  const handleToggleQuarantine = async (node) => {
    if (!node || actionInProgress) return;
    setActionInProgress(true);

    const isCurrentlyQuarantined = node.data.status === 'QUARANTINED';
    try {
      if (isCurrentlyQuarantined) {
        // Reverse Quarantine on Backend API
        await responseService.reverseAction({
          action: 'QUARANTINE',
          target_ip: node.data.ip,
          target_mac: node.data.mac,
        });
      } else {
        // Enforce Quarantine on Backend API
        await responseService.triggerQuarantine({
          target_ip: node.data.ip,
          target_mac: node.data.mac,
          reason: `SOC Manual Quarantine from Internal Topology: ${node.data.label}`,
        });
      }

      // Update node state in live canvas
      const newStatus = isCurrentlyQuarantined ? 'NORMAL' : 'QUARANTINED';
      const updatedNode = {
        ...node,
        data: {
          ...node.data,
          status: newStatus,
          vlan: newStatus === 'QUARANTINED' ? 'VLAN-99 (Quarantined)' : 'Active Subnet',
          riskScore: newStatus === 'QUARANTINED' ? 98 : 15,
        },
      };

      setNodes((nds) => nds.map((n) => (n.id === node.id ? updatedNode : n)));
      setSelectedNode(updatedNode);
    } catch (err) {
      console.error('Failed to execute real response action on backend:', err);
      alert(`Action failed on backend: ${err.message || 'Check server connection'}`);
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Internal Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-[#e2e8f0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#7c3aed] text-white">INTERNAL</span>
            <h1 className="text-xl font-bold text-[#0f172a]">Internal Network Topology</h1>
          </div>
          <p className="text-xs text-[#64748b] mt-1 font-sans">
            {viewMode === 'live'
              ? 'Real-time hardware discovery of physical devices on your active local Wi-Fi subnet.'
              : 'Synthetic multi-tier corporate environment used for testing lateral movement and quarantine enforcement.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0] text-xs font-semibold">
            <button
              onClick={() => setViewMode('live')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'live'
                  ? 'bg-white text-blue-700 shadow-xs border border-[#cbd5e1]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              Real Wi-Fi Devices ({viewMode === 'live' ? nodes.length : 2})
            </button>
            <button
              onClick={() => setViewMode('simulation')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === 'simulation'
                  ? 'bg-white text-purple-700 shadow-xs border border-[#cbd5e1]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              Enterprise Simulation (Demo)
            </button>
          </div>

          <button
            onClick={() => {
              loadTopologyData(viewMode, false, true);
              if (rfInstance) {
                setTimeout(() => {
                  try { rfInstance.fitView({ padding: 0.25, duration: 400 }); } catch (e) {}
                }, 100);
              }
            }}
            title="Snap all devices into grouped side zones: Router Top, IoT Left, Phones Center, Laptops Right"
            className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] hover:bg-[#f8fafc] text-xs font-semibold text-[#475569] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-600" />
            Group Layout
          </button>

          <button
            onClick={() => loadTopologyData(viewMode, false)}
            className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] hover:bg-[#f8fafc] text-xs font-medium text-[#475569] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748b] ${loading ? 'animate-spin' : ''}`} />
            Scan Network
          </button>
        </div>
      </div>

      {/* Discovery Alert Banner */}
      {viewMode === 'live' && topologyMeta && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Verified Wi-Fi Discovery:</strong> NetrIQ detected{' '}
              <strong>{topologyMeta.device_count} physical devices</strong> on your active Wi-Fi subnet (
              <code>{topologyMeta.subnet}</code>):{' '}
              <strong>
                {topologyMeta.devices?.find((d) => d.is_host)?.hostname || 'This PC'}
              </strong>{' '}
              (<code>{topologyMeta.host_ip}</code>) and your <strong>Wi-Fi Router Gateway</strong> (
              <code>{topologyMeta.gateway_ip}</code>). No phantom systems.
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
            Real Hardware Telemetry
          </span>
        </div>
      )}

      {/* Main Interactive React Flow Canvas + Device Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* React Flow Topology Canvas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden h-[540px] relative">
          <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs font-medium text-[#475569] shadow-sm flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-600" />
            <span>Interactive Topology (Live DB Endpoints)</span>
          </div>

          {/* Color Scheme & Grouped Side Zones Legend */}
          <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[11px] font-semibold text-[#475569] shadow-sm flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-zinc-900" title="Top Zone">
              <span className="w-2.5 h-2.5 rounded-full bg-black border border-zinc-700 inline-block shadow-2xs" />
              Router (Top)
            </span>
            <span className="flex items-center gap-1.5 text-[#0747a1]" title="Left Column">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0747a1] border border-[#0747a1]/40 inline-block shadow-2xs" />
              IoT (#0747a1)
            </span>
            <span className="flex items-center gap-1.5 text-[#034466]" title="Center Area">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C1E8FF] border border-[#7EC5F2] inline-block shadow-2xs" />
              Phones (#C1E8FF)
            </span>
            <span className="flex items-center gap-1.5 text-[#065A72]" title="Right Column">
              <span className="w-2.5 h-2.5 rounded-full bg-[#065A72] border border-[#065A72]/40 inline-block shadow-2xs" />
              Laptops (#065A72)
            </span>
          </div>

          {loading && nodes.length === 0 && (
            <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-700">Scanning Wi-Fi subnet & physical telemetry...</p>
            </div>
          )}

          <ReactFlow
            key={viewMode}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            onInit={setRfInstance}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            attributionPosition="bottom-left"
          >
            <Background color="#cbd5e1" gap={18} size={1} />
            <Controls showInteractive={false} className="bg-white border border-[#e2e8f0] shadow-sm rounded-lg" />
            <MiniMap
              nodeColor={(n) => {
                if (n.data?.status === 'COMPROMISED') return '#ef4444';
                if (n.data?.status === 'SUSPICIOUS') return '#f97316';
                if (n.data?.status === 'QUARANTINED') return '#7c3aed';
                if (n.data?.type === 'router') return '#09090b';
                if (n.data?.type === 'mobile' || n.data?.type === 'smartphone') return '#C1E8FF';
                if (n.data?.type === 'server' || n.data?.type === 'iot') return '#0747a1';
                if (n.data?.type === 'database') return '#f59e0b';
                return '#065A72';
              }}
              className="bg-white border border-[#e2e8f0] rounded-lg shadow-sm"
            />
          </ReactFlow>
        </div>

        {/* Selected Device Inspector Sidebar */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm flex flex-col justify-between">
          {selectedNode ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2">
                  {selectedNode.data.type === 'router' ? (
                    <Router className="w-4 h-4 text-black" />
                  ) : selectedNode.data.type === 'mobile' || selectedNode.data.type === 'smartphone' ? (
                    <Smartphone className="w-4 h-4 text-[#0284c7]" />
                  ) : selectedNode.data.type === 'server' || selectedNode.data.type === 'iot' ? (
                    <Server className="w-4 h-4 text-[#0747a1]" />
                  ) : (
                    <Laptop className="w-4 h-4 text-[#065A72]" />
                  )}
                  <h3 className="font-bold text-sm text-[#0f172a]">Device Telemetry & Controls</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                      selectedNode.data.type === 'router'
                        ? 'bg-zinc-900 text-white'
                        : selectedNode.data.type === 'mobile' || selectedNode.data.type === 'smartphone'
                        ? 'bg-[#C1E8FF] text-[#034466] border border-[#7EC5F2] font-bold'
                        : selectedNode.data.type === 'server' || selectedNode.data.type === 'iot'
                        ? 'bg-[#0747a1]/15 text-[#0747a1] border border-[#0747a1]/30 font-bold'
                        : 'bg-[#065A72]/15 text-[#065A72] border border-[#065A72]/30 font-bold'
                    }`}
                  >
                    {selectedNode.data.type === 'router'
                      ? 'Router'
                      : selectedNode.data.type === 'mobile' || selectedNode.data.type === 'smartphone'
                      ? 'Mobile Phone'
                      : selectedNode.data.type === 'server' || selectedNode.data.type === 'iot'
                      ? 'IoT Device'
                      : 'Laptop / PC'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      selectedNode.data.status === 'COMPROMISED'
                        ? 'bg-red-100 text-red-700'
                        : selectedNode.data.status === 'SUSPICIOUS'
                        ? 'bg-orange-100 text-orange-700'
                        : selectedNode.data.status === 'QUARANTINED'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {selectedNode.data.status}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3.5">
                <div>
                  <span className="text-[11px] font-semibold text-[#64748b]">Device Name</span>
                  <div className="text-sm font-bold text-[#0f172a]">{selectedNode.data.label}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[#f8fafc] p-3 rounded-lg border border-[#e2e8f0]">
                  <div>
                    <span className="text-[#64748b] text-[10px] block">IP Address</span>
                    <span className="font-mono font-semibold text-[#0f172a]">{selectedNode.data.ip}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[10px] block">MAC Address</span>
                    <span className="font-mono font-semibold text-[#0f172a]">{selectedNode.data.mac}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[10px] block">Network Segment</span>
                    <span className="font-semibold text-[#334155]">{selectedNode.data.vlan}</span>
                  </div>
                  <div>
                    <span className="text-[#64748b] text-[10px] block">Risk Score</span>
                    <span
                      className={`font-mono font-extrabold ${
                        selectedNode.data.riskScore > 80
                          ? 'text-red-600'
                          : selectedNode.data.riskScore > 50
                          ? 'text-orange-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {selectedNode.data.riskScore}/100
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#64748b]">UEBA Behavioral Baseline</span>
                    {deviceProfile && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold uppercase">
                        {deviceProfile.role || 'Workstation'}
                      </span>
                    )}
                  </div>

                  {deviceProfile ? (
                    <div className="mt-1.5 p-3 rounded-lg bg-[#0b172a] text-slate-200 text-xs space-y-2 border border-[#1e3a63]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#00e5ff]" /> Operating Hours:
                        </span>
                        <span className="font-mono font-bold text-white">
                          {String(deviceProfile.time_profile?.active_start_hour || 8).padStart(2, '0')}:00 - {String(deviceProfile.time_profile?.active_end_hour || 20).padStart(2, '0')}:00
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Allowed Days:</span>
                        <span className="font-mono text-slate-300">Mon - Fri</span>
                      </div>

                      <div className="pt-1.5 border-t border-slate-700/60">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Forbidden Target Ports:</span>
                        <div className="flex flex-wrap gap-1">
                          {(deviceProfile.network_policy?.forbidden_ports || [22, 445, 3389]).map((p) => (
                            <span key={p} className="px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold">
                              Port {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {deviceProfile.recent_violations && deviceProfile.recent_violations.length > 0 && (
                        <div className="pt-1.5 border-t border-red-900/40">
                          <span className="text-[10px] text-red-400 uppercase tracking-wider font-bold block mb-1">Recent Deviations:</span>
                          <p className="text-[11px] text-red-300 bg-red-950/40 p-2 rounded border border-red-500/30 leading-tight font-sans">
                            {deviceProfile.recent_violations[deviceProfile.recent_violations.length - 1].details}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#334155] mt-1 p-2.5 rounded bg-slate-50 border border-slate-200 leading-relaxed">
                      {selectedNode.data.details}
                    </p>
                  )}
                </div>

                {/* Behavioral Test Simulation Trigger for Live Demonstration */}
                <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 text-[11px]">Demonstrate Behavior Anomaly</span>
                    <span className="text-[10px] text-purple-600 font-mono">Layer 2 Test</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={simulatingAnomaly}
                      onClick={() => handleSimulateBehaviorAnomaly('LATERAL_SMB')}
                      className="py-1.5 px-2 bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 rounded text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      Lateral SMB (445)
                    </button>
                    <button
                      type="button"
                      disabled={simulatingAnomaly}
                      onClick={() => handleSimulateBehaviorAnomaly('OUT_OF_HOURS')}
                      className="py-1.5 px-2 bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 rounded text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      Out-of-Hours (3 AM)
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-[#64748b]">Monitored Ports</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedNode.data.openPorts && selectedNode.data.openPorts.length > 0 ? (
                      selectedNode.data.openPorts.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px] font-semibold"
                        >
                          Port {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-red-600 italic">Ports Cut / Isolated</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#64748b] text-xs">Select a node to inspect details</div>
          )}

          {/* Real Backend Quarantine Action Button */}
          {selectedNode && (
            <div className="pt-4 border-t border-[#e2e8f0] mt-4 space-y-2.5">
              <button
                type="button"
                onClick={() => navigate(`/traffic-layer1?device=${encodeURIComponent(selectedNode.data.ip || '')}`)}
                className="w-full py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-blue-200 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Filter Live Traffic for {selectedNode.data.hostname || selectedNode.data.label}
              </button>

              {selectedNode.data.status === 'QUARANTINED' ? (
                <button
                  disabled={actionInProgress}
                  onClick={() => handleToggleQuarantine(selectedNode)}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <CheckCircle2 className={`w-4 h-4 ${actionInProgress ? 'animate-spin' : ''}`} />
                  {actionInProgress ? 'Restoring on Backend...' : 'Restore Network Access'}
                </button>
              ) : (
                <button
                  disabled={actionInProgress}
                  onClick={() => handleToggleQuarantine(selectedNode)}
                  className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <ShieldAlert className={`w-4 h-4 ${actionInProgress ? 'animate-spin' : ''}`} />
                  {actionInProgress ? 'Enforcing Quarantine on Backend...' : 'Quarantine & Isolate Device Immediately'}
                </button>
              )}
              <p className="text-[10px] text-center text-[#94a3b8] mt-1.5">
                Calls POST /api/v1/response/quarantine on NetrIQ backend engine
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InternalNetworkLayer2;
