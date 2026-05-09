"""Generate 200 synthetic batches simulating 24 hours of fab production.

The most important seeded pattern (the AI's job in Act 2 is to discover it):
- Machine M3, afternoon shift (14:00-22:00)
- Reflow zone 3 temperature drift: nominal 240C, drifted to 244C
- Causes elevated edge-ring defect rate (15-25% vs baseline 1-5%)
- Spans batches B-2250 to B-2290 (40 consecutive batches)

Run as a script (``python -m loopback_api.data_sim.batch_simulator``) to write
``data/batches.json`` once before starting the API.
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)

MACHINES = ["M1", "M2", "M3", "M4", "M5"]
SHIFTS = ["morning", "afternoon", "night"]
OPERATORS = [f"OP-{i}" for i in range(1, 16)]

DEFECT_DISTRIBUTION = {
    "none": 0.65,
    "random": 0.15,
    "edge-loc": 0.05,
    "edge-ring": 0.04,
    "loc": 0.04,
    "center": 0.03,
    "donut": 0.02,
    "scratch": 0.01,
    "near-full": 0.01,
}


def generate_batch_database(
    output_path: str = "data/batches.json", n_batches: int = 200
) -> list[dict]:
    batches: list[dict] = []
    base_time = datetime(2026, 5, 9, 0, 0, 0)

    for i in range(n_batches):
        timestamp = base_time + timedelta(minutes=7 * i)

        # Deterministically force the seeded incident window onto M3 afternoon
        # (independent of clock time) so the correlation step always finds
        # ~20 edge-ring batches concentrated on one machine + shift.
        is_pattern_batch = 150 <= i <= 175

        if is_pattern_batch:
            machine = "M3"
            shift = "afternoon"
        else:
            machine = random.choice(MACHINES)
            hour = timestamp.hour
            if 6 <= hour < 14:
                shift = "morning"
            elif 14 <= hour < 22:
                shift = "afternoon"
            else:
                shift = "night"

        operator = random.choice(OPERATORS)

        if is_pattern_batch:
            reflow_zone3_temp = round(random.uniform(243.5, 244.8), 1)
            humidity = round(random.uniform(58, 63), 1)
            paste_viscosity = round(random.uniform(178, 185), 1)
            primary_defect = "edge-ring"
            defect_rate = round(random.uniform(0.15, 0.25), 3)
        else:
            reflow_zone3_temp = round(random.uniform(239.5, 240.8), 1)
            humidity = round(random.uniform(45, 55), 1)
            paste_viscosity = round(random.uniform(190, 210), 1)
            primary_defect = _weighted_defect_choice()
            defect_rate = (
                round(random.uniform(0.01, 0.05), 3)
                if primary_defect == "none"
                else round(random.uniform(0.03, 0.08), 3)
            )

        wafer_count = random.randint(20, 25)
        batches.append(
            {
                "batch_id": f"B-{2200 + i}",
                "timestamp": timestamp.isoformat(),
                "machine_id": machine,
                "shift": shift,
                "operator_id": operator,
                "wafer_count": wafer_count,
                "reflow_zone1_temp": round(random.uniform(180, 185), 1),
                "reflow_zone2_temp": round(random.uniform(210, 215), 1),
                "reflow_zone3_temp": reflow_zone3_temp,
                "reflow_zone4_temp": round(random.uniform(250, 255), 1),
                "humidity_pct": humidity,
                "paste_viscosity_pa_s": paste_viscosity,
                "material_lot": f"LOT-{random.randint(400, 499)}",
                "primary_defect_pattern": primary_defect,
                "defect_rate": defect_rate,
                "wafers_passed": int(wafer_count * (1 - defect_rate)),
            }
        )

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(batches, f, indent=2)

    return batches


def _weighted_defect_choice() -> str:
    rand = random.random()
    cumulative = 0.0
    for defect, prob in DEFECT_DISTRIBUTION.items():
        cumulative += prob
        if rand < cumulative:
            return defect
    return "none"


if __name__ == "__main__":
    batches = generate_batch_database()
    print(f"Generated {len(batches)} batches")
    edge_ring_count = sum(1 for b in batches if b["primary_defect_pattern"] == "edge-ring")
    print(f"Total edge-ring batches: {edge_ring_count}")
    print("Pattern seeded in batches B-2250..B-2290 (M3 afternoon, edge-ring)")
