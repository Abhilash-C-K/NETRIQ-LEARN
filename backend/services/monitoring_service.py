import asyncio
import time
import threading
from typing import Dict, Any, Optional
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.websocket.broadcaster import broadcaster
from backend.websocket.events import MonitorStatusEvent
from backend.live_monitor.monitor_service import monitor_service as live_monitor

logger = get_logger(__name__)


# Top Known Consumer & Enterprise Hardware Vendors (OUI -> Vendor, Category, Friendly Prefix)
TOP_MAC_VENDORS = {
    # Smart IoT & Microcontrollers
    '10:BD:A3': ('Espressif', 'server', 'Espressif Smart IoT'),
    '18:FE:34': ('Espressif', 'server', 'Espressif Smart IoT'),
    '24:0A:C4': ('Espressif', 'server', 'Espressif Smart IoT'),
    '24:62:AB': ('Espressif', 'server', 'Espressif Smart IoT'),
    '24:6F:28': ('Espressif', 'server', 'Espressif Smart IoT'),
    '24:DC:C3': ('Espressif', 'server', 'Espressif Smart IoT'),
    '30:AE:A4': ('Espressif', 'server', 'Espressif Smart IoT'),
    '3C:61:05': ('Espressif', 'server', 'Espressif Smart IoT'),
    '3C:71:BF': ('Espressif', 'server', 'Espressif Smart IoT'),
    '48:3F:DA': ('Espressif', 'server', 'Espressif Smart IoT'),
    '48:55:19': ('Espressif', 'server', 'Espressif Smart IoT'),
    '4C:11:AE': ('Espressif', 'server', 'Espressif Smart IoT'),
    '54:43:B2': ('Espressif', 'server', 'Espressif Smart IoT'),
    '54:5A:A6': ('Espressif', 'server', 'Espressif Smart IoT'),
    '5C:CF:7F': ('Espressif', 'server', 'Espressif Smart IoT'),
    '60:01:94': ('Espressif', 'server', 'Espressif Smart IoT'),
    '68:C6:3A': ('Espressif', 'server', 'Espressif Smart IoT'),
    '70:03:9F': ('Espressif', 'server', 'Espressif Smart IoT'),
    '7C:DF:A1': ('Espressif', 'server', 'Espressif Smart IoT'),
    '84:0D:8E': ('Espressif', 'server', 'Espressif Smart IoT'),
    '84:F3:EB': ('Espressif', 'server', 'Espressif Smart IoT'),
    '90:97:D5': ('Espressif', 'server', 'Espressif Smart IoT'),
    'A0:20:A6': ('Espressif', 'server', 'Espressif Smart IoT'),
    'A4:CF:12': ('Espressif', 'server', 'Espressif Smart IoT'),
    'A4:E5:7C': ('Espressif', 'server', 'Espressif Smart IoT'),
    'AC:67:B2': ('Espressif', 'server', 'Espressif Smart IoT'),
    'B4:E6:2D': ('Espressif', 'server', 'Espressif Smart IoT'),
    'BC:DD:C2': ('Espressif', 'server', 'Espressif Smart IoT'),
    'C4:4F:33': ('Espressif', 'server', 'Espressif Smart IoT'),
    'C8:2B:96': ('Espressif', 'server', 'Espressif Smart IoT'),
    'CC:50:E3': ('Espressif', 'server', 'Espressif Smart IoT'),
    'D8:A0:1D': ('Espressif', 'server', 'Espressif Smart IoT'),
    'DC:4F:22': ('Espressif', 'server', 'Espressif Smart IoT'),
    'E0:98:06': ('Espressif', 'server', 'Espressif Smart IoT'),
    'E8:31:CD': ('Espressif', 'server', 'Espressif Smart IoT'),
    'EC:FA:BC': ('Espressif', 'server', 'Espressif Smart IoT'),
    '00:17:C8': ('Kyocera', 'server', 'Kyocera Smart Device'),
    '00:0A:79': ('Kyocera', 'server', 'Kyocera Smart Device'),
    '00:21:44': ('Kyocera', 'server', 'Kyocera Smart Device'),
    '00:25:07': ('Kyocera', 'server', 'Kyocera Smart Device'),
    '18:69:D8': ('Tuya', 'server', 'Tuya Smart IoT'),
    '68:57:2D': ('Tuya', 'server', 'Tuya Smart Plug'),
    '70:89:76': ('Tuya', 'server', 'Tuya Smart Device'),
    'B8:27:EB': ('Raspberry Pi', 'server', 'Raspberry Pi System'),
    'DC:A6:32': ('Raspberry Pi', 'server', 'Raspberry Pi 4'),
    'E4:5F:01': ('Raspberry Pi', 'server', 'Raspberry Pi 4'),
    '28:CD:C1': ('Raspberry Pi', 'server', 'Raspberry Pi 5'),
    '00:FC:8B': ('Amazon', 'server', 'Amazon Echo / Alexa'),
    '18:74:2E': ('Amazon', 'server', 'Amazon Echo / Alexa'),
    '34:D2:70': ('Amazon', 'server', 'Amazon Echo / Alexa'),
    '44:65:0D': ('Amazon', 'server', 'Amazon Fire TV / Echo'),

    # Mobile Devices & Smartphones (Apple, Samsung, Xiaomi, OnePlus, Google, etc.)
    '3C:06:30': ('Apple', 'mobile', 'Apple iPhone / Mobile'),
    'F8:38:80': ('Apple', 'mobile', 'Apple iPhone / Mobile'),
    'AC:BC:32': ('Apple', 'mobile', 'Apple Device'),
    '28:E0:2C': ('Apple', 'mobile', 'Apple iPhone'),
    'A4:C3:61': ('Apple', 'mobile', 'Apple iPhone'),
    'B8:17:C2': ('Apple', 'mobile', 'Apple iPhone'),
    'C8:2A:14': ('Apple', 'mobile', 'Apple iPhone'),
    'D8:96:95': ('Apple', 'mobile', 'Apple iPhone'),
    'F4:F1:5A': ('Apple', 'mobile', 'Apple iPhone'),
    'F0:18:98': ('Apple', 'mobile', 'Apple iPhone'),
    '70:3E:AC': ('Apple', 'mobile', 'Apple iPhone'),
    '00:1C:B3': ('Apple', 'mobile', 'Apple Device'),
    '04:54:53': ('Apple', 'mobile', 'Apple iPhone'),
    '04:E5:36': ('Apple', 'mobile', 'Apple iPhone'),
    '0C:51:01': ('Apple', 'mobile', 'Apple iPhone'),
    '18:34:51': ('Apple', 'mobile', 'Apple iPhone'),
    '24:A0:74': ('Apple', 'mobile', 'Apple iPhone'),
    '34:08:BC': ('Apple', 'mobile', 'Apple iPhone'),
    '40:4D:7F': ('Apple', 'mobile', 'Apple iPhone'),
    '48:43:7C': ('Apple', 'mobile', 'Apple iPhone'),
    '60:03:08': ('Apple', 'mobile', 'Apple iPhone'),
    '68:96:7B': ('Apple', 'mobile', 'Apple iPhone'),
    '7C:04:D0': ('Apple', 'mobile', 'Apple iPhone'),
    '88:66:5A': ('Apple', 'mobile', 'Apple iPhone'),
    '98:01:A7': ('Apple', 'mobile', 'Apple iPhone'),
    'A8:66:7F': ('Apple', 'mobile', 'Apple iPhone'),
    'CC:29:F5': ('Apple', 'mobile', 'Apple iPhone'),
    'E4:CE:8F': ('Apple', 'mobile', 'Apple iPhone'),

    '28:11:A8': ('Samsung', 'mobile', 'Samsung Galaxy Mobile'),
    'CC:3A:61': ('Samsung', 'mobile', 'Samsung Galaxy Mobile'),
    '00:07:AB': ('Samsung', 'mobile', 'Samsung Mobile'),
    '00:12:47': ('Samsung', 'mobile', 'Samsung Mobile'),
    '00:23:D7': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '08:08:C2': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '14:89:FD': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '24:4B:03': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '34:23:BA': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '48:44:F7': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '54:40:AD': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '64:1C:AE': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '78:40:E4': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '84:25:19': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '90:18:7C': ('Samsung', 'mobile', 'Samsung Galaxy'),
    '98:52:B1': ('Samsung', 'mobile', 'Samsung Galaxy'),
    'A0:82:1F': ('Samsung', 'mobile', 'Samsung Galaxy'),
    'B0:C4:E7': ('Samsung', 'mobile', 'Samsung Galaxy'),
    'BC:44:86': ('Samsung', 'mobile', 'Samsung Galaxy'),
    'C0:97:27': ('Samsung', 'mobile', 'Samsung Galaxy'),
    'D0:22:BE': ('Samsung', 'mobile', 'Samsung Galaxy'),
    'DC:71:44': ('Samsung', 'mobile', 'Samsung Galaxy'),
    'E4:58:B8': ('Samsung', 'mobile', 'Samsung Galaxy'),
    'F4:7B:5E': ('Samsung', 'mobile', 'Samsung Galaxy'),

    '50:64:2B': ('Xiaomi', 'mobile', 'Xiaomi / Redmi Phone'),
    '18:59:36': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    '28:6C:07': ('Xiaomi', 'mobile', 'Xiaomi / Poco Phone'),
    '34:80:62': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    '50:80:4A': ('Xiaomi', 'mobile', 'Redmi Phone'),
    '64:CC:2E': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    '78:11:DC': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    '7C:49:EB': ('Xiaomi', 'mobile', 'Redmi / Xiaomi Phone'),
    '8C:BE:BE': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    '9C:99:A0': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    'A4:C4:94': ('Xiaomi', 'mobile', 'Redmi Phone'),
    'AC:C1:EE': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    'B0:E5:ED': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    'C4:0B:D3': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    'D4:97:0B': ('Xiaomi', 'mobile', 'Redmi Phone'),
    'E4:46:DA': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    'F4:60:E2': ('Xiaomi', 'mobile', 'Xiaomi Phone'),
    'FC:E5:57': ('Xiaomi', 'mobile', 'Xiaomi Phone'),

    '44:D8:32': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    '50:8F:4C': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    '60:AB:67': ('Oppo / OnePlus', 'mobile', 'Oppo / OnePlus Mobile'),
    '70:8A:09': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    '88:C9:D0': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    '94:65:2D': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    '98:CD:AC': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    'A0:C9:A0': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    'A4:75:B9': ('Realme / Oppo', 'mobile', 'Realme Mobile Phone'),
    'AC:D6:18': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    'B4:0B:44': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    'C8:38:70': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    'DC:72:9B': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    'E8:8D:28': ('OnePlus', 'mobile', 'OnePlus Mobile'),
    'F8:A9:D0': ('OnePlus', 'mobile', 'OnePlus Mobile'),

    '14:5B:D1': ('Vivo', 'mobile', 'Vivo Mobile Phone'),
    '38:97:D6': ('Vivo', 'mobile', 'Vivo Mobile Phone'),
    '4C:91:8E': ('Vivo', 'mobile', 'Vivo Mobile Phone'),
    '78:53:7E': ('Vivo', 'mobile', 'Vivo Mobile Phone'),
    '84:5B:42': ('Vivo', 'mobile', 'Vivo Mobile Phone'),
    'A0:86:C6': ('Vivo', 'mobile', 'Vivo Mobile Phone'),
    'B4:98:42': ('Vivo', 'mobile', 'Vivo Mobile Phone'),
    'C4:3A:BE': ('Vivo', 'mobile', 'Vivo Mobile Phone'),
    'DC:B5:4F': ('Vivo', 'mobile', 'Vivo Mobile Phone'),

    '00:1A:11': ('Google Pixel', 'mobile', 'Google Pixel Phone'),
    '3C:5A:B4': ('Google Pixel', 'mobile', 'Google Pixel Phone'),
    '54:60:09': ('Google', 'mobile', 'Google Device'),
    'A4:77:33': ('Google', 'mobile', 'Google Pixel Phone'),
    'D8:6C:63': ('Google', 'mobile', 'Google Pixel Phone'),
    'E4:F0:42': ('Google', 'mobile', 'Google Pixel Phone'),
    'F8:8F:C2': ('Google', 'mobile', 'Google Pixel Phone'),

    # Laptops & Personal Computers (Intel, AzureWave, Realtek, Dell, HP, Lenovo, Asus, Microsoft)
    'F4:6D:3F': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '34:13:E8': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '80:86:F2': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '00:02:B3': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '00:0E:0C': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '00:13:E8': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '00:1B:77': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '00:21:5C': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '00:24:D7': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '3C:F8:62': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '48:51:B7': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '5C:80:B6': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '68:05:CA': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '84:FD:D1': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '8C:8D:28': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '94:E6:F7': ('Intel', 'workstation', 'Intel Laptop / PC'),
    '98:4F:EE': ('Intel', 'workstation', 'Intel Laptop / PC'),
    'A4:4E:31': ('Intel', 'workstation', 'Intel Laptop / PC'),
    'B4:96:91': ('Intel', 'workstation', 'Intel Laptop / PC'),
    'C8:5B:76': ('Intel', 'workstation', 'Intel Laptop / PC'),
    'EC:71:DB': ('Intel', 'workstation', 'Intel Laptop / PC'),
    'F8:63:3F': ('Intel', 'workstation', 'Intel Laptop / PC'),
    'FC:77:74': ('Intel', 'workstation', 'Intel Laptop / PC'),

    'EC:3A:56': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    '00:15:AF': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    '00:22:43': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    '00:25:D3': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    '10:7B:44': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    '24:EC:99': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    '44:D9:E7': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    '6C:71:D9': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    '74:C6:3B': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    '80:19:34': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    'A0:C5:89': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),
    'DC:85:DE': ('AzureWave', 'workstation', 'AzureWave Laptop / PC'),

    '00:E0:4C': ('Realtek', 'workstation', 'Realtek PC / Laptop'),
    '00:0A:CD': ('Realtek', 'workstation', 'Realtek PC / Laptop'),
    '20:7C:8F': ('Realtek', 'workstation', 'Realtek PC / Laptop'),
    '48:5D:60': ('Realtek', 'workstation', 'Realtek PC / Laptop'),

    '00:14:22': ('Dell', 'workstation', 'Dell Laptop / PC'),
    '00:1A:A0': ('Dell', 'workstation', 'Dell Laptop / PC'),
    '18:03:73': ('Dell', 'workstation', 'Dell Laptop / PC'),
    '24:B6:FD': ('Dell', 'workstation', 'Dell Laptop / PC'),
    '70:B5:E8': ('Dell', 'workstation', 'Dell Laptop / PC'),
    '84:7B:EB': ('Dell', 'workstation', 'Dell Laptop / PC'),
    'B8:AC:6F': ('Dell', 'workstation', 'Dell Laptop / PC'),
    'D4:BE:D9': ('Dell', 'workstation', 'Dell Laptop / PC'),

    '00:1E:0B': ('HP', 'workstation', 'HP Laptop / PC'),
    '00:25:B3': ('HP', 'workstation', 'HP Laptop / PC'),
    '18:A9:05': ('HP', 'workstation', 'HP Laptop / PC'),
    '3C:D9:2B': ('HP', 'workstation', 'HP Laptop / PC'),
    '70:5A:0F': ('HP', 'workstation', 'HP Laptop / PC'),
    '84:34:97': ('HP', 'workstation', 'HP Laptop / PC'),

    '00:21:CC': ('Lenovo', 'workstation', 'Lenovo ThinkPad / Laptop'),
    '00:26:18': ('Lenovo', 'workstation', 'Lenovo ThinkPad / Laptop'),
    '28:D2:44': ('Lenovo', 'workstation', 'Lenovo Laptop / PC'),
    '3C:97:0E': ('Lenovo', 'workstation', 'Lenovo ThinkPad / Laptop'),
    '70:72:0D': ('Lenovo', 'workstation', 'Lenovo Laptop / PC'),
    '88:70:8C': ('Lenovo', 'workstation', 'Lenovo Laptop / PC'),
    'A4:8C:DB': ('Lenovo', 'workstation', 'Lenovo ThinkPad / Laptop'),

    'FC:34:97': ('Asus', 'workstation', 'Asus Laptop / PC'),
    '00:1B:FC': ('Asus', 'workstation', 'Asus Laptop / PC'),
    '04:D9:F5': ('Asus', 'workstation', 'Asus Laptop / PC'),
    '08:60:6E': ('Asus', 'workstation', 'Asus Laptop / PC'),
    '10:BF:48': ('Asus', 'workstation', 'Asus Laptop / PC'),
    '70:8B:CD': ('Asus', 'workstation', 'Asus Laptop / PC'),
    'BC:EE:7B': ('Asus', 'workstation', 'Asus Laptop / PC'),

    '00:15:5D': ('Microsoft', 'workstation', 'Microsoft Surface / PC'),
    '28:18:78': ('Microsoft', 'workstation', 'Microsoft Surface / PC'),
    '48:50:73': ('Microsoft', 'workstation', 'Microsoft Surface / PC'),
    '7C:1E:52': ('Microsoft', 'workstation', 'Microsoft Surface / PC'),
    '98:5F:D3': ('Microsoft', 'workstation', 'Microsoft Surface / PC'),

    # Routers & Access Points (TP-Link, Netgear, D-Link, Cisco, Ubiquiti, Mikrotik)
    '50:C7:BF': ('TP-Link', 'router', 'TP-Link Wi-Fi Router'),
    'B0:95:75': ('TP-Link', 'router', 'TP-Link Wi-Fi Router'),
    '00:1D:0F': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '04:42:1A': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '0C:80:63': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '14:75:90': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '18:A6:F7': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '20:DC:E6': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '30:DE:4B': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '3C:46:D8': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '54:AF:97': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '60:32:B1': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '64:66:B3': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '68:FF:7B': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '70:4F:57': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '74:05:A5': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '84:16:F9': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '90:F6:52': ('TP-Link', 'router', 'TP-Link Router / AP'),
    '98:2C:BC': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'A4:2B:B0': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'AC:84:C6': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'B0:4E:26': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'C0:25:E9': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'C4:6E:1F': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'D8:0D:17': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'E4:C3:2A': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'EC:08:6B': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'F4:EC:38': ('TP-Link', 'router', 'TP-Link Router / AP'),
    'F8:1A:67': ('TP-Link', 'router', 'TP-Link Router / AP'),

    '00:09:5B': ('Netgear', 'router', 'Netgear Router / AP'),
    '00:14:6C': ('Netgear', 'router', 'Netgear Router / AP'),
    '00:1E:2A': ('Netgear', 'router', 'Netgear Router / AP'),
    '10:0C:6B': ('Netgear', 'router', 'Netgear Router / AP'),
    '20:E5:2A': ('Netgear', 'router', 'Netgear Router / AP'),
    '28:80:88': ('Netgear', 'router', 'Netgear Router / AP'),
    '30:46:9A': ('Netgear', 'router', 'Netgear Router / AP'),
    '44:94:FC': ('Netgear', 'router', 'Netgear Router / AP'),
    '84:1B:5E': ('Netgear', 'router', 'Netgear Router / AP'),
    '9C:3D:CF': ('Netgear', 'router', 'Netgear Router / AP'),
    'C0:FF:D4': ('Netgear', 'router', 'Netgear Router / AP'),
    'E0:46:9A': ('Netgear', 'router', 'Netgear Router / AP'),

    '00:05:5D': ('D-Link', 'router', 'D-Link Router / Gateway'),
    '00:0D:88': ('D-Link', 'router', 'D-Link Router / Gateway'),
    '00:17:9A': ('D-Link', 'router', 'D-Link Router / Gateway'),
    '14:D6:4D': ('D-Link', 'router', 'D-Link Router / Gateway'),
    '1C:7E:E5': ('D-Link', 'router', 'D-Link Router / Gateway'),
    '28:10:7B': ('D-Link', 'router', 'D-Link Router / Gateway'),
    '78:54:2E': ('D-Link', 'router', 'D-Link Router / Gateway'),

    '00:00:0C': ('Cisco', 'router', 'Cisco Router / Switch'),
    '00:01:42': ('Cisco', 'router', 'Cisco Router / Switch'),
    '00:1A:A1': ('Cisco', 'router', 'Cisco Router / Switch'),
    '00:24:97': ('Cisco', 'router', 'Cisco Router / Switch'),
    '18:33:9D': ('Cisco', 'router', 'Cisco Router / Switch'),
    '28:94:0F': ('Cisco', 'router', 'Cisco Router / Switch'),
    '64:A0:E7': ('Cisco', 'router', 'Cisco Router / Switch'),
    '70:81:05': ('Cisco', 'router', 'Cisco Router / Switch'),
    'F8:C0:01': ('Cisco', 'router', 'Cisco Router / Switch'),
}


class MonitoringService:
    def __init__(self):
        self._is_running = False
        self._start_time: float = 0.0
        self._lock: asyncio.Lock | None = None
        self._active_neighbors: Dict[str, Dict[str, Any]] = {}
        self._last_subnet_sweep: float = 0.0
        self._sweep_in_progress: bool = False
        self._sweep_lock = threading.Lock()
        
        # Prime active subnet cache immediately in background thread
        try:
            h_ip, gw_ip = self._get_network_endpoints()
            self._sweep_in_progress = True
            threading.Thread(target=self._run_subnet_sweep, args=(h_ip, gw_ip), daemon=True).start()
        except Exception:
            pass

    @property
    def lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    def get_status(self) -> Dict[str, Any]:
        """Returns current monitoring status as a dictionary with operational telemetry counters."""
        uptime = (time.time() - self._start_time) if self._is_running else 0.0
        
        # Pull live operational metrics from PacketSniffer instance
        sniffer = getattr(live_monitor, "sniffer", None)
        queue_drop_count = getattr(sniffer, "queue_drop_count", 0) if sniffer else 0
        non_ip_count = getattr(sniffer, "non_ip_count", 0) if sniffer else 0
        malformed_ip_count = getattr(sniffer, "malformed_ip_count", 0) if sniffer else 0
        
        interface = getattr(live_monitor, "interface", None)
        
        flow_builder = getattr(live_monitor, "flow_builder", None)
        active_flows = len(flow_builder.active_flows) if flow_builder and hasattr(flow_builder, "active_flows") else 0

        op_metrics = {
            "queue_drop_count": queue_drop_count,
            "non_ip_count": non_ip_count,
            "malformed_ip_count": malformed_ip_count
        }

        return {
            "is_running": self._is_running,
            "mode": "active" if self._is_running else "stopped",
            "interface": interface or "Default (Auto-select)",
            "uptime_seconds": round(uptime, 2),
            "packets_captured": getattr(sniffer, "packets_captured", 0) if hasattr(sniffer, "packets_captured") else 0,
            "flows_processed": getattr(live_monitor, "flows_processed", 0) if hasattr(live_monitor, "flows_processed") else 0,
            "active_flows": active_flows,
            "operational_metrics": op_metrics,
            "metrics": op_metrics
        }

    async def start(self, role: Role) -> bool:
        """Starts the live monitoring pipeline. Idempotent."""
        async with self.lock:
            if self._is_running:
                logger.info("Monitoring already running.")
                return True

            try:
                await live_monitor.start()
                self._is_running = True
                self._start_time = time.time()
                logger.info("Live Monitoring Pipeline Started.")

                event = MonitorStatusEvent(payload={"status": "started", **self.get_status()})
                res = broadcaster.publish(event)
                if asyncio.iscoroutine(res) or hasattr(res, "__await__"):
                    await res
                return True
            except Exception as e:
                self._is_running = False
                self._start_time = 0.0
                logger.error(f"Failed to start live monitor: {e}", exc_info=True)
                raise

    @staticmethod
    def _lookup_mac_vendor(mac: str) -> Optional[tuple[str, str, str]]:
        """
        Looks up MAC address vendor, device category ('mobile', 'router', 'workstation', 'server'),
        and default descriptive label.
        """
        if not mac or mac == "00:00:00:00:00:00" or mac.startswith("FF:FF:FF"):
            return None

        oui = ":".join(mac.split(":")[:3]).upper()
        if oui in TOP_MAC_VENDORS:
            return TOP_MAC_VENDORS[oui]

        # Fallback to Scapy's 50,000+ IEEE OUI registry
        try:
            from scapy.config import conf
            short_m = conf.manufdb._get_short_manuf(mac)
            long_m = conf.manufdb._get_manuf(mac)
            if short_m and short_m != mac:
                s_low = short_m.lower()
                l_low = long_m.lower() if long_m else ""
                combined = f"{s_low} {l_low}"

                # Check for mobile smartphones / tablets
                if any(k in combined for k in ["apple", "samsung", "xiaomi", "redmi", "poco", "oneplus", "oppo", "vivo", "realme", "motorola", "huawei", "pixel", "phone", "mobile"]):
                    return (short_m, "mobile", f"{short_m} Mobile Phone")
                # Check for routers / switches / APs
                elif any(k in combined for k in ["tp-link", "tplink", "netgear", "d-link", "dlink", "cisco", "ubiquiti", "mikrotik", "aruba", "juniper", "zyxel", "linksys", "zte", "router", "gateway"]):
                    return (short_m, "router", f"{short_m} Router / AP")
                # Check for smart home / IoT / server
                elif any(k in combined for k in ["espressif", "tuya", "raspberry", "amazon", "roku", "sonos", "philips", "tapo", "synology", "qnap", "camera", "smart", "iot"]):
                    return (short_m, "server", f"{short_m} Smart Device")
                # Check for computers / laptops
                elif any(k in combined for k in ["intel", "dell", "lenovo", "hp", "acer", "asus", "realtek", "microsoft", "surface", "msi", "asrock", "gigabyte", "azurewave", "compal", "wistron", "foxconn", "pegatron"]):
                    return (short_m, "workstation", f"{short_m} Laptop / PC")
                return (short_m, "workstation", f"{short_m} Device")
        except Exception:
            pass

        return None

    @staticmethod
    def _query_netbios_name(ip: str) -> Optional[str]:
        """Queries Windows / Samba NetBIOS Node Status for real host computer name."""
        import socket
        try:
            pkt = (
                b"\x12\x34\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00"
                b"\x20CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\x00\x00\x21\x00\x01"
            )
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(0.35)
            sock.sendto(pkt, (ip, 137))
            data, _ = sock.recvfrom(1024)
            sock.close()
            if len(data) > 56:
                num_names = data[56]
                for i in range(min(num_names, 8)):
                    offset = 57 + i * 18
                    if offset + 15 <= len(data):
                        raw_name = data[offset : offset + 15].decode("latin1", errors="ignore").strip()
                        if raw_name and not raw_name.startswith("__") and not raw_name.startswith("\x01") and not raw_name.startswith(".."):
                            clean = "".join(c for c in raw_name if c.isalnum() or c in "-_").strip()
                            if clean:
                                return clean
        except Exception:
            pass
        return None

    def _resolve_device_identity(
        self,
        ip: str,
        mac: str,
        is_gateway: bool = False,
        is_host: bool = False,
        gateway_ip: Optional[str] = None,
        dns_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Comprehensive multi-protocol device identifier and classifier.
        Resolves exact device hostname and classifies into:
        - 'router' (black theme in UI)
        - 'mobile' (pink theme in UI)
        - 'workstation' (laptop/PC blue theme in UI)
        - 'server' (IoT/smart device emerald theme in UI)
        """
        import socket
        last_octet = ip.split(".")[-1]

        # 1. Gateway Device
        if is_gateway:
            vendor_info = self._lookup_mac_vendor(mac)
            vendor_name = vendor_info[0] if vendor_info else None
            hostname = f"{vendor_name} Wi-Fi Router Gateway" if vendor_name else "Wi-Fi Router Gateway"
            return {
                "ip": ip,
                "hostname": hostname,
                "label": f"{hostname} ({ip})",
                "type": "router",
                "is_host": False,
                "is_gateway": True,
                "mac": mac,
                "status": "NORMAL",
            }

        # 2. Host Machine (NetrIQ Sensor PC)
        if is_host:
            host_name = "Host PC"
            try:
                host_name = socket.gethostname()
            except Exception:
                pass
            return {
                "ip": ip,
                "hostname": host_name,
                "label": f"{host_name} (Host PC)",
                "type": "workstation",
                "is_host": True,
                "is_gateway": False,
                "mac": mac or "Local Host Interface",
                "status": "NORMAL",
            }

        # 3. Regular LAN Device - Check Randomized MAC
        is_random_mac = False
        try:
            is_random_mac = (int(mac.split(":")[0], 16) & 2) != 0
        except Exception:
            pass

        # 4. Check MAC Vendor
        vendor_info = self._lookup_mac_vendor(mac)
        vendor_name = vendor_info[0] if vendor_info else None
        vendor_cat = vendor_info[1] if vendor_info else None
        vendor_desc = vendor_info[2] if vendor_info else None

        # 5. Check NetBIOS Name if no DNS PTR name
        resolved_name = dns_name
        if not resolved_name:
            nb_name = self._query_netbios_name(ip)
            if nb_name:
                resolved_name = nb_name

        # 6. Use resolved DNS PTR name (already queried in parallel without blocking)

        # 7. Device Type Classification & Friendly Naming
        dev_type = "workstation"
        clean_hostname = resolved_name

        # Determine type from resolved hostname keywords
        if clean_hostname:
            h_low = clean_hostname.lower()
            if any(k in h_low for k in ["phone", "m21", "galaxy", "realme", "xiaomi", "redmi", "iphone", "pixel", "infinix", "oppo", "vivo", "oneplus", "android", "sm-", "mobile", "ipad"]):
                dev_type = "mobile"
            elif any(k in h_low for k in ["router", "gateway", "archerc", "tplink", "netgear", "dlink", "asuswrt", "openwrt", "jiofiber", "airtel"]):
                dev_type = "router"
            elif any(k in h_low for k in ["plug", "p110", "iot", "cam", "smart", "esp", "bulb", "alexa", "echo", "nest", "tapo", "tuya", "printer", "kyocera"]):
                dev_type = "server"
            elif any(k in h_low for k in ["laptop", "desktop", "thinkpad", "surface", "macbook", "pc", "workstation"]):
                dev_type = "workstation"
            elif vendor_cat:
                dev_type = vendor_cat
            elif is_random_mac:
                dev_type = "mobile"
        else:
            # No network name resolved - use vendor and MAC heuristics
            if is_random_mac:
                # Private / Randomized MAC is exclusive to smartphones & modern mobile devices
                dev_type = "mobile"
                clean_hostname = f"Smartphone (Android/iOS) [{last_octet}]"
            elif vendor_cat == "mobile":
                dev_type = "mobile"
                clean_hostname = f"{vendor_name} Mobile [{last_octet}]"
            elif vendor_cat == "router":
                dev_type = "router"
                clean_hostname = f"{vendor_name} Router/AP [{last_octet}]"
            elif vendor_cat == "server":
                dev_type = "server"
                clean_hostname = f"{vendor_name} Smart Device [{last_octet}]"
            elif vendor_cat == "workstation":
                dev_type = "workstation"
                clean_hostname = f"{vendor_name} Laptop/PC [{last_octet}]"
            elif vendor_name:
                dev_type = "workstation"
                clean_hostname = f"{vendor_name} Device [{last_octet}]"
            else:
                dev_type = "workstation"
                clean_hostname = f"Network Device ({last_octet})"

        # Clean specific common model aliases
        if clean_hostname.lower() == "p110":
            clean_hostname = "Tapo Smart Plug (P110)"
            dev_type = "server"

        return {
            "ip": ip,
            "hostname": clean_hostname,
            "label": f"{clean_hostname} ({ip})",
            "type": dev_type,
            "is_host": False,
            "is_gateway": False,
            "mac": mac,
            "status": "NORMAL",
        }

    def _get_network_endpoints(self) -> tuple[str, Optional[str]]:
        """Discovers real host IP and default gateway IP without hardcoded defaults."""
        import socket
        import subprocess
        import re

        host_ip = "127.0.0.1"
        gateway_ip = None

        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            host_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass

        try:
            out = subprocess.check_output(["route", "print", "0.0.0.0"], text=True)
            m = re.search(r"0\.0\.0\.0\s+0\.0\.0\.0\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)", out)
            if m:
                gateway_ip, route_iface = m.groups()
                if not host_ip or host_ip == "127.0.0.1":
                    host_ip = route_iface
        except Exception as e:
            logger.debug(f"Could not determine gateway via route print: {e}")

        return host_ip, gateway_ip

    @staticmethod
    def _send_arp_query(ip_str: str) -> Optional[str]:
        """Probes hardware MAC address using native Win32 SendARP API."""
        try:
            import ctypes
            import struct
            import socket
            dest_ip = socket.inet_aton(ip_str)
            dest_ip_le = struct.unpack('<I', dest_ip)[0]
            mac_buf = (ctypes.c_byte * 6)()
            mac_len = ctypes.c_ulong(6)
            res = ctypes.windll.iphlpapi.SendARP(
                ctypes.c_ulong(dest_ip_le),
                ctypes.c_ulong(0),
                ctypes.byref(mac_buf),
                ctypes.byref(mac_len)
            )
            if res == 0:
                return ':'.join(f'{b & 0xff:02X}' for b in mac_buf)
        except Exception:
            pass
        return None

    def _run_subnet_sweep(self, host_ip: str, gateway_ip: Optional[str]) -> None:
        """
        Actively probes the entire local Wi-Fi subnet in parallel using Win32 SendARP.
        Discovers all connected physical systems, smartphones, and routers on the LAN.
        Queries the Wi-Fi router's DNS server directly for exact registered hostnames.
        Prunes disconnected devices dynamically.
        """
        from concurrent.futures import ThreadPoolExecutor

        # Wake sleeping mobile stations by sending quick UDP wake probes
        try:
            import socket
            wake_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            wake_sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            base_parts = host_ip.split('.')[:3]
            base = '.'.join(base_parts) + '.'
            bcast_addr = f"{base}255"
            for _ in range(2):
                wake_sock.sendto(b"\x00", (bcast_addr, 137))
                wake_sock.sendto(b"\x00", ("224.0.0.251", 5353))
            wake_sock.close()
        except Exception:
            pass

        def win_send_arp(ip_str: str):
            mac = self._send_arp_query(ip_str)
            if not mac:
                # Brief sleep retry to catch sleeping Wi-Fi mobile devices
                time.sleep(0.08)
                mac = self._send_arp_query(ip_str)
            return ip_str, mac

        try:
            base_parts = host_ip.split('.')[:3]
            base = '.'.join(base_parts) + '.'
            all_ips = [f"{base}{i}" for i in range(1, 255)]

            # 1. Probe local subnet with Win32 SendARP in parallel (36 workers to avoid Wi-Fi AP frame drops)
            with ThreadPoolExecutor(max_workers=36) as pool:
                arp_tuples = list(pool.map(win_send_arp, all_ips))
            # STRICT FILTER: Only devices that physically respond to ARP with a valid MAC are online
            arp_map = {
                ip: mac for ip, mac in arp_tuples 
                if mac and not mac.startswith("FF:FF:FF") and mac != "00:00:00:00:00:00"
            }

            # Supplement with any dynamic entries from OS ARP table
            try:
                import subprocess, re
                arp_out = subprocess.check_output(["arp", "-a"], text=True, stderr=subprocess.DEVNULL)
                for line in arp_out.splitlines():
                    m = re.search(r"([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F-]+)\s+(\w+)", line)
                    if m:
                        a_ip, a_mac_raw, a_typ = m.groups()
                        if a_ip.startswith(base) and a_ip not in arp_map and a_ip not in (host_ip, gateway_ip):
                            if not a_ip.endswith(".255") and not a_ip.endswith(".0"):
                                formatted_mac = a_mac_raw.replace("-", ":").upper()
                                if formatted_mac != "00:00:00:00:00:00" and not formatted_mac.startswith("FF:FF"):
                                    arp_map[a_ip] = formatted_mac
            except Exception:
                pass

            # 2. Only query DNS names for GENUINE live responding devices (never for offline router DHCP leases)
            dns_names = {}
            if gateway_ip and arp_map:
                import dns.resolver, dns.reversename
                router_res = dns.resolver.Resolver()
                router_res.nameservers = [gateway_ip]
                router_res.timeout = 0.35
                router_res.lifetime = 0.35

                def resolve_ptr(ip_str: str):
                    try:
                        rev = dns.reversename.from_address(ip_str)
                        ans = router_res.resolve(rev, "PTR")
                        if ans:
                            raw = str(ans[0]).rstrip(".")
                            for suff in [".domain.name", ".lan", ".home", ".local", ".corp"]:
                                if raw.lower().endswith(suff):
                                    raw = raw[:-len(suff)]
                            clean = raw.replace("-", " ").strip()
                            if clean and not clean.endswith(".in-addr.arpa"):
                                return ip_str, clean
                    except Exception:
                        pass
                    return ip_str, None

                with ThreadPoolExecutor(max_workers=32) as pool:
                    ptr_results = pool.map(resolve_ptr, list(arp_map.keys()))
                    for ip_str, name in ptr_results:
                        if name:
                            dns_names[ip_str] = name

            # 3. Only live responding IPs
            candidate_ips = set(arp_map.keys())

            def resolve_single_device(ip):
                if ip in (host_ip, gateway_ip):
                    return None
                mac = arp_map.get(ip)
                if not mac or mac == "00:00:00:00:00:00":
                    return None
                return self._resolve_device_identity(
                    ip=ip,
                    mac=mac,
                    is_gateway=False,
                    is_host=False,
                    gateway_ip=gateway_ip,
                    dns_name=dns_names.get(ip),
                )

            new_neighbors = {}
            with ThreadPoolExecutor(max_workers=24) as pool:
                resolved_list = list(pool.map(resolve_single_device, list(candidate_ips)))
                for dev_info in resolved_list:
                    if dev_info:
                        new_neighbors[dev_info["ip"]] = dev_info

            with self._sweep_lock:
                now_ts = time.time()
                for ip, dev in new_neighbors.items():
                    dev["last_seen"] = now_ts
                    self._active_neighbors[ip] = dev

                # Retain verified neighbors seen within last 900 seconds (15 mins prevents smartphone sleep dropouts)
                self._active_neighbors = {
                    ip: d for ip, d in self._active_neighbors.items()
                    if now_ts - d.get("last_seen", now_ts) < 900
                }
                self._last_subnet_sweep = time.time()
                self._sweep_in_progress = False
                logger.info(f"Subnet sweep completed: {len(self._active_neighbors)} verified devices discovered on {base}0/24.")

        except Exception as e:
            logger.warning(f"Active subnet sweep encountered error: {e}")
            with self._sweep_lock:
                self._sweep_in_progress = False

    def get_local_topology(self) -> Dict[str, Any]:
        """
        Discovers real host IP, default gateway, and all active devices on the local Wi-Fi network.
        Filters strictly by active subnet to eliminate phantom IPs from WSL/Hyper-V/VirtualBox.
        Uses verified active neighbor cache with background refreshing.
        """
        import socket
        import subprocess
        import re

        host_ip, gateway_ip = self._get_network_endpoints()
        base_prefix = '.'.join(host_ip.split('.')[:3]) + '.'

        # Trigger background active subnet sweep if cache is older than 30s or empty
        now = time.time()
        with self._sweep_lock:
            needs_sweep = (now - self._last_subnet_sweep > 30) or (len(self._active_neighbors) == 0)
            if needs_sweep and not self._sweep_in_progress:
                self._sweep_in_progress = True
                threading.Thread(target=self._run_subnet_sweep, args=(host_ip, gateway_ip), daemon=True).start()

        # If cache is completely empty and sweep is running, wait up to 1.5s for initial sweep results
        if len(self._active_neighbors) == 0 and self._sweep_in_progress:
            for _ in range(15):
                time.sleep(0.1)
                if len(self._active_neighbors) > 0:
                    break

        devices = []

        # 1. Add Host Device with resolved system name
        host_dev = self._resolve_device_identity(
            ip=host_ip,
            mac="Local Host Interface",
            is_gateway=False,
            is_host=True,
            gateway_ip=gateway_ip,
        )
        devices.append(host_dev)

        # 2. Add Gateway if known
        gateway_mac = "Default Gateway"
        if gateway_ip and gateway_ip != host_ip:
            gw_probe = self._send_arp_query(gateway_ip)
            if gw_probe:
                gateway_mac = gw_probe

            gw_dev = self._resolve_device_identity(
                ip=gateway_ip,
                mac=gateway_mac,
                is_gateway=True,
                is_host=False,
                gateway_ip=gateway_ip,
            )
            devices.append(gw_dev)

        seen_ips = {host_ip}
        if gateway_ip:
            seen_ips.add(gateway_ip)

        # 3. Merge verified active neighbors from subnet sweep
        with self._sweep_lock:
            cached_neighbors = dict(self._active_neighbors)

        for ip, dev_info in cached_neighbors.items():
            if ip not in seen_ips and ip.startswith(base_prefix):
                seen_ips.add(ip)
                devices.append(dev_info)

        # 4. If cache was empty, supplement with immediate OS ARP table filtered STRICTLY to active subnet prefix
        if len(devices) <= 2:
            try:
                import ctypes, struct
                def fast_arp_check(ip_str):
                    try:
                        dest_ip = socket.inet_aton(ip_str)
                        dest_ip_le = struct.unpack('<I', dest_ip)[0]
                        mac_buf = (ctypes.c_byte * 6)()
                        mac_len = ctypes.c_ulong(6)
                        res = ctypes.windll.iphlpapi.SendARP(ctypes.c_ulong(dest_ip_le), ctypes.c_ulong(0), ctypes.byref(mac_buf), ctypes.byref(mac_len))
                        if res == 0:
                            return ':'.join(f'{b & 0xff:02X}' for b in mac_buf)
                    except Exception:
                        pass
                    return None

                arp_out = subprocess.check_output(["arp", "-a"], text=True, stderr=subprocess.DEVNULL)
                for line in arp_out.splitlines():
                    m = re.search(r"([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F-]+)\s+(\w+)", line)
                    if m:
                        ip, mac_raw, typ = m.groups()
                        # STRICT FILTER: must be on active Wi-Fi subnet!
                        if not ip.startswith(base_prefix):
                            continue
                        if ip in seen_ips:
                            continue
                        if ip.endswith(".255") or ip.endswith(".0"):
                            continue

                        real_mac = fast_arp_check(ip)
                        if not real_mac:
                            continue

                        seen_ips.add(ip)
                        formatted_mac = real_mac or mac_raw.replace("-", ":").upper()

                        dev_info = self._resolve_device_identity(
                            ip=ip,
                            mac=formatted_mac,
                            is_gateway=False,
                            is_host=False,
                            gateway_ip=gateway_ip,
                        )
                        devices.append(dev_info)
            except Exception as e:
                logger.debug(f"Could not query immediate ARP table: {e}")

        # Deterministic sort: Gateway first, Host PC second, then IP numerical order
        def sort_key(d):
            if d.get("is_gateway"):
                return (0, 0)
            if d.get("is_host"):
                return (1, 0)
            try:
                return (2, int(d["ip"].split(".")[-1]))
            except Exception:
                return (2, 999)

        devices.sort(key=sort_key)

        return {
            "host_ip": host_ip,
            "gateway_ip": gateway_ip,
            "subnet": f"{base_prefix}0/24",
            "device_count": len(devices),
            "devices": devices,
        }

    async def stop(self, role: Role) -> bool:
        """Stops the live monitoring pipeline. Idempotent."""
        async with self.lock:
            if not self._is_running:
                logger.info("Monitoring already stopped.")
                return True

            try:
                await live_monitor.stop()
            except Exception as e:
                logger.error(f"Error stopping live monitor: {e}", exc_info=True)
            finally:
                self._is_running = False
                self._start_time = 0.0
                logger.info("Live Monitoring Pipeline Stopped.")

                event = MonitorStatusEvent(payload={"status": "stopped", **self.get_status()})
                res = broadcaster.publish(event)
                if asyncio.iscoroutine(res) or hasattr(res, "__await__"):
                    await res
            return True


monitoring_service = MonitoringService()

