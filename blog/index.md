---
layout: blog
title: Blog
permalink: /blog/
---

# Blog

Notes from the workbench: devlogs, experiments, and the occasional playground.

{% assign entries = site.pages | where_exp: "page", "page.dir == '/blog/'" | where_exp: "page", "page.name != 'index.md'" | sort: "name" | reverse %}

<style>
  .blog-archive__years { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.5rem 0 2rem; }
  .blog-archive__years a { padding: .2rem .65rem; border: 1px solid #ccc; border-radius: 1rem; }
  .blog-archive__year { margin: 2rem 0; }
  .blog-archive__list { list-style: none; margin: 0; padding: 0; border-top: 1px solid #d5d5d5; }
  .blog-archive__list li { padding: .8rem 0; border-bottom: 1px solid #d5d5d5; }
  .blog-archive__list a { font-weight: bold; }
  .blog-archive__meta { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .2rem; color: #555; font-size: .85em; }
</style>

<div class="blog-archive">
  <nav class="blog-archive__years" aria-label="Browse by year">
    {% assign previous_year = '' %}
    {% for entry in entries %}
      {% assign year = entry.name | slice: 0, 4 %}
      {% if year != previous_year %}
        <a href="#year-{{ year }}">{{ year }}</a>
        {% assign previous_year = year %}
      {% endif %}
    {% endfor %}
  </nav>

  {% assign previous_year = '' %}
  {% for entry in entries %}
    {% assign year = entry.name | slice: 0, 4 %}
    {% if year != previous_year %}
      {% unless forloop.first %}</ul></section>{% endunless %}
      <section class="blog-archive__year" aria-labelledby="year-{{ year }}">
        <h2 id="year-{{ year }}">{{ year }}</h2>
        <ul class="blog-archive__list">
      {% assign previous_year = year %}
    {% endif %}
          <li>
            <a href="{{ entry.url | relative_url }}">{{ entry.title | escape }}</a>
            <div class="blog-archive__meta">
              {% assign entry_date = entry.name | slice: 0, 7 %}
              <span>{{ entry.category | default: 'Devlog' | escape }}: <time datetime="{{ entry_date }}">{{ entry_date }}</time></span>
            </div>
          </li>
    {% if forloop.last %}</ul></section>{% endif %}
  {% endfor %}
</div>
