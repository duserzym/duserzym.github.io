import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { geoMollweide, geoRobinson } from "https://cdn.jsdelivr.net/npm/d3-geo-projection@4/+esm";
import { feature } from "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm";
import { VectorTile } from "https://cdn.jsdelivr.net/npm/@mapbox/vector-tile@2.0.4/+esm";
import Pbf from "https://cdn.jsdelivr.net/npm/pbf@4.0.1/+esm";

const dashboard = document.querySelector(".activity-dashboard");

if (dashboard) {
  const RUN_COLOR = "#006fff";
  const RIDE_COLOR = "#ff3d57";
  const DENSITY_CELL = 0.0005;
  const DENSITY_COLORS = ["#1d4ed8", "#38bdf8", "#facc15", "#f97316", "#dc2626"];
  const source = dashboard.dataset.source;
  const status = document.getElementById("activity-status");
  const periods = document.getElementById("activity-periods");
  const mapElement = document.getElementById("activity-map");
  const mapSvg = d3.select("#activity-map svg");
  const mapFilters = Array.from(document.querySelectorAll(".activity-map-filters input"));
  const projectionButtons = Array.from(
    document.querySelectorAll(".activity-projections button")
  );
  const zoomButtons = Array.from(document.querySelectorAll(".activity-zoom-controls button"));

  let activityData;
  let countries;
  let activityCenter = [-96, 39];
  let selectedPeriod = "all";
  let selectedProjection = "orthographic";
  let currentZoomTransform = d3.zoomIdentity;
  let detailMap;
  let detailMapReady = false;
  let overviewRenderVersion = 0;
  let overviewRenderTimer;
  let overviewContext;
  const vectorTileCache = new Map();
  const openFreeMapTileJson = fetch("https://tiles.openfreemap.org/planet").then((response) => {
    if (!response.ok) throw new Error(`OpenFreeMap TileJSON returned ${response.status}`);
    return response.json();
  });

  function formatDistance(value, sport) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: sport === "swim" ? 1 : 0,
    }).format(value || 0);
  }

  function activityLabel(count) {
    return `${new Intl.NumberFormat("en-US").format(count)} ${
      count === 1 ? "activity" : "activities"
    }`;
  }

  function parseCalendarDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function calendarDateKey(value) {
    return value.toISOString().slice(0, 10);
  }

  function addCalendarDays(value, days) {
    const result = new Date(value);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  function calendarDayDifference(start, end) {
    return Math.round((end - start) / 86400000);
  }

  function calendarRange() {
    if (selectedPeriod !== "all") {
      const year = Number(selectedPeriod);
      return {
        start: new Date(Date.UTC(year, 0, 1)),
        end: new Date(Date.UTC(year, 11, 31)),
        label: String(year),
      };
    }

    const dates = Object.values(activityData.daily)
      .flat()
      .map((entry) => entry.date)
      .sort();
    const end = parseCalendarDate(dates[dates.length - 1] || activityData.generated);
    return { start: addCalendarDays(end, -364), end, label: "Last 12 months" };
  }

  function calendarLevel(distance, thresholds) {
    if (!distance) return 0;
    if (distance <= thresholds[0]) return 1;
    if (distance <= thresholds[1]) return 2;
    if (distance <= thresholds[2]) return 3;
    return 4;
  }

  function renderCalendar(sport) {
    const calendar = document.getElementById(`${sport}-calendar`);
    if (!calendar || !activityData.daily?.[sport]) return;

    const range = calendarRange();
    const gridStart = addCalendarDays(range.start, -range.start.getUTCDay());
    const gridEnd = addCalendarDays(range.end, 6 - range.end.getUTCDay());
    const dayCount = calendarDayDifference(gridStart, gridEnd) + 1;
    const weekCount = dayCount / 7;
    const entries = new Map(activityData.daily[sport].map((entry) => [entry.date, entry]));
    const activeDistances = activityData.daily[sport]
      .filter((entry) => {
        const activityDate = parseCalendarDate(entry.date);
        return activityDate >= range.start && activityDate <= range.end && entry.distanceKm > 0;
      })
      .map((entry) => entry.distanceKm)
      .sort((first, second) => first - second);
    const quantile = (fraction) =>
      activeDistances[Math.min(activeDistances.length - 1, Math.floor(activeDistances.length * fraction))] || 0;
    const thresholds = [quantile(0.25), quantile(0.5), quantile(0.75)];

    calendar.replaceChildren();
    calendar.style.setProperty("--calendar-weeks", weekCount);

    const header = document.createElement("div");
    header.className = "activity-calendar-header";
    const label = document.createElement("span");
    label.textContent = range.label;
    const activeDays = document.createElement("span");
    activeDays.textContent = `${activeDistances.length} active ${activeDistances.length === 1 ? "day" : "days"}`;
    header.append(label, activeDays);

    const months = document.createElement("div");
    months.className = "activity-calendar-months";
    let monthCursor = new Date(Date.UTC(gridStart.getUTCFullYear(), gridStart.getUTCMonth(), 1));
    if (monthCursor < gridStart) monthCursor = new Date(Date.UTC(gridStart.getUTCFullYear(), gridStart.getUTCMonth() + 1, 1));
    while (monthCursor <= gridEnd) {
      const month = document.createElement("span");
      month.textContent = monthCursor.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      month.style.gridColumn = `${Math.floor(calendarDayDifference(gridStart, monthCursor) / 7) + 1} / span 4`;
      months.appendChild(month);
      monthCursor = new Date(Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth() + 1, 1));
    }

    const grid = document.createElement("div");
    grid.className = "activity-calendar-grid";
    grid.setAttribute("role", "img");
    grid.setAttribute("aria-label", `${sport} activity by day, ${range.label}`);
    for (let index = 0; index < dayCount; index += 1) {
      const current = addCalendarDays(gridStart, index);
      const key = calendarDateKey(current);
      const entry = entries.get(key);
      const cell = document.createElement("span");
      const outsideRange = current < range.start || current > range.end;
      const level = outsideRange ? 0 : calendarLevel(entry?.distanceKm || 0, thresholds);
      cell.className = `activity-calendar-day level-${level}${outsideRange ? " is-outside" : ""}`;
      if (!outsideRange) {
        const dateLabel = current.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        });
        cell.title = entry
          ? `${entry.distanceKm.toLocaleString("en-US")} km · ${activityLabel(entry.activities)} on ${dateLabel}`
          : `No activity on ${dateLabel}`;
      }
      grid.appendChild(cell);
    }

    const legend = document.createElement("div");
    legend.className = "activity-calendar-legend";
    legend.innerHTML = '<span>Less</span><i class="level-0"></i><i class="level-1"></i><i class="level-2"></i><i class="level-3"></i><i class="level-4"></i><span>More</span>';
    calendar.append(header, months, grid, legend);
  }

  function renderCalendars() {
    ["run", "swim", "ride"].forEach(renderCalendar);
  }

  function renderPeriods() {
    const options = [
      { value: "all", label: "All time" },
      ...activityData.years.map((year) => ({ value: String(year), label: String(year) })),
    ];

    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "activity-period-button";
      button.textContent = option.label;
      button.dataset.period = option.value;
      button.setAttribute("aria-pressed", option.value === selectedPeriod ? "true" : "false");
      button.addEventListener("click", () => selectPeriod(option.value));
      periods.appendChild(button);
    });
  }

  function renderTotals() {
    const totals = activityData.totals[selectedPeriod] || activityData.totals.all;
    ["run", "swim", "ride"].forEach((sport) => {
      document.getElementById(`${sport}-distance`).textContent = formatDistance(
        totals[sport].distanceKm,
        sport
      );
      document.getElementById(`${sport}-count`).textContent = activityLabel(
        totals[sport].activities
      );
    });
    renderCalendars();
  }

  function enabledSports() {
    return mapFilters.filter((input) => input.checked).map((input) => input.value);
  }

  function visibleRoutes() {
    const sports = new Set(enabledSports());
    return activityData.routes.filter(
      (route) =>
        sports.has(route.sport) &&
        (selectedPeriod === "all" || String(route.year) === selectedPeriod)
    );
  }

  function routeFeatureCollection(routes = visibleRoutes()) {
    const fragments = [];
    const counts = new Map();

    routes.forEach((route) => {
      const visited = new Set();
      route.segments.forEach((segment) => {
        for (let index = 1; index < segment.length; index += 1) {
          const start = segment[index - 1];
          const end = segment[index];
          const longitude = (start[0] + end[0]) / 2;
          const latitude = (start[1] + end[1]) / 2;
          const key = `${route.sport}:${Math.round(longitude / DENSITY_CELL)}:${Math.round(
            latitude / DENSITY_CELL
          )}`;
          visited.add(key);
          fragments.push({ sport: route.sport, year: route.year, key, coordinates: [start, end] });
        }
      });
      visited.forEach((key) => counts.set(key, (counts.get(key) || 0) + 1));
    });

    const maximum = { run: 1, ride: 1 };
    counts.forEach((count, key) => {
      const sport = key.startsWith("run:") ? "run" : "ride";
      maximum[sport] = Math.max(maximum[sport], count);
    });

    return {
      type: "FeatureCollection",
      features: fragments.map((fragment) => {
        const density = counts.get(fragment.key) || 1;
        const peak = maximum[fragment.sport];
        const densityNorm = peak <= 1 ? 0 : Math.log(density) / Math.log(peak);
        return {
          type: "Feature",
          properties: {
            sport: fragment.sport,
            year: fragment.year,
            density,
            densityNorm,
          },
          geometry: { type: "LineString", coordinates: fragment.coordinates },
        };
      }),
    };
  }

  function routePoint(route) {
    const longest = route.segments.reduce(
      (current, segment) => (segment.length > current.length ? segment : current),
      []
    );
    return longest[Math.floor(longest.length / 2)] || null;
  }

  function pointFeatureCollection(sport) {
    return {
      type: "FeatureCollection",
      features: visibleRoutes()
        .filter((route) => route.sport === sport)
        .map(routePoint)
        .filter(Boolean)
        .map((coordinates) => ({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates },
        })),
    };
  }

  function addPointLayers(sport, color) {
    const sourceId = `${sport}-activity-points`;
    detailMap.addSource(sourceId, {
      type: "geojson",
      data: pointFeatureCollection(sport),
      cluster: true,
      clusterMaxZoom: 9,
      clusterRadius: 58,
    });

    detailMap.addLayer({
      id: `${sport}-activity-clusters-glow`,
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": color,
        "circle-radius": ["step", ["get", "point_count"], 19, 10, 25, 50, 32, 100, 39],
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.82, 7, 0.72, 9, 0],
        "circle-blur": 0.18,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-stroke-opacity": 0.88,
      },
    });

    detailMap.addLayer({
      id: `${sport}-activity-cluster-count`,
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-font": ["Noto Sans Regular"],
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(0,0,0,0.25)",
        "text-halo-width": 0.8,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 0, 1, 7, 0.9, 9, 0],
      },
    });

    detailMap.addLayer({
      id: `${sport}-activity-point`,
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": color,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 7, 6, 9, 0],
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.88, 7, 0.74, 9, 0],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });

    const clusterLayerId = `${sport}-activity-clusters-glow`;
    const pointLayerId = `${sport}-activity-point`;

    detailMap.on("click", clusterLayerId, (event) => {
      const cluster = event.features?.[0];
      if (cluster) zoomToCluster(sourceId, cluster);
    });
    detailMap.on("click", pointLayerId, (event) => {
      const coordinates = event.features?.[0]?.geometry?.coordinates;
      if (coordinates) {
        detailMap.easeTo({ center: coordinates, zoom: Math.max(detailMap.getZoom(), 13), duration: 700 });
      }
    });

    [clusterLayerId, pointLayerId].forEach((layerId) => {
      detailMap.on("mouseenter", layerId, () => {
        detailMap.getCanvas().style.cursor = "pointer";
      });
      detailMap.on("mouseleave", layerId, () => {
        detailMap.getCanvas().style.cursor = "";
      });
    });
  }

  function zoomToCluster(sourceId, cluster) {
    const source = detailMap.getSource(sourceId);
    const clusterId = cluster.properties?.cluster_id;
    if (!source || clusterId === undefined) return;

    source.getClusterExpansionZoom(clusterId).then((zoom) => {
      detailMap.easeTo({ center: cluster.geometry.coordinates, zoom, duration: 700 });
    });
  }

  function zoomToLargestCluster() {
    if (!detailMapReady) return false;

    const clusters = detailMap.queryRenderedFeatures({
      layers: ["run-activity-clusters-glow", "ride-activity-clusters-glow"],
    });
    const largest = clusters.reduce(
      (current, feature) =>
        Number(feature.properties?.point_count || 0) > Number(current?.properties?.point_count || 0)
          ? feature
          : current,
      null
    );
    if (!largest) return false;

    const sourceId = largest.layer.id.startsWith("run-")
      ? "run-activity-points"
      : "ride-activity-points";
    zoomToCluster(sourceId, largest);
    return true;
  }

  function updateDetailMap() {
    if (!detailMapReady) return;
    detailMap.getSource("activity-routes").setData(routeFeatureCollection());
    detailMap.getSource("run-activity-points").setData(pointFeatureCollection("run"));
    detailMap.getSource("ride-activity-points").setData(pointFeatureCollection("ride"));
  }

  function initializeDetailMap() {
    if (!window.maplibregl) throw new Error("MapLibre did not load");

    detailMap = new window.maplibregl.Map({
      container: "activity-globe-map",
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: activityCenter,
      zoom: 0.9,
      minZoom: 0,
      maxZoom: 20,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
      renderWorldCopies: false,
      dragRotate: true,
      touchZoomRotate: true,
    });

    detailMap.on("style.load", () => {
      detailMap.setProjection({ type: "globe" });
    });

    detailMap.on("styleimagemissing", ({ id }) => {
      if (!detailMap.hasImage(id)) {
        detailMap.addImage(id, {
          width: 1,
          height: 1,
          data: new Uint8Array([0, 0, 0, 0]),
        });
      }
    });

    detailMap.on("load", () => {
      detailMap.addSource("activity-routes", {
        type: "geojson",
        data: routeFeatureCollection(),
      });

      const firstLabel = detailMap
        .getStyle()
        .layers.find((layer) => layer.type === "symbol")?.id;
      const densityColorExpression = [
        "interpolate",
        ["linear"],
        ["get", "densityNorm"],
        0,
        DENSITY_COLORS[0],
        0.25,
        DENSITY_COLORS[1],
        0.5,
        DENSITY_COLORS[2],
        0.75,
        DENSITY_COLORS[3],
        1,
        DENSITY_COLORS[4],
      ];

      detailMap.addLayer(
        {
          id: "activity-route-halo",
          type: "line",
          source: "activity-routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": ["interpolate", ["linear"], ["zoom"], 0, 5, 7, 6, 13, 8, 20, 12],
            "line-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.2, 8, 0.32, 15, 0.62],
            "line-blur": ["interpolate", ["linear"], ["zoom"], 0, 2, 10, 1, 17, 0],
          },
        },
        firstLabel
      );

      detailMap.addLayer(
        {
          id: "activity-route-core",
          type: "line",
          source: "activity-routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": densityColorExpression,
            "line-width": ["interpolate", ["linear"], ["zoom"], 0, 1, 7, 1.8, 13, 3.4, 20, 6],
            "line-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.48, 7, 0.68, 14, 0.92],
          },
        },
        firstLabel
      );

      addPointLayers("run", RUN_COLOR);
      addPointLayers("ride", RIDE_COLOR);
      detailMapReady = true;
      updateDetailMap();
    });
  }

  function makeOverviewProjection(width, height) {
    const extent = [
      [24, 24],
      [width - 24, height - 24],
    ];
    return selectedProjection === "mollweide"
      ? geoMollweide().fitExtent(extent, { type: "Sphere" })
      : geoRobinson().fitExtent(extent, { type: "Sphere" });
  }

  function overviewSymbols(routes) {
    const groups = new Map();
    routes.forEach((route) => {
      const point = routePoint(route);
      if (!point) return;
      const key = `${route.sport}:${Math.round(point[0] * 2) / 2}:${Math.round(point[1] * 2) / 2}`;
      const current = groups.get(key) || {
        sport: route.sport,
        coordinates: [Math.round(point[0] * 2) / 2, Math.round(point[1] * 2) / 2],
        count: 0,
      };
      current.count += 1;
      groups.set(key, current);
    });
    return Array.from(groups.values());
  }

  function longitudeToTile(longitude, zoom) {
    return Math.floor(((longitude + 180) / 360) * 2 ** zoom);
  }

  function latitudeToTile(latitude, zoom) {
    const limited = Math.max(-85.0511, Math.min(85.0511, latitude));
    const radians = (limited * Math.PI) / 180;
    return Math.floor(
      ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * 2 ** zoom
    );
  }

  function overviewTileCoordinates(projection, width, height) {
    let zoom = Math.max(
      2,
      Math.min(14, Math.floor(Math.log2(Math.max(1, currentZoomTransform.k))) + 2)
    );

    if (currentZoomTransform.k <= 1.05) {
      const size = 2 ** zoom;
      return Array.from({ length: size * size }, (_, index) => ({
        z: zoom,
        x: index % size,
        y: Math.floor(index / size),
      }));
    }

    const centerPoint = currentZoomTransform.invert([width / 2, height / 2]);
    const center = projection.invert(centerPoint) || [0, 0];
    const samples = [];
    for (let row = 0; row <= 6; row += 1) {
      for (let column = 0; column <= 8; column += 1) {
        const point = currentZoomTransform.invert([
          (width * column) / 8,
          (height * row) / 6,
        ]);
        const coordinate = projection.invert(point);
        if (!coordinate || !Number.isFinite(coordinate[0]) || !Number.isFinite(coordinate[1])) continue;
        let longitude = coordinate[0];
        while (longitude - center[0] > 180) longitude -= 360;
        while (longitude - center[0] < -180) longitude += 360;
        samples.push([longitude, Math.max(-85.0511, Math.min(85.0511, coordinate[1]))]);
      }
    }

    if (!samples.length) return [];
    const longitudes = samples.map((coordinate) => coordinate[0]);
    const latitudes = samples.map((coordinate) => coordinate[1]);
    const bounds = {
      west: Math.min(...longitudes),
      east: Math.max(...longitudes),
      north: Math.max(...latitudes),
      south: Math.min(...latitudes),
    };

    const coordinatesAtZoom = (tileZoom) => {
      const size = 2 ** tileZoom;
      const west = longitudeToTile(bounds.west, tileZoom);
      const east = longitudeToTile(bounds.east, tileZoom);
      const north = Math.max(0, latitudeToTile(bounds.north, tileZoom));
      const south = Math.min(size - 1, latitudeToTile(bounds.south, tileZoom));
      const result = [];
      const seen = new Set();
      for (let x = west; x <= east; x += 1) {
        for (let y = north; y <= south; y += 1) {
          const wrappedX = ((x % size) + size) % size;
          const key = `${wrappedX}:${y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push({ z: tileZoom, x: wrappedX, y });
        }
      }
      return result;
    };

    let coordinates = coordinatesAtZoom(zoom);
    while (coordinates.length > 72 && zoom > 2) {
      zoom -= 1;
      coordinates = coordinatesAtZoom(zoom);
    }
    return coordinates;
  }

  function decodeVectorTile(buffer, coordinate) {
    const tile = new VectorTile(new Pbf(new Uint8Array(buffer)));
    const groups = {
      landcover: [],
      water: [],
      building: [],
      boundary: [],
      roadMajor: [],
      roadMinor: [],
      rail: [],
      place: [],
    };
    const addLayer = (layerName, destination, filter = () => true, limit = 5000) => {
      const layer = tile.layers[layerName];
      if (!layer) return;
      const count = Math.min(layer.length, limit);
      for (let index = 0; index < count; index += 1) {
        const vectorFeature = layer.feature(index);
        if (!filter(vectorFeature.properties)) continue;
        destination.push(vectorFeature.toGeoJSON(coordinate.x, coordinate.y, coordinate.z));
      }
    };

    addLayer("landcover", groups.landcover, () => true, 1800);
    addLayer("landuse", groups.landcover, () => true, 1800);
    addLayer("water", groups.water, () => true, 2500);
    addLayer("building", groups.building, () => coordinate.z >= 13, 3500);
    addLayer("boundary", groups.boundary, (properties) => Number(properties.admin_level || 99) <= 8, 1800);
    addLayer("transportation", groups.roadMajor, (properties) =>
      ["motorway", "trunk", "primary", "secondary", "tertiary"].includes(properties.class)
    );
    addLayer("transportation", groups.roadMinor, (properties) =>
      ["minor", "service", "path", "track"].includes(properties.class)
    );
    addLayer("transportation", groups.rail, (properties) => properties.class === "rail");
    addLayer(
      "place",
      groups.place,
      (properties) => Boolean(properties.name) && Number(properties.rank || 99) <= (coordinate.z < 7 ? 5 : 14),
      400
    );
    return groups;
  }

  function loadVectorTile(coordinate) {
    const key = `${coordinate.z}/${coordinate.x}/${coordinate.y}`;
    if (vectorTileCache.has(key)) return vectorTileCache.get(key);

    const request = openFreeMapTileJson
      .then((tileJson) => {
        const template = tileJson.tiles?.[0];
        if (!template) throw new Error("OpenFreeMap TileJSON has no vector tile template");
        const url = template
          .replace("{z}", coordinate.z)
          .replace("{x}", coordinate.x)
          .replace("{y}", coordinate.y);
        return fetch(url);
      })
      .then((response) => {
        if (!response.ok) throw new Error(`OpenFreeMap tile returned ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => decodeVectorTile(buffer, coordinate))
      .catch(() => null);
    vectorTileCache.set(key, request);
    return request;
  }

  function appendProjectedCollection(group, className, features, path) {
    if (!features.length) return;
    group
      .append("path")
      .datum({ type: "FeatureCollection", features })
      .attr("class", className)
      .attr("d", path);
  }

  async function renderProjectedBasemap({ group, labelGroup, projection, path, width, height, version }) {
    const coordinates = overviewTileCoordinates(projection, width, height);
    const tiles = (await Promise.all(coordinates.map(loadVectorTile))).filter(Boolean);
    if (version !== overviewRenderVersion || selectedProjection === "orthographic") return;

    const combined = {
      landcover: tiles.flatMap((tile) => tile.landcover),
      water: tiles.flatMap((tile) => tile.water),
      building: tiles.flatMap((tile) => tile.building),
      boundary: tiles.flatMap((tile) => tile.boundary),
      roadMajor: tiles.flatMap((tile) => tile.roadMajor),
      roadMinor: tiles.flatMap((tile) => tile.roadMinor),
      rail: tiles.flatMap((tile) => tile.rail),
      place: tiles.flatMap((tile) => tile.place),
    };

    appendProjectedCollection(group, "activity-vector-landcover", combined.landcover, path);
    appendProjectedCollection(group, "activity-vector-water", combined.water, path);
    appendProjectedCollection(group, "activity-vector-buildings", combined.building, path);
    appendProjectedCollection(group, "activity-vector-boundaries", combined.boundary, path);
    appendProjectedCollection(group, "activity-vector-road activity-vector-road-minor", combined.roadMinor, path);
    appendProjectedCollection(group, "activity-vector-rail", combined.rail, path);
    appendProjectedCollection(group, "activity-vector-road activity-vector-road-major", combined.roadMajor, path);

    if (currentZoomTransform.k >= 2) {
      const visibleNames = new Set();
      labelGroup
        .attr("class", "activity-vector-labels")
        .selectAll("text")
        .data(
          combined.place.filter((place) => {
            const name = place.properties?.name;
            if (!name || visibleNames.has(name)) return false;
            visibleNames.add(name);
            return projection(place.geometry.coordinates);
          })
        )
        .join("text")
        .attr("x", (place) => projection(place.geometry.coordinates)[0])
        .attr("y", (place) => projection(place.geometry.coordinates)[1])
        .attr("font-size", Math.max(1.8, 9 / currentZoomTransform.k))
        .text((place) => place.properties.name);
    }
  }

  function zoomToOverviewSymbol(symbol) {
    if (!overviewContext || !symbol) return false;
    const point = overviewContext.projection(symbol.coordinates);
    if (!point) return false;
    const scale = Math.max(8, Math.min(overviewZoom.scaleExtent()[1], currentZoomTransform.k * 4));
    const transform = d3.zoomIdentity
      .translate(overviewContext.width / 2, overviewContext.height / 2)
      .scale(scale)
      .translate(-point[0], -point[1]);
    mapSvg.transition().duration(650).call(overviewZoom.transform, transform);
    return true;
  }

  function zoomToLargestOverviewSymbol() {
    if (!overviewContext || currentZoomTransform.k >= 2.5) return false;
    const largest = overviewContext.symbols.reduce(
      (current, symbol) => (symbol.count > (current?.count || 0) ? symbol : current),
      null
    );
    return zoomToOverviewSymbol(largest);
  }

  function renderOverviewMap() {
    if (!activityData || !countries || selectedProjection === "orthographic") return;

    const version = ++overviewRenderVersion;
    const width = Math.max(300, Math.floor(mapElement.getBoundingClientRect().width));
    const height = width < 600 ? Math.max(350, Math.round(width * 1.04)) : 540;
    const projection = makeOverviewProjection(width, height);
    const path = d3.geoPath(projection);
    const densityColor = d3
      .scaleLinear()
      .domain([0, 0.25, 0.5, 0.75, 1])
      .range(DENSITY_COLORS)
      .clamp(true);
    const sphere = { type: "Sphere" };
    const routes = visibleRoutes();
    const routeFeatures = routeFeatureCollection(routes).features;
    const overviewRouteFeatures = Array.from(
      d3.group(
        routeFeatures,
        (route) => `${route.properties.sport}:${Math.round(route.properties.densityNorm * 4)}`
      ),
      ([key, features]) => {
        const [sport, bucket] = key.split(":");
        return {
          type: "Feature",
          properties: { sport, densityNorm: Number(bucket) / 4 },
          geometry: {
            type: "MultiLineString",
            coordinates: features.map((feature) => feature.geometry.coordinates),
          },
        };
      }
    );
    const symbols = overviewSymbols(routes)
      .map((symbol) => ({ ...symbol, point: projection(symbol.coordinates) }))
      .filter((symbol) => symbol.point);
    overviewContext = { projection, width, height, symbols };

    mapSvg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", width).attr("height", height);
    mapSvg.selectAll("*").remove();

    const defs = mapSvg.append("defs");
    const oceanGradient = defs
      .append("radialGradient")
      .attr("id", "activity-ocean-gradient")
      .attr("cx", "35%")
      .attr("cy", "28%")
      .attr("r", "74%");
    oceanGradient.append("stop").attr("offset", "0%").attr("class", "ocean-stop-light");
    oceanGradient.append("stop").attr("offset", "100%").attr("class", "ocean-stop-deep");
    defs
      .append("filter")
      .attr("id", "activity-heat-blur")
      .attr("x", "-60%")
      .attr("y", "-60%")
      .attr("width", "220%")
      .attr("height", "220%")
      .append("feGaussianBlur")
      .attr("stdDeviation", 2.5);
    defs
      .append("clipPath")
      .attr("id", "activity-map-clip")
      .append("path")
      .attr("d", path(sphere));

    const mapRoot = mapSvg
      .append("g")
      .attr("class", "activity-map-root")
      .attr("transform", currentZoomTransform);
    mapRoot.append("path").datum(sphere).attr("class", "activity-map-ocean").attr("d", path);
    mapRoot
      .append("path")
      .datum(d3.geoGraticule10())
      .attr("class", "activity-map-graticule")
      .attr("d", path);
    mapRoot
      .append("g")
      .attr("class", "activity-map-countries")
      .selectAll("path")
      .data(countries.features)
      .join("path")
      .attr("d", path);

    const basemapLayer = mapRoot
      .append("g")
      .attr("class", "activity-vector-basemap")
      .attr("clip-path", "url(#activity-map-clip)");

    const routeLayer = mapRoot.append("g").attr("clip-path", "url(#activity-map-clip)");
    routeLayer
      .append("g")
      .selectAll("path")
      .data(overviewRouteFeatures)
      .join("path")
      .attr("class", (route) => `activity-route activity-route-${route.properties.sport} activity-route-halo`)
      .attr("stroke", "#ffffff")
      .attr("d", path);
    routeLayer
      .append("g")
      .selectAll("path")
      .data(overviewRouteFeatures)
      .join("path")
      .attr("class", (route) => `activity-route activity-route-${route.properties.sport} activity-route-core`)
      .attr("stroke", (route) => densityColor(route.properties.densityNorm))
      .attr("d", path);

    const labelLayer = mapRoot
      .append("g")
      .attr("class", "activity-vector-labels")
      .attr("clip-path", "url(#activity-map-clip)");
    renderProjectedBasemap({
      group: basemapLayer,
      labelGroup: labelLayer,
      projection,
      path,
      width,
      height,
      version,
    });

    mapRoot
      .append("g")
      .attr("class", "activity-overview-symbols")
      .style("opacity", Math.max(0, Math.min(1, (6 - currentZoomTransform.k) / 3)))
      .selectAll("circle")
      .data(symbols)
      .join("circle")
      .attr("class", (symbol) => `activity-overview-symbol activity-overview-symbol-${symbol.sport}`)
      .attr("role", "button")
      .attr("tabindex", 0)
      .attr("aria-label", (symbol) =>
        `${symbol.count} ${symbol.sport === "run" ? "running" : "cycling"} activities; zoom in`
      )
      .attr("cx", (symbol) => symbol.point[0])
      .attr("cy", (symbol) => symbol.point[1])
      .attr("r", (symbol) => Math.min(18, 5 + Math.sqrt(symbol.count) * 2.2))
      .on("click", (event, symbol) => {
        event.stopPropagation();
        zoomToOverviewSymbol(symbol);
      })
      .on("keydown", (event, symbol) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          zoomToOverviewSymbol(symbol);
        }
      });
    mapRoot.append("path").datum(sphere).attr("class", "activity-map-outline").attr("d", path);
  }

  function renderMap() {
    const showGlobe = selectedProjection === "orthographic";
    mapElement.classList.toggle("is-globe", showGlobe);
    mapElement.classList.toggle("is-overview", !showGlobe);
    document.getElementById("activity-globe-map").setAttribute("aria-hidden", showGlobe ? "false" : "true");
    mapSvg.attr("aria-hidden", showGlobe ? "true" : "false");
    if (showGlobe) {
      overviewRenderVersion += 1;
      updateDetailMap();
      if (detailMap) window.setTimeout(() => detailMap.resize(), 0);
    } else {
      renderOverviewMap();
    }
  }

  function selectPeriod(period) {
    selectedPeriod = period;
    periods.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.period === period ? "true" : "false");
    });
    renderTotals();
    renderMap();
  }

  function selectProjection(name) {
    selectedProjection = name;
    currentZoomTransform = d3.zoomIdentity;
    projectionButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.projection === name ? "true" : "false");
    });
    if (name !== "orthographic") mapSvg.call(overviewZoom.transform, d3.zoomIdentity);
    renderMap();
  }

  const overviewZoom = d3
    .zoom()
    .scaleExtent([1, 4096])
    .on("zoom", (event) => {
      currentZoomTransform = event.transform;
      mapSvg.select(".activity-map-root").attr("transform", currentZoomTransform);
      mapSvg
        .select(".activity-overview-symbols")
        .style("opacity", Math.max(0, Math.min(1, (6 - currentZoomTransform.k) / 3)));
    })
    .on("end", () => {
      if (selectedProjection === "orthographic") return;
      window.clearTimeout(overviewRenderTimer);
      overviewRenderTimer = window.setTimeout(renderOverviewMap, 90);
    });

  mapSvg.call(overviewZoom);
  mapFilters.forEach((filter) => filter.addEventListener("change", renderMap));
  projectionButtons.forEach((button) => {
    button.addEventListener("click", () => selectProjection(button.dataset.projection));
  });
  zoomButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.zoom;
      if (selectedProjection === "orthographic" && detailMap) {
        if (action === "in" && !zoomToLargestCluster()) detailMap.zoomIn({ duration: 240 });
        if (action === "out") detailMap.zoomOut({ duration: 240 });
        if (action === "reset") {
          detailMap.easeTo({ center: activityCenter, zoom: 0.9, bearing: 0, pitch: 0, duration: 500 });
        }
        return;
      }

      const transition = mapSvg.transition().duration(220);
      if (action === "in" && !zoomToLargestOverviewSymbol()) {
        transition.call(overviewZoom.scaleBy, 1.8);
      }
      if (action === "out") transition.call(overviewZoom.scaleBy, 1 / 1.8);
      if (action === "reset") transition.call(overviewZoom.transform, d3.zoomIdentity);
    });
  });

  Promise.all([
    fetch(source).then((response) => {
      if (!response.ok) throw new Error(`Activity data returned ${response.status}`);
      return response.json();
    }),
    import("https://esm.sh/@d3-maps/atlas@1.0.0/world/countries/countries-110m").then(
      (module) => module.default || module
    ),
  ])
    .then(([data, world]) => {
      activityData = data;
      countries = feature(world, world.objects.features);
      const coordinates = activityData.routes.flatMap((route) =>
        route.segments.flatMap((segment) => {
          if (segment.length < 3) return segment;
          return [segment[0], segment[Math.floor(segment.length / 2)], segment[segment.length - 1]];
        })
      );
      activityCenter = d3.geoCentroid({ type: "MultiPoint", coordinates });

      renderPeriods();
      renderTotals();
      initializeDetailMap();
      renderMap();
      new ResizeObserver(() => {
        if (selectedProjection === "orthographic" && detailMap) detailMap.resize();
        else renderOverviewMap();
      }).observe(mapElement);

      status.textContent = "Activity summary loaded.";
      status.classList.add("is-ready");
    })
    .catch(() => {
      status.textContent = "The activity summary could not be loaded.";
      status.classList.add("is-error");
      mapElement.classList.add("activity-map-unavailable");
      mapElement.textContent = "Map data is unavailable.";
    });
}
