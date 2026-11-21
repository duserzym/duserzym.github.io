---
layout: page
title: Projects
permalink: /software/
description: Scientific software, laboratory tools, and open teaching resources.
nav: true
nav_order: 2
project_categories:
  - U–Pb workflow
  - Laboratory tools
  - Modeling and analysis
  - Teaching resources
project_category_intros:
  U–Pb workflow: "Linked open-source apps for U–Pb geochronology, from laser-ablation spot dates to ID-TIMS on plucked grains. Results meet in the lab database and in UPb Lab, and a shared reference-material library sits underneath."
project_category_pipelines:
  U–Pb workflow:
    - app: GrainAtlas
      action: image mounts, place spots
    - app: bracketeer
      action: plan the run sequence
    - app: UPbRPy Studio
      action: reduce LA-ICP-MS data
    - app: UPb Lab
      action: review stored results
    - app: GrainAtlas
      action: mark grains to pluck for TIMS
    - app: filament
      action: raw ID-TIMS data to ratios
    - app: ID-TIMS Reduction
      action: ratios to dates
    - app: UPb Lab
      action: review TIMS fractions
project_subcategories:
  Teaching resources:
    - Geochemistry
    - Geophysics
---

<div class="software-directory">
  {% for category in page.project_categories %}
  <section id="{{ category | slugify }}" class="software-category" data-toc-label="{{ category }}" aria-labelledby="{{ category | slugify }}-title">
    <div class="software-category-heading">
      <h2 id="{{ category | slugify }}-title">{{ category }}</h2>
      {% assign category_projects = site.data.software | where: "category", category %}
      <span>{{ category_projects | size }} {% if category_projects.size == 1 %}project{% else %}projects{% endif %}</span>
    </div>
    {% if page.project_category_intros[category] %}
    <p class="software-category-intro">{{ page.project_category_intros[category] }}</p>
    {% endif %}
    {% if page.project_category_pipelines[category] %}
    <ol class="software-pipeline" aria-label="Workflow order">
      {% for step in page.project_category_pipelines[category] %}
      <li><span class="software-pipeline-app">{{ step.app }}</span><span class="software-pipeline-action">{{ step.action }}</span></li>
      {% endfor %}
    </ol>
    {% endif %}
    {% assign subcategories = page.project_subcategories[category] %}
    {% if subcategories %}
      {% for subcategory in subcategories %}
      {% assign subcategory_projects = category_projects | where: "subcategory", subcategory %}
      <section class="software-subcategory" aria-labelledby="{{ category | slugify }}-{{ subcategory | slugify }}-title">
        <h3 id="{{ category | slugify }}-{{ subcategory | slugify }}-title" class="software-subcategory-title">{{ subcategory }}</h3>
        <div class="software-grid">
          {% for project in subcategory_projects %}
            {% include software_card.html heading_level=4 %}
          {% endfor %}
        </div>
      </section>
      {% endfor %}
    {% else %}
    <div class="software-grid">
      {% for project in category_projects %}
        {% include software_card.html %}
      {% endfor %}
    </div>
    {% endif %}
  </section>
  {% endfor %}
  {% include interactive_gallery.html %}
</div>
<script src="{{ '/assets/js/release-links.js' | relative_url }}" defer></script>
