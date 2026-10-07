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

<section id="software" class="featured-projects" data-toc-label="Projects" aria-labelledby="featured-projects-title">
  <div class="section-heading">
    <div>
      <p class="section-kicker">Open science</p>
      <h2 id="featured-projects-title">Featured projects</h2>
    </div>
    <p>Tools for reconstructing Earth’s past and making measurements in the lab.</p>
  </div>
  <div class="software-grid software-grid-featured">
    {% assign featured_projects = site.data.software | where: "pinned", true %}
    {% for project in featured_projects %}
      {% include software_card.html %}
    {% endfor %}
  </div>
  <div class="project-browse">
    <a href="{{ '/software/' | relative_url }}">Explore all {{ site.data.software | size }} projects <span aria-hidden="true">→</span></a>
  </div>
</section>

<a id="photography" class="lake-photo-link" data-toc-label="Photography" href="{{ '/projects/Minnesota/' | relative_url }}" aria-label="View Lake Superior summer 2026 in the Minnesota photography gallery">
  <img src="{{ '/assets/img/projects/minnesota/lake-superior-summer-2026.jpg' | relative_url }}" alt="Lake Superior on a summer day in 2026">
  <span class="lake-photo-caption">
    <span>Lake Superior summer 2026</span>
    <span>View photograph →</span>
  </span>
</a>
