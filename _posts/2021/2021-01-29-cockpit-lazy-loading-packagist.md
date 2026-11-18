---
layout: blog
title: "Let the Browser Load Images Lazily"
category: Contributions
activity: {"source":"Packagist","entries":[{"date":"2021-01-29T10:52:00Z","type":"package publication","package":"raruto/cockpit-native-lazy-loading","url":"https://packagist.org/packages/raruto/cockpit-native-lazy-loading"}]}
---

# Let the Browser Load Images Lazily

*Contributions: 2021-01*

Looking back to January 29, 2021, I published [Native Lazy Loading](https://packagist.org/packages/raruto/cockpit-native-lazy-loading), a Cockpit CMS add-on that adds `loading="lazy"` to images in content from the TinyMCE and HTML editors.

The idea was to use the browser's native image-loading feature rather than require a separate JavaScript library. Browsers that don't support the attribute can simply ignore it. The package page lists compatibility with Cockpit 0.11.2, so it's worth checking the version before using this historical add-on today.
