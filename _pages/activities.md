---
layout: page
title: Activities
permalink: /activities/
description: A simple record of running, swimming, and cycling.
nav: true
nav_order: 4
toc: false
activity_dashboard: true
---

<div class="activity-dashboard" data-source="{{ '/assets/data/activities.json' | relative_url }}">
  <section class="activity-overview" aria-labelledby="activity-period-label">
    <div class="activity-period-wrap">
      <span id="activity-period-label" class="activity-control-label">Time period</span>
      <div id="activity-periods" class="activity-periods" role="group" aria-labelledby="activity-period-label"></div>
    </div>
  </section>

  <p id="activity-status" class="activity-status" role="status" aria-live="polite">Loading activity summary…</p>

  <section class="activity-cards" aria-label="Activity totals">
    <article class="activity-card activity-card-run">
      <div class="activity-card-topline">
        <i class="fas fa-running" aria-hidden="true"></i>
      </div>
      <h2>Running</h2>
      <p class="activity-distance"><strong id="run-distance">—</strong> <span>km</span></p>
      <p id="run-count" class="activity-count">— activities</p>
      <div id="run-calendar" class="activity-calendar" aria-label="Running activity calendar"></div>
    </article>

    <article class="activity-card activity-card-swim">
      <div class="activity-card-topline">
        <i class="fas fa-swimmer" aria-hidden="true"></i>
      </div>
      <h2>Swimming</h2>
      <p class="activity-distance"><strong id="swim-distance">—</strong> <span>km</span></p>
      <p id="swim-count" class="activity-count">— activities</p>
      <div id="swim-calendar" class="activity-calendar" aria-label="Swimming activity calendar"></div>
    </article>

    <article class="activity-card activity-card-ride">
      <div class="activity-card-topline">
        <i class="fas fa-bicycle" aria-hidden="true"></i>
      </div>
      <h2>Cycling</h2>
      <p class="activity-distance"><strong id="ride-distance">—</strong> <span>km</span></p>
      <p id="ride-count" class="activity-count">— activities</p>
      <div id="ride-calendar" class="activity-calendar" aria-label="Cycling activity calendar"></div>
    </article>
  </section>

  <section class="activity-map-section" aria-labelledby="activity-map-title">
    <div class="activity-section-heading activity-map-heading">
      <div>
        <p class="section-kicker">Footprints</p>
        <h2 id="activity-map-title">Where I have been...</h2>
      </div>
      <div class="activity-map-controls">
        <div>
          <span class="activity-control-label">Projection</span>
          <div id="activity-projections" class="activity-projections" role="group" aria-label="Map projection">
            <button type="button" data-projection="orthographic" aria-pressed="true">Orthographic</button>
            <button type="button" data-projection="mollweide" aria-pressed="false">Mollweide</button>
            <button type="button" data-projection="robinson" aria-pressed="false">Robinson</button>
          </div>
        </div>
        <div class="activity-map-filters" role="group" aria-label="Map activities">
          <label class="map-filter map-filter-run">
            <input type="checkbox" value="run" checked>
            <span aria-hidden="true"></span>
            Running
          </label>
          <label class="map-filter map-filter-ride">
            <input type="checkbox" value="ride" checked>
            <span aria-hidden="true"></span>
            Cycling
          </label>
        </div>
        <div class="activity-density-legend" aria-label="Route density: blue is lower and red is higher">
          <span>Lower density</span>
          <i aria-hidden="true"></i>
          <span>Higher density</span>
        </div>
      </div>
    </div>

    <div id="activity-map" class="activity-map" aria-label="Projected running and cycling route-density map">
      <div class="activity-zoom-controls" role="group" aria-label="Map zoom controls">
        <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
        <button type="button" data-zoom="out" aria-label="Zoom out">−</button>
        <button type="button" data-zoom="reset" aria-label="Reset map view"><i class="fas fa-globe-americas" aria-hidden="true"></i></button>
      </div>
      <div id="activity-globe-map" aria-hidden="false"></div>
      <svg role="img" aria-labelledby="activity-map-title activity-map-description"></svg>
      <a class="activity-overview-attribution" href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap · OpenStreetMap</a>
      <span id="activity-map-description" class="sr-only">A zoomable route-density map following running and cycling GPS traces.</span>
    </div>
    <noscript><p class="activity-map-fallback">Enable JavaScript to view the activity map.</p></noscript>
  </section>
</div>
