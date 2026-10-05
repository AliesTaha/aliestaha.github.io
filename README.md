# alibytes.com

Personal writing, technical articles, and a WHOOP dashboard. Built with Jekyll on GitHub Pages.

## Writing

All articles live in one place:

- `blogs/personal/`: personal writing in the journal style.
- `blogs/technical/`: technical articles and links to work published elsewhere.

Create a file such as `blogs/personal/on-purpose.md`:

```md
---
layout: post
title: "On Purpose"
description: "This is my current purpose. Hill-climb"
date: 2026-10-04
category: personal
permalink: /writing/on-purpose/
---

Your writing here. Keep crossed-out words with <del>hours</del>.
```

Use `category: technical` for technical writing. For an external article, use `layout: external` and add `external_url` and `external_source`. The homepage, RSS feed, and sitemap use these files automatically, sorted by date. Add `published: false` to keep a draft off the site.

`redirects/` preserves old links. It contains no articles.

## Preview

```sh
bundle install
bundle exec jekyll serve
```

The static site is generated in the ignored `_site/` folder. Dependencies stay in the ignored `vendor/` folder.

## Health

The browser reads WHOOP measurements from `assets/data/health.json` and Hevy workout totals from `assets/data/lifting.json`. The Mac updater runs independently of Codex. See [HEALTH.md](HEALTH.md) for its commands.

For a lightweight checkout without the site's image and data history:

```sh
git clone --depth 1 --single-branch https://github.com/AliesTaha/aliestaha.github.io.git
```
