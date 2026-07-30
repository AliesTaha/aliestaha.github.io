(() => {
  const buttons = Array.from(document.querySelectorAll("[data-filter]"));
  const posts = Array.from(document.querySelectorAll("[data-category]"));
  const status = document.querySelector("#filter-status");
  const validFilters = new Set(["technical", "personal"]);

  if (!buttons.length || !posts.length) return;

  const filterFromHash = () => {
    const value = window.location.hash.slice(1).toLowerCase();
    return validFilters.has(value) ? value : "technical";
  };

  const applyFilter = (filter, updateUrl = false) => {
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
    });

    const visiblePosts = posts.filter((post) => post.dataset.category === filter);

    posts.forEach((post) => {
      post.hidden = !visiblePosts.includes(post);
    });

    visiblePosts.forEach((post, index) => {
      post.dataset.side = index % 2 === 0 ? "left" : "right";
    });

    if (status) {
      status.textContent = `${visiblePosts.length} ${filter} ${
        visiblePosts.length === 1 ? "post" : "posts"
      }`;
    }

    if (updateUrl) {
      history.replaceState(null, "", `#${filter}`);
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter, true));
  });

  window.addEventListener("hashchange", () => applyFilter(filterFromHash()));
  applyFilter(filterFromHash());
})();
