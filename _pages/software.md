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
---

<div class="software-directory">
  {% for category in page.project_categories %}
  <section id="{{ category | slugify }}" class="software-category" data-toc-label="{{ category }}" aria-labelledby="{{ category | slugify }}-title">
    <div class="software-category-heading">
      <h2 id="{{ category | slugify }}-title">{{ category }}</h2>
      {% assign category_projects = site.data.software | where: "category", category %}
      <span>{{ category_projects | size }} {% if category_projects.size == 1 %}project{% else %}projects{% endif %}</span>
    </div>
    <div class="software-grid">
      {% for project in category_projects %}
        {% include software_card.html %}
      {% endfor %}
    </div>
  </section>
  {% endfor %}
  {% include interactive_gallery.html %}
</div>
