(() => {
  const releases = new Map();
  const ttl = 60 * 60 * 1000;
  const validRelease = (release) => release && typeof release.tag_name === "string" && Array.isArray(release.assets);

  const latestRelease = async (repo) => {
    const key = `release:${repo}`;
    try {
      const cached = JSON.parse(sessionStorage.getItem(key));
      if (cached && Date.now() - cached.timestamp < ttl && validRelease(cached.release)) return cached.release;
    } catch (error) {}

    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (response.status !== 200) return null;

    const data = await response.json();
    if (!validRelease(data)) return null;
    const release = {
      tag_name: data.tag_name,
      assets: data.assets
        .filter((asset) => asset && typeof asset.name === "string" && typeof asset.browser_download_url === "string")
        .map(({ name, browser_download_url }) => ({ name, browser_download_url })),
    };
    try {
      sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), release }));
    } catch (error) {}
    return release;
  };

  document.querySelectorAll("[data-gh-repo]").forEach((list) => {
    const repo = list.dataset.ghRepo;
    if (!releases.has(repo)) releases.set(repo, latestRelease(repo));
    releases.get(repo).then((release) => {
      if (!release) return;
      const tag = list.querySelector("[data-release-tag]");
      if (tag) tag.textContent = release.tag_name;

      list.querySelectorAll("a[data-asset-pattern]").forEach((link) => {
        let pattern;
        try {
          pattern = new RegExp(link.dataset.assetPattern);
        } catch (error) {
          return;
        }
        const asset = release.assets.find((entry) => entry && typeof entry.name === "string" && pattern.test(entry.name));
        if (asset && typeof asset.browser_download_url === "string" && asset.browser_download_url.startsWith("https://github.com/")) {
          link.href = asset.browser_download_url;
        }
      });
    }).catch(() => {});
  });
})();
