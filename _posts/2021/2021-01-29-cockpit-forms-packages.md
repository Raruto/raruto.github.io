---
layout: blog
title: "Forms, Files, and a Little Honeypot"
category: Contributions
activity: {"source":"Packagist","entries":[{"date":"2021-01-29T18:03:00Z","type":"package publication","package":"raruto/cockpit-honeypot","url":"https://packagist.org/packages/raruto/cockpit-honeypot"},{"date":"2021-01-29T18:08:00Z","type":"package publication","package":"raruto/cockpit-extended-forms","url":"https://packagist.org/packages/raruto/cockpit-extended-forms"}]}
---

# Forms, Files, and a Little Honeypot

*Contributions: 2021-01*

Looking back to January 29, 2021, I published two Cockpit CMS add-ons on Packagist. [Extended Forms](https://packagist.org/packages/raruto/cockpit-extended-forms) adds handling for uploaded files and changes to the forms opening, closing and submission APIs. That work sits alongside the Cockpit forms contributions in my [January devlog]({{ '/blog/2021-01.html' | relative_url }}).

[Honeypot](https://packagist.org/packages/raruto/cockpit-honeypot) adds a setting and a honeypot field to forms, validates the submitted field and excludes invalid submissions from saved entries. It's one technique for dealing with unwanted submissions, not a promise to catch every bot.

Both package pages describe Composer installation and list compatibility with Cockpit 0.11.2. These are historical add-ons, so check the project's version and requirements before trying them on a newer installation.
