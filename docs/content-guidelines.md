# Destination content guidelines

## Purpose

Destination content gives travelers concise, offline orientation without
competing with the operational itinerary. It should explain where they are
going, why it is interesting, what they may experience, and which stable local
context is useful before going ashore.

Home remains the concise briefing, Today remains the current-day operational
view, and Trip remains the complete chronological journey. Editorial content
belongs inside an expanded Trip day after verified operational information.

## Content boundary

Keep operational `TripData` and editorial content separate:

```text
TripData
  dates, times, events, transport, port calls, locations

TripContentBundle
  destination and confirmed-excursion background, sources, review dates
```

Destination guides relate to `Location` by stable `locationId`. Excursion guides
relate to a confirmed `EXCURSION` event by stable `eventId`. Do not add editorial
fields to `Location`, `TripDay`, `TripEvent`, `PortCall`, or `TripData`.

## Destination format

An initial destination guide contains:

- one original introduction of approximately 50–80 words;
- three to five concise, stable highlights;
- two to four practical facts;
- up to three good-to-know items;
- source references and a reviewed date;
- optionally, one approved destination image.

Keep the complete guide to approximately 100–160 words. Do not repeat arrival,
departure, all-aboard, excursion times, meeting points, or transport already
represented by operational data.

An excursion guide may be added only for a confirmed excursion event. It may
describe the public itinerary, operator, stable context, and likely highlights,
but must not include private confirmation details.

An excursion guide may contain a concise summary, three to five highlights,
optional look-out-for items, fun facts, preparation guidance, stable context,
and a clearly labelled seasonal note. Optional sections are omitted cleanly.
Wildlife, weather-dependent routes, and seasonal inclusions must never be
presented as guaranteed.

## Sources and writing

Use:

1. a confirmed user document;
2. the official excursion operator;
3. an official Oceania source;
4. a government, port authority, or official tourism authority.

Write concise original summaries. Do not copy substantial source text. Record:

- source name;
- source type;
- public URL when applicable;
- the date the source was reviewed;
- whether the guide was reviewed against a primary source or confirmed from a
  user document.

Source names and the guide review date appear compactly in the interface. Public
links may appear inside a small Sources disclosure, while all useful guide
content remains available without connectivity.

The production itinerary has twelve destination guides, one for each canonical
port location. They were reviewed against official tourism, local-government,
or other public primary sources on 27 July 2026. Dual-name destinations keep
the cruise port distinct from the wider regional city. Sea days, superseded
ports, and excursion-only stops do not receive destination guides.

The initial excursion inventory contains eleven reviewed guides: eight based on
official Oceania shore excursion material and three for independent bookings.
Two independent guides use official operator sources; the Isle of Lewis guide
uses the user-supplied Hebridean Isle Tours booking confirmation while revised
written timing remains pending. A source without an approved stable public URL
keeps its source name and review date but does not expose a private local
document path.

## Stable and changing information

Suitable bundled content includes geography, established history, cultural
context, major landmarks, language, currency, and stable landscape context.

Do not bundle changing opening hours, prices, closures, availability, weather,
transport disruptions, excursion changes, gangway information, or unverified
all-aboard values as editorial facts. These require a future freshness and
update workflow. The twelve production destination guides contain no live or
rapidly changing destination data.

## Images

A destination guide may contain one optional local image. For production
images:

- use WebP;
- target 1200 × 675 pixels;
- target approximately 150–300 KB;
- include no embedded text;
- provide descriptive alternative text;
- record credit, public source URL, license, and license URL when required;
- confirm that offline redistribution is permitted.

Place the image inside the closed-by-default destination disclosure, below all
operational content. Reserve its 16:9 space with intrinsic dimensions or CSS,
use `loading="lazy"`, and omit the entire image treatment when no approved asset
exists. Do not generate, download, or add an unlicensed image.

All twelve production destination guides now use locally bundled 1200 × 675
WebP images. Credits, Commons source pages, and verified Creative Commons
licenses are retained in the editorial metadata. Three pragmatic fallbacks
avoid misleading or weak approved candidates:

- Holyhead uses Oliver Mills’s Holyhead Harbour view instead of the
  railway-dominant station image;
- Ringaskiddy uses Andrew Wood’s Ringaskiddy Terminal view instead of a Cobh
  image that could imply the wrong cruise port;
- Southampton uses Lewis Clarke’s cruise-liner-terminal view instead of the
  lower-resolution Ocean Terminal candidate.

The source audit also corrected the Húsavík credit to Chensiyuan and the
Stornoway license to CC BY 2.5. External ticket and document assets remain
pending. Bilingual interface and editorial content remain a later, separate
step.

## Privacy

Never include:

- full booking references;
- cabin or identity details;
- private phone numbers;
- payment or medical information;
- tickets, QR codes, or barcodes;
- private documents or screenshots;
- traveler-specific private arrangements.

Confirmed excursion content may include its public title, operator, general
route, highlights, and a public meeting context when operationally required.
Review private material locally and source-control only approved non-sensitive
facts.

## Presentation

Inside an expanded Trip day, preserve this order:

1. operational day information;
2. port and critical information;
3. events and transport;
4. source-reviewed experience background directly under its matching event;
5. one nested `About [destination]` disclosure for the day;
6. concrete document references.

The destination disclosure remains closed by default, including when the outer
Today card is open. Experience disclosures are also closed by default. Missing
content produces no empty guide block.

## Review checklist

- [ ] Text is concise, original, stable, and useful offline.
- [ ] Every guide references a known location or confirmed excursion event.
- [ ] Sources, verification, and review dates are recorded.
- [ ] Operational facts are not duplicated or inferred.
- [ ] Changing information is omitted.
- [ ] Private confirmation details are excluded.
- [ ] Optional image rights, credit, metadata, optimization, and alt text are
      verified.
- [ ] Production content and fictional review fixtures remain separate.
