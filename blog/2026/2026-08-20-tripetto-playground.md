---
layout: blog
title: "Tripetto Playground: A Form Takes a Bow"
category: Playground
---

# Tripetto Playground: A Form Takes a Bow

*Playground · Retired from the homepage on August 20, 2026*

Back in November 2021, I added a [Tripetto](https://tripetto.com/) contact form to the homepage. Tripetto gave my static site an embeddable form: the Classic runner displayed it, while Tripetto Services supplied the form definition and handled submissions. A little contact form without a home-grown backend.

I removed it from the homepage on August 20, 2026. That July, [Tripetto had announced](https://tripetto.com/blog/phasing-out-free-studio-accounts/) it was phasing out free Studio accounts, citing the cost of running the service and abuse prevention. According to the announcement, active forms on free accounts that were not upgraded would stop working on November 1, 2026.

The old form no longer works; instead of a conversation, it now has this to say:

> ## 👋 Hi there!
> Nothing to talk about. The conversation is closed 🤐

Still want to get in touch? Find me on [LinkedIn](https://www.linkedin.com/in/raruto).

For the nostalgic, here is the original HTML:

```html
<div id="tripetto" style="min-height: 322px;"></div>
<script src="https://unpkg.com/tripetto-runner-foundation"></script>
<script src="https://unpkg.com/tripetto-runner-classic"></script>
<script src="https://unpkg.com/tripetto-services"></script>
<script>
var tripetto = TripettoServices.init({ token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiS1JWUytRZmhQUnJxSkJ0eWZTZU82UldNTkhCOEx1NVRVYTVTQWplZno5MD0iLCJkZWZpbml0aW9uIjoibVRqVjJtckQ0ZWJCbWR5NWlNUnptVGJZZTRaVXlQQzJpSVZLWDZiTGlSOD0iLCJ0eXBlIjoiY29sbGVjdCJ9.33H9DigsyOEJpOrDa6OcEscng3fPiMKnohXGAvVoF1c" });

TripettoClassic.run({
    element: document.getElementById("tripetto"),
    definition: tripetto.definition,
    styles: tripetto.styles,
    l10n: tripetto.l10n,
    locale: tripetto.locale,
    translations: tripetto.translations,
    attachments: tripetto.attachments,
    onSubmit: tripetto.onSubmit
});
</script>
```