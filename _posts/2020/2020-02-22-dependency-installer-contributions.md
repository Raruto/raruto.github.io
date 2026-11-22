---
layout: blog
title: "Untangling WordPress Plugin Dependencies"
category: Contributions
activity:
  source: GitHub
  entries:
    -
      date: "2020-01-23T22:36:35Z"
      type: pull request
      url: "https://github.com/afragen/wp-dependency-installer/pull/35"
    -
      date: "2020-01-27T21:27:47Z"
      type: pull request
      url: "https://github.com/afragen/wp-dependency-installer/pull/37"
    -
      date: "2020-02-10T11:15:22Z"
      type: pull request
      url: "https://github.com/afragen/wp-dependency-installer/pull/44"
    -
      date: "2020-02-15T23:25:03Z"
      type: pull request
      url: "https://github.com/afragen/wp-dependency-installer/pull/48"
    -
      date: "2020-02-22T17:47:29Z"
      type: pull request
      url: "https://github.com/afragen/wp-dependency-installer/pull/59"
---

# Untangling WordPress Plugin Dependencies

*Contributions: 2020-02*

Looking back to early 2020, I contributed to [WP Dependency Installer](https://github.com/afragen/wp-dependency-installer), a PHP class for installing WordPress plugin dependencies.

Some proposals were about making dependencies easier to understand in the admin interface. I suggested a more visible [dependency label](https://github.com/afragen/wp-dependency-installer/pull/35) and a [notice for required plugins](https://github.com/afragen/wp-dependency-installer/pull/37) that would help explain which plugin needed them. These were proposals, rather than merged changes.

Other pull requests made it into the project: passing [configuration to `run()`](https://github.com/afragen/wp-dependency-installer/pull/44), making the [install and activation notice code clearer](https://github.com/afragen/wp-dependency-installer/pull/48), and adding a [chainable initialization API](https://github.com/afragen/wp-dependency-installer/pull/59). That last one came with a confession in the pull request: I'm a JavaScript guy.
