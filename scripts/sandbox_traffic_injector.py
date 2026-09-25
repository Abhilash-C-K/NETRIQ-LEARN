"""
NETRIQ Sandbox Traffic Injector
Generates realistic multi-day traffic telemetry for test devices in MongoDB
to test the Device Activity Trail drill-down in the UI.
"""

import os
import sys
import time
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

from backend.database.database import DatabaseManager

# Realistic test device profiles
DEVICES = {
    "192.168.1.105": {
        "role": "Eng Workstation (Compromised / C2 beaconing)",
        "flows": [
            {
                "offset_hours": 0.2,
                "dst_ip": "185.220.101.5",
                "dst_port": 443,
                "protocol": "TCP",
                "sni": "c2-beacon.darknet-relay.org",
                "severity": "CRITICAL",
                "prediction": "MALICIOUS",
                "confidence": 98.7,
                "action": "QUARANTINE",
                "is_anomaly": True,
                "is_internal": False,
                "reason": "Cryptographic heartbeat beaconing pattern matching CobaltStrike C2 profile."
            },
            {
                "offset_hours": 1.5,
                "dst_ip": "104.16.249.249",
                "dst_port": 443,
                "protocol": "TCP",
                "sni": "pastebin.com",
                "severity": "HIGH",
                "prediction": "SUSPICIOUS",
                "confidence": 88.4,
                "action": "RECOMMEND_BLOCK",
                "is_anomaly": True,
                "is_internal": False,
                "reason": "Anomalous outbound base64 payload transfer to unverified paste service."
            },
            {
                "offset_hours": 3.0,
                "dst_ip": "140.82.121.4",
                "dst_port": 443,
                "protocol": "TCP",
                "sni": "github.com",
                "severity": "LOW",
                "prediction": "BENIGN",
                "confidence": 99.1,
                "action": "NOTIFY",
                "is_anomaly": False,
                "is_internal": False,
                "reason": "Standard TLS development repo sync."
            },
            {
                "offset_hours": 14.0,
                "dst_ip": "8.8.8.8",
                "dst_port": 53,
                "protocol": "UDP",
                "sni": None,
                "severity": "MEDIUM",
                "prediction": "ANOMALY",
                "confidence": 76.5,
                "action": "NOTIFY",
                "is_anomaly": True,
                "is_internal": False,
                "reason": "DNS tunnel entropy anomaly detected on port 53 query volume."
            },
            {
                "offset_hours": 26.0,  # Yesterday
                "dst_ip": "185.199.108.133",
                "dst_port": 443,
                "protocol": "TCP",
                "sni": "raw.githubusercontent.com",
                "severity": "LOW",
                "prediction": "BENIGN",
                "confidence": 97.2,
                "action": "PASS",
                "is_anomaly": False,
                "is_internal": False,
                "reason": "Authorized raw asset dependency fetch."
            },
            {
                "offset_hours": 32.0,  # Yesterday
                "dst_ip": "194.26.29.112",
                "dst_port": 8080,
                "protocol": "TCP",
                "sni": "dropzone-upload.cc",
                "severity": "CRITICAL",
                "prediction": "MALICIOUS",
                "confidence": 99.4,
                "action": "QUARANTINE",
                "is_anomaly": True,
                "is_internal": False,
                "reason": "Data exfiltration attempt with high outbound byte ratio to untrusted ASN."
            },
            {
                "offset_hours": 50.0,  # 2 days ago
                "dst_ip": "142.250.190.46",
                "dst_port": 443,
                "protocol": "TCP",
                "sni": "accounts.google.com",
                "severity": "LOW",
                "prediction": "BENIGN",
                "confidence": 99.8,
                "action": "PASS",
                "is_anomaly": False,
                "is_internal": False,
                "reason": "User OAuth authentication flow."
            }
        ]
    },
    "192.168.1.50": {
        "role": "Internal Database Host (Target of lateral probe)",
        "flows": [
            {
                "offset_hours": 0.5,
                "dst_ip": "192.168.1.10",
                "dst_port": 22,
                "protocol": "TCP",
                "sni": None,
                "severity": "HIGH",
                "prediction": "MALICIOUS",
                "confidence": 91.2,
                "action": "RECOMMEND_BLOCK",
                "is_anomaly": True,
                "is_internal": True,
                "reason": "Internal SSH credential stuffing / brute-force signature across RFC1918 segment."
            },
            {
                "offset_hours": 2.0,
                "dst_ip": "192.168.1.25",
                "dst_port": 5432,
                "protocol": "TCP",
                "sni": None,
                "severity": "LOW",
                "prediction": "BENIGN",
                "confidence": 98.0,
                "action": "PASS",
                "is_anomaly": False,
                "is_internal": True,
                "reason": "Normal Postgres application query connection pool."
            },
            {
                "offset_hours": 18.0,
                "dst_ip": "192.168.1.1",
                "dst_port": 80,
                "protocol": "TCP",
                "sni": None,
                "severity": "MEDIUM",
                "prediction": "SUSPICIOUS",
                "confidence": 79.1,
                "action": "NOTIFY",
                "is_anomaly": True,
                "is_internal": True,
                "reason": "Unauthorized HTTP probe of gateway router administrative interface."
            },
            {
                "offset_hours": 28.0,
                "dst_ip": "1.1.1.1",
                "dst_port": 53,
                "protocol": "UDP",
                "sni": None,
                "severity": "LOW",
                "prediction": "BENIGN",
                "confidence": 99.5,
                "action": "PASS",
                "is_anomaly": False,
                "is_internal": False,
                "reason": "Cloudflare DNS standard resolution."
            }
        ]
    },
    "10.0.0.12": {
        "role": "Executive Laptop (Safe baseline)",
        "flows": [
            {
                "offset_hours": 1.0,
                "dst_ip": "13.107.42.16",
                "dst_port": 443,
                "protocol": "TCP",
                "sni": "teams.microsoft.com",
                "severity": "LOW",
                "prediction": "BENIGN",
                "confidence": 99.7,
                "action": "PASS",
                "is_anomaly": False,
                "is_internal": False,
                "reason": "Encrypted VoIP conferencing flow."
            },
            {
                "offset_hours": 4.5,
                "dst_ip": "54.192.18.32",
                "dst_port": 443,
                "protocol": "TCP",
                "sni": "slack.com",
                "severity": "LOW",
                "prediction": "BENIGN",
                "confidence": 99.6,
                "action": "NOTIFY",
                "is_anomaly": False,
                "is_internal": False,
                "reason": "Corporate chat messaging telemetry."
            }
        ]
    }
}

async def run_injection():
    print("[Sandbox] Connecting to MongoDB...")
    await DatabaseManager.connect_db()
    db = DatabaseManager.get_db()
    now = time.time()

    threats_col = db["threats"]
    incidents_col = db["incidents"]

    total_inserted = 0

    print("[Sandbox] Seeding multi-day device telemetry flows into 'threats' collection...")
    for ip, data in DEVICES.items():
        src_port_base = 51000
        for f in data["flows"]:
            flow_ts = now - (f["offset_hours"] * 3600)
            src_port = src_port_base + int(f["offset_hours"] * 10) % 5000
            
            doc = {
                "timestamp": flow_ts,
                "src_ip": ip,
                "dst_ip": f["dst_ip"],
                "src_port": src_port,
                "dst_port": f["dst_port"],
                "protocol": f["protocol"],
                "sni": f["sni"],
                "severity": f["severity"],
                "risk_category": f["severity"].lower(),
                "action": f["action"],
                "action_taken": f["action"],
                "prediction": f["prediction"],
                "confidence": f["confidence"],
                "is_anomaly": f["is_anomaly"],
                "is_internal": f["is_internal"],
                "reason": f["reason"],
                "model_used": "XGBoostFusionEnsemble",
                "source": "sandbox_generator",
                "raw_data": {
                    "synthetic": True,
                    "simulated_latency_ms": 1.42,
                    "packet_count": 84,
                    "byte_count": 42180,
                    "device_role": data["role"]
                }
            }
            await threats_col.insert_one(doc)
            total_inserted += 1

    print(f"[Sandbox] Successfully inserted {total_inserted} traffic flows for test devices.")

    # Seed 2 realistic incidents linked to these devices
    print("[Sandbox] Ensuring test incidents exist with affected assets...")
    incidents_to_seed = [
        {
            "id": "inc-sandbox-105",
            "status": "active",
            "severity": "CRITICAL",
            "description": "Critical CobaltStrike C2 Beaconing and Exfiltration attempt detected from engineering workstation.",
            "created_at": now - 3600 * 2,
            "updated_at": now - 3600 * 0.2,
            "affected_assets": ["192.168.1.105"],
            "response_action": "QUARANTINE",
            "response_success": True,
            "notes": "Automated Layer 2 SDN quarantine triggered. Pending SOC forensic analysis."
        },
        {
            "id": "inc-sandbox-50",
            "status": "investigating",
            "severity": "HIGH",
            "description": "Lateral reconnaissance and SSH credential stuffing targeting internal subnet services.",
            "created_at": now - 3600 * 5,
            "updated_at": now - 3600 * 1,
            "affected_assets": ["192.168.1.50"],
            "response_action": "RECOMMEND_BLOCK",
            "response_success": False,
            "notes": "Firewall block recommendation awaiting analyst signoff."
        }
    ]

    for inc in incidents_to_seed:
        await incidents_col.update_one(
            {"id": inc["id"]},
            {"$set": inc},
            upsert=True
        )
    print(f"[Sandbox] Seeded {len(incidents_to_seed)} incident records.")

    print("\n" + "="*60)
    print("SANDBOX TEST DATA READY")
    print("="*60)
    print("Test Devices Available for Drill-Down:")
    for ip, data in DEVICES.items():
        print(f"  • {ip} ({data['role']}) -> {len(data['flows'])} flows across 3 days")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(run_injection())
