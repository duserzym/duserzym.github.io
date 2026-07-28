(() => {
  const toc = document.querySelector("[data-page-toc]");
  if (!toc) return;

  const homeTargets = Array.from(document.querySelectorAll(".about-home [data-toc-label][id]"));
  const contentRoot = document.querySelector(".post article, .post-content");
  const contentTargets = contentRoot
    ? Array.from(contentRoot.querySelectorAll("h1, h2")).filter((heading) => !heading.closest(".abstract, .bibtex"))
    : [];
  const targets = homeTargets.length ? homeTargets : contentTargets;

  if (targets.length < 2) return;

  const hasTopLevelHeading = contentTargets.some((heading) => heading.tagName === "H1");
  const usedIds = new Set(Array.from(document.querySelectorAll("[id]"), (element) => element.id));
  const slugify = (value) =>
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section";

  const uniqueId = (label) => {
    const base = slugify(label);
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(candidate);
    return candidate;
  };

  const list = toc.querySelector("ol");
  const links = targets.map((target) => {
    const heading = target.matches("h1, h2") ? target : target.querySelector("h1, h2");
    const label = target.dataset.tocLabel || heading?.textContent.trim();
    if (!target.id) target.id = uniqueId(label);

    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${target.id}`;
    link.textContent = label;
    if (!homeTargets.length && hasTopLevelHeading && heading?.tagName === "H2") {
      item.classList.add("page-toc-subitem");
    }
    item.append(link);
    list.append(item);
    return { target, link };
  });

  const details = toc.querySelector("details");
  const desktopQuery = window.matchMedia("(min-width: 1280px)");
  const syncDisclosure = () => {
    details.open = desktopQuery.matches;
  };
  syncDisclosure();
  desktopQuery.addEventListener?.("change", syncDisclosure);

  links.forEach(({ link }) => {
    link.addEventListener("click", () => {
      if (!desktopQuery.matches) details.open = false;
    });
  });

  const setActive = (activeTarget) => {
    links.forEach(({ target, link }) => {
      const active = target === activeTarget;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActive(visible[0].target);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 1] }
    );
    links.forEach(({ target }) => observer.observe(target));
  }

  setActive(links[0].target);
  toc.hidden = false;
})();
