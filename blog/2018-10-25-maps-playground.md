---
layout: blog
title: "Maps Playground: Click, Drag, Repeat"
---

# Maps Playground: Click, Drag, Repeat

*Playground · First committed on October 25, 2018*

Sometimes a map just needs a place to play. This little [Leaflet](https://leafletjs.com/) experiment starts with [OpenTopoMap](https://opentopomap.org/) tiles: click anywhere to drop a marker, then drag it around to see its coordinates change.

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.3.1/dist/leaflet.css" crossorigin="">
<script src="https://unpkg.com/leaflet@1.3.1/dist/leaflet.js" crossorigin=""></script>
<style>
  #map img { margin: 0; padding: 0; border: 0; box-shadow: none; max-width: none; }
</style>

<div id="map" aria-label="Interactive maps playground" style="width: 100%; height: 400px;"></div>
<script>
  const map = L.map('map').setView([42.24478, 11.18408], 5);
  L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  }).addTo(map);
  map.on('click', function (event) {
    const marker = L.marker(event.latlng, {
      draggable: true,
      title: 'Resource location',
      alt: 'Resource Location',
      riseOnHover: true
    }).addTo(map).bindPopup(event.latlng.toString()).openPopup();
    marker.on('dragend', function (event) {
      this.bindPopup(event.target.getLatLng().toString()).openPopup();
    });
  });
</script>

[First map implementation](https://github.com/Raruto/raruto.github.io/commit/431141e2255476267d5b215a90b4187183f52a6d)
