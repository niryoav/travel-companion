# Design language

Travel Companion should feel premium, calm, personal, and grounded in the
experience of travel. The visual language uses open skies, ocean light, generous
space, and restrained detail rather than a dark-green brand treatment.

## Visual personality

- Quiet confidence rather than luxury ornament.
- Personal and warm rather than corporate.
- Photographic travel atmosphere supported by simple, readable interfaces.
- Clear hierarchy, rounded forms, and soft elevation.

## Ocean-blue palette

Ocean blue is the primary visual direction. Use shared tokens rather than
page-specific color values:

- deep ocean blue for strong contrast and focus;
- clear mid-ocean blue for accents and interactive states;
- pale sky blue for quiet surfaces;
- white for primary cover text;
- champagne gold for small highlights.

The established neutral application surfaces remain available. Deep ocean green
is not the primary brand color.

## Typography

- Prefer the existing humanist system font stack for dependable rendering.
- Use confident display sizing with compact line height for trip names.
- Keep the trip title dominant and the countdown as the second-strongest element.
- Keep ship and date text comfortably readable without reading glasses; small
  labels should remain at least 0.8rem on the cover.
- Use weight, size, and spacing before introducing extra color or decoration.

## Welcome cover

The welcome cover fills the viewport with a photographic Oceania Marina image.
A compact information card sits near the bottom, above the iPhone safe area. It
contains, in order:

1. Travel Companion
2. Fam. Nir-Buysse
3. Iceland & British Isles
4. Oceania Marina
5. 22 August – 4 September 2026
6. Dynamic days-to-go text
7. Enter trip

The bottom navigation and regular app header do not appear on the cover.

## Frosted glass

The cover card uses a translucent dark-ocean surface, restrained blur, a fine
light border, rounded corners, and a soft shadow. A dark image overlay protects
text contrast independently of the photograph. The effect must remain readable
when backdrop blur is unavailable.

## Image usage

Use local, optimized assets only; production code must not depend on remote image
URLs. The approved Sprint 2.5 welcome asset is:

```text
public/images/oceania-marina-welcome-hero.webp
```

The image is decorative because all relevant trip information is present as
text. Any future replacement must remain properly licensed and optimized, and
should keep the same path or update the single cover-image reference.

## Safe areas and responsiveness

- Cover the full dynamic viewport using `100dvh` with a `100vh` fallback.
- Apply top, side, and bottom safe-area insets.
- Keep the card compact and bottom-anchored at mobile sizes.
- Constrain card width on tablets and larger screens without moving it away from
  the lower visual anchor.
- Keep the primary action at least 44 CSS pixels high.

## Accessibility

- Maintain strong text contrast over every part of the image.
- Treat the full-screen background as decorative.
- Use a descriptive `Enter trip` button label and visible keyboard focus.
- Do not communicate required information through color alone.
- Respect reduced-motion preferences; the optional cover entrance is a subtle
  fade only.
- Preserve semantic heading order and natural reading order.

## Future display behavior

The platform PWA splash remains brief and technical. The welcome cover is a
separate pre-trip experience. In a future sprint it should appear before the
trip, then stop appearing automatically once the trip is underway. During the
trip, launches should open directly to Home. Remembering dismissal or trip phase
is not part of Sprint 2.5.

## Phase-based Home

Home uses a dark ocean-blue briefing surface with high-contrast white text and
soft blue-grey supporting copy. Dark-blue cards form a clear hierarchy:

1. current trip context and personal greeting;
2. one dominant next milestone;
3. quick weather;
4. a contextual checklist of no more than five items;
5. no more than one actionable alert.

Champagne highlights countdowns, key times, next actions, and active navigation.
Green is reserved for confirmed or completed states; warning colors appear only
when the traveler needs to act. Timeline cues should be restrained and reinforce
sequence without turning Home into a full itinerary.

Home answers “What matters most right now?” and stays distinct from Today, which
is the detailed chronological view. Home must not repeat the complete daily
itinerary or add a shortcut to a destination already present in primary
navigation.

Body copy and secondary labels remain comfortable for travelers aged 55 and 53:
avoid tiny labels, maintain generous line height, and preserve clear spacing and
touch targets at 320px width and above.
