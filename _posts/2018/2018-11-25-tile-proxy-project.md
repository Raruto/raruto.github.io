---
layout: blog
title: "A Cache Between the Map and the Tile Server"
category: Projects
activity:
  source: GitHub
  entries:
    -
      date: "2018-11-25T15:09:16Z"
      type: repository created
      url: "https://github.com/Raruto/tile-proxy-php"
---

# A Cache Between the Map and the Tile Server

*Projects: 2018-11*

Between a map and its tile servers, there's room for a cache. My [tile-proxy-php](https://github.com/Raruto/tile-proxy-php) repository, created in November, provides a PHP caching proxy for map tiles.

The README credits [Lizard's ProxySimplePHP](https://wiki.openstreetmap.org/wiki/ProxySimplePHP) as the starting point and describes an Apache/PHP setup. It's an old project: before deploying anything similar today, check your server configuration and the tile provider's current caching and usage policies.

![A map tile caching proxy diagram]({{ '/img/proxy-caching.jpg' | relative_url }})

*The project's caching illustration.*
