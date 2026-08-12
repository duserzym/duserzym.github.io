#!/usr/bin/env python3
"""Create a public, privacy-reduced activity summary from COROS FIT exports.

The generated JSON contains annual and daily totals plus simplified
running/cycling route geometry. Times of day, heart rate, pace, speed, elevation,
device identifiers, and individual activity details are never written.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import math
import os
import warnings
from collections import defaultdict
from datetime import date
from pathlib import Path

import fitdecode


ROUTE_TOLERANCE_DEGREES = 0.00012
MAX_ROUTE_JUMP_METERS = 1500
warnings.filterwarnings("ignore", message="invalid field size.*", category=UserWarning)
SPORTS = {
    "running": "run",
    "swimming": "swim",
    "cycling": "ride",
}


def point_segment_distance_squared(point, start, end) -> float:
    """Squared planar distance from a longitude/latitude point to a segment."""
    x, y = point
    x1, y1 = start
    x2, y2 = end
    dx = x2 - x1
    dy = y2 - y1
    if dx == 0 and dy == 0:
        return (x - x1) ** 2 + (y - y1) ** 2
    position = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    nearest_x = x1 + position * dx
    nearest_y = y1 + position * dy
    return (x - nearest_x) ** 2 + (y - nearest_y) ** 2


def simplify_route(points: list[tuple[float, float]]) -> list[list[float]]:
    """Douglas-Peucker simplification retaining road-scale route geometry."""
    if len(points) <= 2:
        return [[round(lon, 5), round(lat, 5)] for lon, lat in points]

    tolerance_squared = ROUTE_TOLERANCE_DEGREES**2
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]

    while stack:
        start_index, end_index = stack.pop()
        furthest_index = None
        furthest_distance = 0.0
        for index in range(start_index + 1, end_index):
            distance = point_segment_distance_squared(
                points[index], points[start_index], points[end_index]
            )
            if distance > furthest_distance:
                furthest_distance = distance
                furthest_index = index
        if furthest_index is not None and furthest_distance > tolerance_squared:
            keep.add(furthest_index)
            stack.append((start_index, furthest_index))
            stack.append((furthest_index, end_index))

    return [
        [round(points[index][0], 5), round(points[index][1], 5)]
        for index in sorted(keep)
    ]


def distance_meters(first, second) -> float:
    """Haversine distance used only to split implausible GPS jumps."""
    lon1, lat1 = map(math.radians, first)
    lon2, lat2 = map(math.radians, second)
    delta_lon = lon2 - lon1
    delta_lat = lat2 - lat1
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return 6371000 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def route_segments(points: list[tuple[float, float]]) -> list[list[list[float]]]:
    segments: list[list[tuple[float, float]]] = []
    current: list[tuple[float, float]] = []

    for point in points:
        if current and distance_meters(current[-1], point) > MAX_ROUTE_JUMP_METERS:
            if len(current) >= 2:
                segments.append(current)
            current = []
        if not current or point != current[-1]:
            current.append(point)

    if len(current) >= 2:
        segments.append(current)
    return [simplify_route(segment) for segment in segments]


def parse_fit(path_string: str) -> dict | None:
    """Read one FIT file and return only fields allowed in the public output."""
    path = Path(path_string)
    session = None
    gps_points: list[tuple[float, float]] = []

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        with fitdecode.FitReader(
            path, processor=fitdecode.StandardUnitsDataProcessor()
        ) as fit:
            for frame in fit:
                if not isinstance(frame, fitdecode.FitDataMessage):
                    continue

                if frame.name == "record":
                    latitude = frame.get_value("position_lat", fallback=None)
                    longitude = frame.get_value("position_long", fallback=None)
                    if latitude is not None and longitude is not None:
                        gps_points.append((float(longitude), float(latitude)))

                elif frame.name == "session" and session is None:
                    sport = frame.get_value("sport", fallback=None)
                    if sport not in SPORTS:
                        continue
                    started = frame.get_value("start_time", fallback=None)
                    distance = frame.get_value("total_distance", fallback=0) or 0
                    session = {
                        "sport": SPORTS[sport],
                        "year": getattr(started, "year", None),
                        "date": started.date().isoformat() if started else None,
                        "distance_km": float(distance),
                    }

    if session is None or session["year"] is None or session["date"] is None:
        return None

    if session["sport"] in {"run", "ride"}:
        session["segments"] = route_segments(gps_points)
    else:
        session["segments"] = []
    return session


def empty_totals() -> dict:
    return {
        sport: {"distanceKm": 0.0, "activities": 0}
        for sport in ("run", "swim", "ride")
    }


def rounded_totals(source: dict) -> dict:
    result = empty_totals()
    for sport in result:
        result[sport]["distanceKm"] = round(source[sport]["distanceKm"], 1)
        result[sport]["activities"] = source[sport]["activities"]
    return result


def build_summary(input_directory: Path, workers: int) -> tuple[dict, int, int, int]:
    paths = sorted(input_directory.glob("*.fit"))
    if not paths:
        raise SystemExit(f"No .fit files found in {input_directory}")

    parsed: list[dict] = []
    errors: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(parse_fit, str(path)): path for path in paths}
        for future in concurrent.futures.as_completed(futures):
            path = futures[future]
            try:
                activity = future.result()
                if activity is not None:
                    parsed.append(activity)
            except Exception as exc:  # Keep processing a large export if one file is bad.
                errors.append(f"{path.name}: {type(exc).__name__}")

    by_year = defaultdict(empty_totals)
    by_day = defaultdict(lambda: defaultdict(lambda: {"distanceKm": 0.0, "activities": 0}))
    all_time = empty_totals()
    routes = []

    for activity in parsed:
        sport = activity["sport"]
        year = activity["year"]
        distance = activity["distance_km"]
        activity_date = activity["date"]

        by_year[year][sport]["distanceKm"] += distance
        by_year[year][sport]["activities"] += 1
        all_time[sport]["distanceKm"] += distance
        all_time[sport]["activities"] += 1
        by_day[sport][activity_date]["distanceKm"] += distance
        by_day[sport][activity_date]["activities"] += 1

        if activity["segments"]:
            routes.append(
                {
                    "year": year,
                    "sport": sport,
                    "segments": activity["segments"],
                }
            )

    years = sorted(by_year, reverse=True)
    totals = {"all": rounded_totals(all_time)}
    for year in years:
        totals[str(year)] = rounded_totals(by_year[year])

    daily = {}
    for sport in ("run", "swim", "ride"):
        daily[sport] = [
            {
                "date": activity_date,
                "distanceKm": round(values["distanceKm"], 1),
                "activities": values["activities"],
            }
            for activity_date, values in sorted(by_day[sport].items())
        ]

    summary = {
        "generated": date.today().isoformat(),
        "years": years,
        "totals": totals,
        "daily": daily,
        "routes": routes,
        "privacy": {
            "routeToleranceDegrees": ROUTE_TOLERANCE_DEGREES,
            "description": (
                "Routes are simplified GPS traces. Calendar totals are date-level only; "
                "times of day, sensor values, and activity identifiers are not published."
            ),
        },
    }
    return summary, len(paths), len(parsed), len(errors)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_directory", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("assets/data/activities.json"),
        help="Public JSON output path (default: assets/data/activities.json)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=max(1, min(12, os.cpu_count() or 1)),
    )
    args = parser.parse_args()

    if not args.input_directory.is_dir():
        parser.error(f"Not a directory: {args.input_directory}")

    summary, source_count, included_count, error_count = build_summary(
        args.input_directory, max(1, args.workers)
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, separators=(",", ":")) + "\n")

    counts = summary["totals"]["all"]
    print(
        "Generated privacy-safe summary: "
        f"{counts['run']['activities']} runs, "
        f"{counts['swim']['activities']} swims, "
        f"{counts['ride']['activities']} rides; "
        f"{source_count - included_count} skipped, {error_count} parse errors."
    )


if __name__ == "__main__":
    main()
