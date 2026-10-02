---
name: better-ui
description: Polishes and improves the UI in your project. Covers concentric border radius, optical alignment, surface depth, contextual icons, hit areas and more.
---

# UI Polish & Craft (better-ui)

Polish comes from a pile of small details that compound. This skill is the reference for which are worth having and what values they take.

When reviewing, slow the interface down. What feels off at 10% speed is what is subtly wrong at full speed.

Keep the project's component library, tokens and density, and match its motion language except where a rule below prescribes an exact interaction.

Every duration, curve, scale and blur below is a specific value, not a range to approximate. `cubic-bezier(0.2, 0, 0, 1)` is not `cubic-bezier(0.4, 0, 0.2, 1)`, and `0.96` is not `0.95`. Use what is written.

## Concentric Border Radius
$$\text{Outer Radius} = \text{Inner Radius} + \text{Padding}$$
Mismatched radii on nested elements is the most common thing that makes an interface feel off. Always ensure nested elements follow this formula.

## Optical over Geometric Alignment
When geometric centering looks off, align optically. Buttons with icons, play triangles and asymmetric icons all need a manual optical nudge.

## Tactile Scale on Press
A `scale(0.96)` on click/active gives a button tactile feedback. Always `0.96`; anything below `0.95` feels exaggerated.

## Transition Only What Changes
Always name the exact properties: `transition-property: transform, opacity, background-color`. Never use `transition: all`.

## Match Icon Stroke to Text Weight
An icon next to text carries the text's optical weight:
- `1.5px` stroke beside regular (400) text
- `2.0px` stroke beside semibold / bold (600+) text

## Touch Targets
All clickable elements, buttons, and inputs must be at least 44×44px on mobile and touch devices.

## Aspect Ratio Placeholders
Always set `aspect-ratio` on image containers so surrounding content does not jump when the image finishes loading.
