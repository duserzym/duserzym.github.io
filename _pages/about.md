---
layout: about
title: About
permalink: /
nav: false
---

<section id="research" class="research-intro" data-toc-label="Research">
  <div class="section-heading research-heading">
    <div>
      <p class="section-kicker">Research</p>
      <h2>Research interests</h2>
    </div>
  </div>

  <div class="research-cards">
    <article class="research-card">
      <span class="card-index">Deep time</span>
      <h3>Ancient paleogeography</h3>
      <p>Reconstructing Laurentia, the Grenville orogen, and the Arabian–Nubian Shield using magnetic records and geologic time.</p>
      <span class="card-detail">Paleogeography · Tectonics</span>
    </article>
    <article class="research-card">
      <span class="card-index">Magnetism</span>
      <h3>Magnetic minerals</h3>
      <p>Studying how magnetic minerals acquire and preserve records of ancient magnetic fields.</p>
      <span class="card-detail">Rock magnetism · Micromagnetics</span>
    </article>
    <article class="research-card">
      <span class="card-index">Geologic time</span>
      <h3>Geochronology</h3>
      <p>Combining U–Pb ages and cooling histories with magnetic directions and field observations.</p>
      <span class="card-detail">Geochronology · Thermochronology</span>
    </article>
  </div>

  {% assign total_field_weeks = 0 %}
  {% for cv_section in site.data.cv %}
    {% if cv_section.title == "Original Field Work" %}
      {% for field_site in cv_section.contents %}
        {% assign total_field_weeks = total_field_weeks | plus: field_site.weeks %}
      {% endfor %}
    {% endif %}
  {% endfor %}
  <div class="research-foot">
    <p><span>{{ total_field_weeks }} weeks</span> of field work across North America, Europe, and the Middle East.</p>
    <a href="{{ '/publications/' | relative_url }}">Browse publications <span aria-hidden="true">→</span></a>
  </div>
</section>

<section id="software" class="open-science" data-toc-label="Open science">
  <div>
    <p class="section-kicker">Open science</p>
    <h2>Scientific software</h2>
  </div>
  <div class="tool-list">
    <a href="https://github.com/PmagPy/PmagPy">
      <span class="tool-name">PmagPy</span>
      <span class="tool-role">Paleomagnetic analysis contributor</span>
      <span aria-hidden="true">↗</span>
    </a>
    <a href="https://github.com/PmagPy/RockmagPy-notebooks">
      <span class="tool-name">RockmagPy</span>
      <span class="tool-role">Rock-magnetic workflows contributor</span>
      <span aria-hidden="true">↗</span>
    </a>
    <a href="https://duserzym.github.io/rock_magnetometry/">
      <span class="tool-name">Rock Magnetometry Lectures</span>
      <span class="tool-role">Course notes and lecture materials</span>
      <span aria-hidden="true">↗</span>
    </a>
    <a href="https://github.com/duserzym/H2Matrices.jl">
      <span class="tool-name">H2Matrices.jl</span>
      <span class="tool-role">Hierarchical H²-matrix computations</span>
      <span aria-hidden="true">↗</span>
    </a>
    <a href="https://github.com/duserzym/DisconnectivityGraphs.jl">
      <span class="tool-name">DisconnectivityGraphs.jl</span>
      <span class="tool-role">Energy-landscape analysis</span>
      <span aria-hidden="true">↗</span>
    </a>
    <a href="https://github.com/duserzym/RAPID">
      <span class="tool-name">RapidPy</span>
      <span class="tool-role">Paleomagnetic instrument control</span>
      <span aria-hidden="true">↗</span>
    </a>
  </div>
</section>

<a id="photography" class="lake-photo-link" data-toc-label="Photography" href="{{ '/projects/minnesota/' | relative_url }}" aria-label="View Lake Superior summer 2026 in the Minnesota photography gallery">
  <img src="{{ '/assets/img/projects/minnesota/lake-superior-summer-2026.jpg' | relative_url }}" alt="Lake Superior on a summer day in 2026">
  <span class="lake-photo-caption">
    <span>Lake Superior summer 2026</span>
    <span>View photograph →</span>
  </span>
</a>
