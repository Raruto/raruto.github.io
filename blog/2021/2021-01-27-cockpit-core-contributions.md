---
layout: blog
title: "Inside Cockpit: Routes, Forms, and Tests"
category: Contributions
activity: {"source":"GitHub","entries":[{"date":"2021-01-20T22:22:21Z","type":"pull request","url":"https://github.com/agentejo/cockpit/pull/1395"},{"date":"2021-01-22T18:13:27Z","type":"pull request","url":"https://github.com/agentejo/cockpit/pull/1399"},{"date":"2021-01-25T11:34:22Z","type":"pull request","url":"https://github.com/agentejo/cockpit/pull/1406"},{"date":"2021-01-27T16:47:25Z","type":"pull request","url":"https://github.com/agentejo/cockpit/pull/1411"}]}
---

# Inside Cockpit: Routes, Forms, and Tests

*Contributions: 2021-01*

Looking back to January 2021, my work with [Cockpit CMS](https://github.com/agentejo/cockpit) went beyond the add-ons I later published on Packagist. I proposed a [routing script](https://github.com/agentejo/cockpit/pull/1395) for PHP's built-in server after encountering a 404 on the install route.

Forms were another recurring theme. I suggested [reorganizing submission logic](https://github.com/agentejo/cockpit/pull/1399) to make it more extensible, and [moving the empty-data check](https://github.com/agentejo/cockpit/pull/1411) so the submission hook could also handle a form containing only uploaded files. I also proposed a [small PHPUnit starting point](https://github.com/agentejo/cockpit/pull/1406) for the forms module.

These were pull requests, not merged changes. They provide a look at the questions behind my [Extended Forms add-on]({{ '/blog/2021-01-29-cockpit-forms-packages.html' | relative_url }}) from the same month.
