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

<section id="peer-reviewed-publications" class="numbered-publications">
<h1>Peer-Reviewed Publications <span class="publication-count" aria-live="polite"></span></h1>
{%- for y in page.peer_reviewed_years %}
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @article[year={{y}}]* %}
{% endfor %}
</section>

<section id="conference-publications" class="numbered-publications">
<h1>Conference Abstracts & Proceedings <span class="publication-count" aria-live="polite"></span></h1>
{%- for y in page.conference_years %}
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @inproceedings[year={{y}}]* %}
{% endfor %}
</section>

</div>

<script>
  (() => {
    function numberPublications(sectionId, label) {
      const section = document.querySelector(sectionId);
      if (!section) return;

      const publications = Array.from(section.querySelectorAll("ol.bibliography > li"));
      const total = publications.length;

      publications.forEach((publication, index) => {
        const number = document.createElement("span");
        number.className = "publication-number";
        number.textContent = String(total - index);
        number.setAttribute("aria-label", `${label} ${total - index} of ${total}`);
        publication.prepend(number);
      });

      const count = section.querySelector(".publication-count");
      if (count) count.textContent = `(${total})`;
    }

    numberPublications("#peer-reviewed-publications", "Peer-reviewed publication");
    numberPublications("#conference-publications", "Conference abstract");
  })();
</script>
