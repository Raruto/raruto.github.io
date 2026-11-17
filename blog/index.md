---
layout: blog
title: Blog
---

# Blog

{% assign entries = site.pages | where_exp: "page", "page.dir == '/blog/'" | sort: "name" | reverse %}
{% for entry in entries %}
{% if entry.name != 'index.md' %}
- [{{ entry.title | escape }}]({{ entry.url | relative_url }})
{% endif %}
{% endfor %}
