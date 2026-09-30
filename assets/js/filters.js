(() => {
  const buttons = Array.from(document.querySelectorAll("[data-filter]"));
  const posts = Array.from(document.querySelectorAll("[data-category]"));
  const postList = document.querySelector("#post-list");
  const bodyPanel = document.querySelector("#body-panel");
  const status = document.querySelector("#filter-status");
  const sections = { mind: "technical", heart: "personal", body: null };
  const aliases = { technical: "mind", personal: "heart", health: "body" };
  if (!buttons.length || !postList || !bodyPanel) return;

  const sectionFromHash = () => {
    const hash = window.location.hash.slice(1).toLowerCase();
    const section = aliases[hash] || hash;
    return Object.hasOwn(sections, section) ? section : "mind";
  };

  const applySection = (section, updateUrl = false) => {
    buttons.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === section));
    });
    const isBody = section === "body";
    postList.hidden = isBody;
    bodyPanel.hidden = !isBody;
    const visible = posts.filter(post => post.dataset.category === sections[section]);
    posts.forEach(post => { post.hidden = !visible.includes(post); });
    visible.forEach((post, index) => { post.dataset.side = index % 2 === 0 ? "left" : "right"; });
    if (status) {
      status.hidden = isBody;
      status.textContent = `${visible.length} ${visible.length === 1 ? "post" : "posts"}`;
    }
    if (updateUrl && window.location.hash !== `#${section}`) {
      history.pushState(null, "", `#${section}`);
    }
    document.dispatchEvent(new CustomEvent("site:sectionchange", { detail: { section } }));
  };

  buttons.forEach(button => button.addEventListener("click", () => applySection(button.dataset.filter, true)));
  window.addEventListener("hashchange", () => applySection(sectionFromHash()));
  applySection(sectionFromHash());
  const hash = window.location.hash.slice(1).toLowerCase();
  if (aliases[hash]) history.replaceState(null, "", `#${aliases[hash]}`);
})();
