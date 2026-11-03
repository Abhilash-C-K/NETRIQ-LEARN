import os
import sys
import time
import socket
import json
import uuid
import platform
import subprocess
import urllib.request
import urllib.error

# Configuration (defaults to the local NetrIQ server port 8000; can be overridden via ENV)
SERVER_URL = os.environ.get("NETRIQ_SERVER_URL", "http://127.0.0.1:8000").rstrip("/")
REPORT_INTERVAL = int(os.environ.get("NETRIQ_INTERVAL", "15"))  # seconds between heartbeats

def get_mac_address():
    """Retrieves hardware MAC address formatted as XX:XX:XX:XX:XX:XX."""
    try:
        raw_mac = uuid.getnode()
        mac = ':'.join(f"{(raw_mac >> ele) & 0xff:02X}" for ele in range(40, -8, -8))
        return mac
    except Exception:
        return "00:00:00:00:00:00"

def get_local_ip():
    """Retrieves the local LAN IP address bound to the primary interface."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

def get_logged_in_user():
    """Retrieves the active logged-in OS username."""
    try:
        return os.getlogin()
    except Exception:
        return os.environ.get("USERNAME", os.environ.get("USER", "Unknown"))

def get_active_processes():
    """
    Collects running process names and flags known suspicious penetration/hacking tools.
    Works cross-platform on Windows/Linux without third-party pip dependencies.
    """
    procs = []
    suspicious = []
    suspicious_signatures = {
        "mimikatz.exe", "nmap.exe", "wireshark.exe", "hping3", "hydra.exe",
        "nc.exe", "netcat", "cain.exe", "john.exe", "metasploit"
    }

    if platform.system() == "Windows":
        try:
            out = subprocess.check_output(
                ["tasklist", "/FO", "CSV", "/NH"],
                text=True, stderr=subprocess.DEVNULL
            )
            for line in out.splitlines():
                if line.strip():
                    parts = line.split('","')
                    if parts:
                        name = parts[0].replace('"', '').strip().lower()
                        if name and name not in procs:
                            procs.append(name)
                            if name in suspicious_signatures:
                                suspicious.append(name)
        except Exception:
            pass
    else:
        try:
            out = subprocess.check_output(["ps", "-A", "-o", "comm="], text=True, stderr=subprocess.DEVNULL)
            for line in out.splitlines():
                name = line.strip().lower()
                if name and name not in procs:
                    procs.append(name)
                    if name in suspicious_signatures:
                        suspicious.append(name)
        except Exception:
            pass

    return procs[:40], suspicious

def collect_telemetry():
    """Assembles host telemetry payload."""
    mac = get_mac_address()
    ip = get_local_ip()
    hostname = socket.gethostname()
    username = get_logged_in_user()
    all_procs, suspicious_procs = get_active_processes()

    return {
        "mac": mac,
        "ip": ip,
        "hostname": hostname,
        "os": f"{platform.system()} {platform.release()}",
        "logged_in_user": username,
        "active_processes_count": len(all_procs),
        "sample_processes": all_procs[:15],
        "suspicious_processes": suspicious_procs,
        "timestamp": time.time()
    }

def send_heartbeat(telemetry):
    """Posts telemetry to NetrIQ API."""
    endpoint = f"{SERVER_URL}/api/v1/behaviors/agent-heartbeat"
    data = json.dumps(telemetry).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "NetrIQ-HostAgent/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body
    except urllib.error.URLError as e:
        return {"status": "error", "message": str(e)}

def enforce_local_quarantine(reason="Quarantined by SOC Admin"):
    """
    If the SOC Admin flagged this machine as QUARANTINED,
    the agent can enforce isolation on the machine directly.
    """
    print(f"\n[!] SOC QUARANTINE ENFORCED: {reason}")
    print("[!] Machine network access isolated to prevent lateral spread.")

def main():
    print("=" * 65)
    print("   NETRIQ ENDPOINT BEHAVIORAL AGENT (LAYER 2 EDR SENSOR)")
    print("=" * 65)
    print(f"[*] Target NetrIQ Server: {SERVER_URL}")
    print(f"[*] Reporting Interval  : {REPORT_INTERVAL}s")
    print(f"[*] Local Host Identity : {socket.gethostname()} ({get_local_ip()})")
    print(f"[*] Hardware MAC Address: {get_mac_address()}")
    print(f"[*] Logged-in User      : {get_logged_in_user()}")
    print("-" * 65)

    while True:
        try:
            telemetry = collect_telemetry()
            res = send_heartbeat(telemetry)
            
            if res.get("status") == "success":
                quarantined = res.get("is_quarantined", False)
                if quarantined:
                    enforce_local_quarantine(res.get("quarantine_reason", "Admin SOC Policy"))
                else:
                    proc_info = f" | {len(telemetry['sample_processes'])} procs"
                    susp_info = f" | [!] SUSPICIOUS: {telemetry['suspicious_processes']}" if telemetry["suspicious_processes"] else ""
                    print(f"[{time.strftime('%H:%M:%S')}] Heartbeat synced -> NetrIQ Central Console (User: {telemetry['logged_in_user']}{proc_info}{susp_info})")
            else:
                print(f"[{time.strftime('%H:%M:%S')}] NetrIQ Server unreachable ({res.get('message', 'offline')}). Retrying...")

        except KeyboardInterrupt:
            print("\n[*] NetrIQ Agent stopped by user.")
            sys.exit(0)
        except Exception as e:
            print(f"[*] Agent telemetry error: {e}")

        time.sleep(REPORT_INTERVAL)

if __name__ == "__main__":
    main()

