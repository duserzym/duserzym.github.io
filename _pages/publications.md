---
layout: page
permalink: /publications/
title: Publications
description: Peer-reviewed publications and conference abstracts
peer_reviewed_years: [2026, 2025, 2024, 2023, 2022, 2021]
conference_years: [2025, 2024, 2023, 2022, 2020, 2019]
nav: true
nav_order: 1
---
<!-- _pages/publications.md -->

<div class="publications">

<h1>Peer-Reviewed Publications</h1>
{%- for y in page.peer_reviewed_years %}
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @article[year={{y}}]* %}
{% endfor %}

<h1>Conference Abstracts & Proceedings</h1>
{%- for y in page.conference_years %}
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @inproceedings[year={{y}}]* %}
{% endfor %}

</div>
