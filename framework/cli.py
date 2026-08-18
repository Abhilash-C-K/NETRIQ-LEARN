import argparse
import sys
import time
from backend.live_monitor.response_engine import LiveMonitorRunner

def main():
    parser = argparse.ArgumentParser(
        prog="netriq-cli",
        description="NETRIQ CLI — AI-Powered Network Intrusion Detection & Response Engine"
    )
    parser.add_argument(
        "--mode",
        choices=["simulate", "live"],
        default="simulate",
        help="Mode of operation: 'simulate' for synthetic flows or 'live' for network packet capture (default: simulate)"
    )
    parser.add_argument(
        "--dataset",
        default="cicids2017",
        help="Dataset feature format model (default: cicids2017)"
    )
    parser.add_argument(
        "--count",
        type=int,
        default=5,
        help="Number of simulated flows to generate in simulation mode (default: 5)"
    )
    parser.add_argument(
        "--interface",
        default=None,
        help="Network interface to sniff on in live mode (default: default system interface)"
    )

    args = parser.parse_args()

    print("=" * 75)
    print(" 🚀 NETRIQ Framework CLI v1.0.0")
    print(" AI Model: Random Forest (Network Traffic) + XGBoost / LightGBM")
    print(f" Mode: {args.mode.upper()} | Dataset: {args.dataset.upper()}")
    print("=" * 75 + "\n")

    runner = LiveMonitorRunner(dataset_name=args.dataset)

    if args.mode == "simulate":
        runner.run_simulation(count=args.count, delay_sec=0.5)
    else:
        runner.run_live(interface=args.interface)

if __name__ == "__main__":
    main()
