---
layout: blog
title: "Translations and Windows Paths in CpMultiplane"
category: Contributions
activity:
  source: GitHub
  entries:
    -
      date: "2020-11-27T16:03:45Z"
      type: pull request
      url: "https://github.com/raffaelj/CpMultiplane-i18n/pull/1"
    -
      date: "2020-11-29T14:38:13Z"
      type: pull request
      url: "https://github.com/raffaelj/cpmp-lib-skeleton/pull/2"
    -
      date: "2020-12-01T00:35:18Z"
      type: pull request
      url: "https://github.com/raffaelj/CpMultiplane/pull/30"
---

# Translations and Windows Paths in CpMultiplane

*Contributions: 2020-12*

Looking back to late 2020, I was exploring [CpMultiplane](https://github.com/raffaelj/CpMultiplane), a PHP frontend for Cockpit CMS. One contribution was an [Italian translation](https://github.com/raffaelj/CpMultiplane-i18n/pull/1), merged in November.

The next contributions had a distinctly Windows flavour. In the related library skeleton, I replaced a `cp` command in a Composer script with PHP's `copy()` in a [cross-platform pull request](https://github.com/raffaelj/cpmp-lib-skeleton/pull/2). Then I investigated a [path expansion problem](https://github.com/raffaelj/CpMultiplane/pull/30) when loading translations on Windows. Both changes were merged.
