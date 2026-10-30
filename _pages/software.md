---
layout: page
title: Projects
permalink: /software/
description: Scientific software, laboratory tools, and open teaching resources.
nav: true
nav_order: 2
project_categories:
  - Laboratory tools
  - Modeling and analysis
  - Teaching resources
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
