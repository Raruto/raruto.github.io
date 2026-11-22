---
layout: blog
title: "Making Git Updater a Little Easier to Debug"
category: Contributions
activity:
  source: GitHub
  entries:
    -
      date: "2018-03-30T23:33:18Z"
      type: issue
      url: "https://github.com/afragen/git-updater/issues/663"
    -
      date: "2018-04-06T21:49:39Z"
      type: pull request
      url: "https://github.com/afragen/git-updater/pull/666"
    -
      date: "2018-04-10T08:47:49Z"
      type: pull request
      url: "https://github.com/afragen/git-updater/pull/668"
    -
      date: "2018-05-12T21:54:59Z"
      type: pull request
      url: "https://github.com/afragen/git-updater/pull/680"
---

# Making Git Updater a Little Easier to Debug

*Contributions: 2018-05*

Looking back to spring 2018, I contributed to [Git Updater](https://github.com/afragen/git-updater), then known as GitHub Updater, which helps update WordPress plugins and themes hosted in Git repositories.

After reporting a [GitLab webhook timeout](https://github.com/afragen/git-updater/issues/663), I proposed [REST process logging](https://github.com/afragen/git-updater/pull/666) and a separate set of [hook logging and interface changes](https://github.com/afragen/git-updater/pull/668). The latter was merged in April; the discussion also weighed the convenience of local logs against the complexity of duplicating information available on the Git host.

In May, I followed up with a [fix for an installer error](https://github.com/afragen/git-updater/pull/680): calling the install method outside WP-CLI could reference a missing CLI installer class. That pull request was merged on May 13.
