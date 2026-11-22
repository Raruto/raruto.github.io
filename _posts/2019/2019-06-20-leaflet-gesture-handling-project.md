---
layout: blog
title: "Let the Page Scroll, Not Just the Map"
category: Projects
activity: {"source":"GitHub","entries":[{"date":"2019-06-20T20:33:24Z","type":"repository created","url":"https://github.com/Raruto/leaflet-gesture-handling"}]}
---

# Let the Page Scroll, Not Just the Map

*Projects: 2019-06*

Scrolling a page shouldn't have to mean accidentally zooming its map. My [leaflet-gesture-handling](https://github.com/Raruto/leaflet-gesture-handling) repository, created in June, adjusts Leaflet's scroll and touch interactions to help the two coexist.

It was initially based on [Elmarquis's Leaflet.GestureHandling](https://github.com/elmarquis/Leaflet.GestureHandling). The [demo](https://raruto.github.io/leaflet-gesture-handling/examples/leaflet-gesture-handling.html) shows the prompt for using a modifier key to zoom the map.

The distinction is especially noticeable when the map sits in the middle of a longer page: ordinary scrolling can keep moving the page, while an intentional gesture works with the map.

![A map prompting the user to use Ctrl and scroll]({{ '/img/leaflet-gesture-handling.png' | relative_url }})

*The gesture-handling prompt.*
