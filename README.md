# aliestaha.com

A small Jekyll blog hosted on GitHub Pages.

## Publish a post on this site

Create a Markdown file in `_posts` named `YYYY-MM-DD-your-title.md`:

```md
---
layout: post
title: "Your title"
description: "One sentence for the homepage and search results."
date: 2026-07-30
category: technical
---

Write the post in Markdown.
```

Use `category: personal` for personal writing.

## Link to an article published elsewhere

Create the same kind of file, but use the external layout and add the original URL:

```md
---
layout: external
title: "Your title"
description: "One sentence about the article."
date: 2026-07-30
category: technical
external_url: "https://example.com/your-article"
external_source: "Publication name"
---
```

The homepage will link directly to the original article. Posts are ordered by date automatically.

## Preview locally

```sh
bundle install
bundle exec jekyll serve
```
