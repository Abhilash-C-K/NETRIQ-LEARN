"""
NETRIQ Countermeasure Engine
Translates AI model verdicts, risk levels, and SHAP feature attributions into
actionable, NIST SP 800-61 aligned incident response playbooks for SOC analysts.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from backend.utils.logger import get_logger

logger = get_logger(__name__)


class CountermeasurePhase(str, Enum):
    CONTAINMENT = "Containment"
    ERADICATION = "Eradication"
    RECOVERY = "Recovery"


class CountermeasureStatus(str, Enum):
    AUTOMATED = "AUTOMATED"
    PENDING_SOC = "PENDING_SOC"
    MANUAL = "MANUAL"


class CountermeasureItem(BaseModel):
    id: str = Field(description="Unique countermeasure identifier")
    phase: CountermeasurePhase = Field(description="NIST incident response phase")
    title: str = Field(description="Concise action title")
    status: CountermeasureStatus = Field(description="Execution status")
    executor: str = Field(description="Entity responsible: NETRIQ Autonomous Engine or Human SOC Analyst")
    instructions: str = Field(description="Step-by-step guidance for the analyst")
    completed: bool = Field(default=False, description="Whether this countermeasure is executed/done")
    mitre_technique: Optional[str] = Field(default=None, description="MITRE ATT&CK technique reference")
    automatable: bool = Field(default=False, description="Whether NETRIQ engine has capability to execute this")


class CountermeasurePlaybook(BaseModel):
    threat_type: str
    category: str
    mitre_id: str
    confidence: float
    automated_count: int
    manual_count: int
    steps: List[CountermeasureItem]


# Curated, authoritative playbooks mapped to model threat classes & MITRE ATT&CK
PLAYBOOK_REGISTRY: Dict[str, Dict[str, Any]] = {
    "ddos": {
        "category": "Volumetric Denial-of-Service",
        "mitre_id": "T1498 - Network Denial of Service",
        "steps": [
            {
                "id": "DDOS-CM-1",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Drop Malicious Flow at Pre-Firewall Ingress",
                "automatable": True,
                "instructions": "NETRIQ automatically drops offending packet streams at External pre-firewall filter before TCP connection state tables exhaust.",
            },
            {
                "id": "DDOS-CM-2",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Enable Edge Rate-Limiting & SYN Cookies",
                "automatable": False,
                "instructions": "Log into perimeter gateway/upstream router. Confirm SYN flood defense is active and configure threshold rate-limiting.",
            },
            {
                "id": "DDOS-CM-3",
                "phase": CountermeasurePhase.ERADICATION,
                "title": "Verify State Table & Socket Normalization",
                "automatable": False,
                "instructions": "Check server connection pool metrics to verify SYN_RECV sockets have dropped back to nominal baseline levels (<2%).",
            },
            {
                "id": "DDOS-CM-4",
                "phase": CountermeasurePhase.RECOVERY,
                "title": "Threat Intelligence Cross-Reference",
                "automatable": False,
                "instructions": "Cross-reference source IP subnet in VirusTotal or AbuseIPDB to determine whether this belongs to a known botnet cluster before removing block.",
            },
        ],
    },
    "port_scan": {
        "category": "Network Reconnaissance",
        "mitre_id": "T1046 - Network Service Discovery",
        "steps": [
            {
                "id": "SCAN-CM-1",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Blacklist Scanning IP on Boundary Firewall",
                "automatable": True,
                "instructions": "NETRIQ pushes source IP to External drop table to halt ongoing port enumeration sweep.",
            },
            {
                "id": "SCAN-CM-2",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Verify Ingress Filtering on Target Ports",
                "automatable": False,
                "instructions": "Review edge ACLs on destination ports probed during scan (e.g. 22, 445, 3389, 8080) to ensure non-public services remain blocked.",
            },
            {
                "id": "SCAN-CM-3",
                "phase": CountermeasurePhase.ERADICATION,
                "title": "Audit Target Host Authentication Logs",
                "automatable": False,
                "instructions": "Inspect authentication logs on probed target IPs to confirm scanner did not discover open services or attempt secondary password guessing.",
            },
            {
                "id": "SCAN-CM-4",
                "phase": CountermeasurePhase.RECOVERY,
                "title": "Close Unnecessary Listening Sockets",
                "automatable": False,
                "instructions": "Review active server listening sockets and close unused development or testing ports exposed to the segment.",
            },
        ],
    },
    "lateral_movement": {
        "category": "Internal Zero-Trust Breach",
        "mitre_id": "T1021 - Remote Services: SMB / RPC Administration",
        "steps": [
            {
                "id": "LAT-CM-1",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Isolate Endpoint via Internal Quarantine",
                "automatable": True,
                "instructions": "NETRIQ executes Internal port isolation or reassigns compromised device to Quarantine VLAN 99, cutting host-to-host spread.",
            },
            {
                "id": "LAT-CM-2",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Verify Peer-to-Peer Block on Internal Switch",
                "automatable": False,
                "instructions": "Verify internal switch ACLs ensure zero packet leakage between quarantined host and core domain controllers.",
            },
            {
                "id": "LAT-CM-3",
                "phase": CountermeasurePhase.ERADICATION,
                "title": "Revoke Compromised Credentials & Active Tokens",
                "automatable": False,
                "instructions": "Force password reset for all user accounts authenticated on the quarantined endpoint. Invalidate active Kerberos TGT and NTLM sessions.",
            },
            {
                "id": "LAT-CM-4",
                "phase": CountermeasurePhase.ERADICATION,
                "title": "Scan Endpoint for Credential Dumping Tools",
                "automatable": False,
                "instructions": "Run forensic EDR scan on quarantined machine to search for Mimikatz, PsExec, or unauthorized administrative scripts in Temp directories.",
            },
            {
                "id": "LAT-CM-5",
                "phase": CountermeasurePhase.RECOVERY,
                "title": "Clean Re-image & Controlled Restoration",
                "automatable": False,
                "instructions": "Re-image or disinfect host system files, verify endpoint security agent health, then restore network access via NetrIQ Quarantine page.",
            },
        ],
    },
    "c2_exfiltration": {
        "category": "Command & Control / Data Exfiltration",
        "mitre_id": "T1071 - Application Layer Protocol: C2 Beaconing",
        "steps": [
            {
                "id": "C2-CM-1",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Terminate Active C2 Communication Socket",
                "automatable": True,
                "instructions": "NETRIQ closes active TCP socket session and blocks remote destination IP/domain at edge filter.",
            },
            {
                "id": "C2-CM-2",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Sinkhole Secondary Fallback Domains",
                "automatable": False,
                "instructions": "Inspect DNS query history from source host and sinkhole any secondary domains sharing the same nameserver or certificate authority.",
            },
            {
                "id": "C2-CM-3",
                "phase": CountermeasurePhase.ERADICATION,
                "title": "Terminate Beaconing Process on Endpoint",
                "automatable": False,
                "instructions": "Identify anomalous process binding network socket using 'netstat -b' or Process Explorer, kill process tree, and quarantine binary.",
            },
            {
                "id": "C2-CM-4",
                "phase": CountermeasurePhase.ERADICATION,
                "title": "Audit Host Persistence Hooks",
                "automatable": False,
                "instructions": "Inspect Scheduled Tasks, Registry Run keys, and WMI event subscriptions on host to remove persistence mechanisms.",
            },
            {
                "id": "C2-CM-5",
                "phase": CountermeasurePhase.RECOVERY,
                "title": "PCAP Forensics & Post-Incident Report",
                "automatable": False,
                "instructions": "Export packet capture from NetrIQ Reports to quantify bytes exfiltrated before containment, and file compliance disclosure if PII was accessed.",
            },
        ],
    },
    "brute_force": {
        "category": "Credential Abuse / Brute Force",
        "mitre_id": "T1110 - Brute Force Authentication",
        "steps": [
            {
                "id": "BF-CM-1",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Enforce Lockout & Rate-Limit Attacker IP",
                "automatable": True,
                "instructions": "NETRIQ locks target user account after repeated failed attempts and applies temporary IP connection throttle.",
            },
            {
                "id": "BF-CM-2",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Invalidate All Active Web Sessions",
                "automatable": False,
                "instructions": "Purge active session tokens for targeted user account to prevent session hijacking if credentials were partially verified.",
            },
            {
                "id": "BF-CM-3",
                "phase": CountermeasurePhase.ERADICATION,
                "title": "Confirm No Successful Unauthorized Logins",
                "automatable": False,
                "instructions": "Inspect auth logs around the event timestamp to confirm that no login request succeeded prior to account lockout.",
            },
            {
                "id": "BF-CM-4",
                "phase": CountermeasurePhase.RECOVERY,
                "title": "MFA Re-enrollment & Secure Password Reset",
                "automatable": False,
                "instructions": "Require user to complete out-of-band MFA verification and reset password according to enterprise complexity policy.",
            },
        ],
    },
    "generic": {
        "category": "Suspicious Behavioral Anomaly",
        "mitre_id": "T1059 - Command and Scripting Interpreter",
        "steps": [
            {
                "id": "GEN-CM-1",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Flag Incident & Capture Flow Telemetry",
                "automatable": True,
                "instructions": "NETRIQ flags event in SOC queue and logs flow features for immediate analyst triage.",
            },
            {
                "id": "GEN-CM-2",
                "phase": CountermeasurePhase.CONTAINMENT,
                "title": "Review Top SHAP Feature Contributors",
                "automatable": False,
                "instructions": "Review the SHAP feature attribution card in NetrIQ to identify which specific metric (packet size, entropy, port) triggered the alert.",
            },
            {
                "id": "GEN-CM-3",
                "phase": CountermeasurePhase.ERADICATION,
                "title": "Host Log Cross-Correlation",
                "automatable": False,
                "instructions": "Correlate event timestamp with endpoint event logs (Event ID 4688 Process Creation or Syslog) to identify originating application.",
            },
            {
                "id": "GEN-CM-4",
                "phase": CountermeasurePhase.RECOVERY,
                "title": "Tune Baseline or Establish Permanent Rule",
                "automatable": False,
                "instructions": "If activity is legitimate business traffic, adjust model baseline in Settings. If malicious, escalate to incident response team.",
            },
        ],
    },
}


class CountermeasureEngine:
    """
    Evaluates incident telemetry and returns prioritized, personalized countermeasures.
    Marks actions as AUTOMATED only if NETRIQ's response engine actually executed them.
    """

    @classmethod
    def _match_category(cls, threat_type: str) -> str:
        t = (threat_type or "").lower()
        if any(w in t for w in ["ddos", "syn", "flood", "volumetric", "udp", "icmp"]):
            return "ddos"
        if any(w in t for w in ["scan", "probe", "recon", "nmap", "discovery", "sweep"]):
            return "port_scan"
        if any(w in t for w in ["lateral", "smb", "rpc", "pass-the-hash", "quarantine", "internal"]):
            return "lateral_movement"
        if any(w in t for w in ["c2", "beacon", "exfiltration", "cobalt", "dns", "tunnel"]):
            return "c2_exfiltration"
        if any(w in t for w in ["brute", "password", "spray", "credential", "login"]):
            return "brute_force"
        return "generic"

    @classmethod
    def generate_playbook(
        cls,
        threat_type: str,
        confidence: float = 0.90,
        is_internal: bool = False,
        response_action: Optional[str] = None,
        top_features: Optional[List[Dict[str, Any]]] = None,
    ) -> CountermeasurePlaybook:
        """
        Generates a customized CountermeasurePlaybook based on threat classification
        and response actions already executed by NETRIQ.
        """
        category_key = cls._match_category(threat_type)
        entry = PLAYBOOK_REGISTRY.get(category_key, PLAYBOOK_REGISTRY["generic"])

        steps: List[CountermeasureItem] = []
        automated_count = 0
        manual_count = 0

        # Normalization
        conf_normalized = confidence if confidence <= 1.0 else confidence / 100.0
        resp_act_clean = (response_action or "").lower()

        # Determine whether NETRIQ has already executed automated containment
        has_executed_automated = (
            "quarantine" in resp_act_clean
            or "block" in resp_act_clean
            or "drop" in resp_act_clean
            or "mitigated" in resp_act_clean
            or (is_internal and conf_normalized >= 0.75)
            or (not is_internal and conf_normalized >= 0.85)
        )

        for idx, template in enumerate(entry["steps"]):
            is_first_containment = (template["phase"] == CountermeasurePhase.CONTAINMENT and idx == 0)

            # Mark as AUTOMATED only if automatable AND action was really executed
            if template["automatable"] and has_executed_automated and is_first_containment:
                status = CountermeasureStatus.AUTOMATED
                executor = "NETRIQ Autonomous Engine"
                completed = True
                automated_count += 1
            else:
                status = CountermeasureStatus.MANUAL
                executor = "Human SOC Analyst"
                completed = False
                manual_count += 1

            # Personalize instructions with top SHAP feature if available
            instructions = template["instructions"]
            if idx == 0 and top_features and len(top_features) > 0:
                top_feat = top_features[0].get("feature") or top_features[0].get("name")
                if top_feat:
                    instructions += f" (Triggered by anomaly in: {top_feat})"

            steps.append(
                CountermeasureItem(
                    id=template["id"],
                    phase=template["phase"],
                    title=template["title"],
                    status=status,
                    executor=executor,
                    instructions=instructions,
                    completed=completed,
                    mitre_technique=entry["mitre_id"],
                    automatable=template["automatable"],
                )
            )

        return CountermeasurePlaybook(
            threat_type=threat_type,
            category=entry["category"],
            mitre_id=entry["mitre_id"],
            confidence=conf_normalized,
            automated_count=automated_count,
            manual_count=manual_count,
            steps=steps,
        )


countermeasure_engine = CountermeasureEngine()
