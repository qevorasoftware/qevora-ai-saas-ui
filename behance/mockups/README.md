# Qevora — individual device mockups

Four separate portfolio compositions using the actual Qevora interface screenshots. No AI-generated interface graphics or invented app text are used.

## Files

- `index.html`: editable mockup compositions plus a responsive download gallery. Open `/behance/mockups/` on the repository's preview server.
- `exports/01-desktop-dashboard.png`: warm ivory desktop-monitor mockup of the light dashboard.
- `exports/02-laptop-ai-workspace.png`: deep-green laptop mockup of the AI chat workspace.
- `exports/03-mobile-workflows.png`: mint mobile presentation with dashboard, AI chat and Kanban screens.
- `exports/04-light-dark-themes.png`: lavender floating-window presentation of the two dashboard themes.
- `exports/qevora-mockups.zip`: all four PNGs and these notes in one archive.

Every PNG is **2400 × 1800 pixels (4:3)**. Each artwork is separate, not a contact sheet or alternative version of the same image. Use them independently between case-study sections, or publish whichever compositions fit your project.

## Behance પર ઉપયોગ

1. `exports/qevora-mockups.zip` download કરીને extract કરો.
2. Behance project editorમાં જરૂરી PNG mockups upload કરો.
3. Desktop artworkને overview પછી, laptopને AI sectionમાં, mobileને responsive sectionમાં અને light/dark artworkને theme sectionમાં વાપરી શકો છો.
4. Cover crop અને mobile preview તપાસો. Exported 4:3 artwork is not a claim of Behance's current cover specification; adapt the editor crop as needed.

## Editing and re-exporting

All presentation typography, backgrounds, shadows and fictional device frames are authored in the inline CSS of `index.html`. Screenshots are referenced from `../assets/`. Keep this collection inside the existing Behance folder.

The four compositions use a **1600 × 1200 CSS pixel** design canvas, scaled down only for the responsive gallery. Each is marked `data-export`.

To re-export using a browser automation tool:

1. Serve the repository root and open `/behance/mockups/`.
2. Set the viewport to 1600 × 1200 and device pixel ratio to 1.5.
3. Add the `exporting` class to `<body>` to remove gallery chrome and disable preview scaling.
4. Wait for local fonts and all images to finish decoding.
5. Capture each `[data-export]` element as its own PNG, using the attribute value as its filename.
6. Rebuild the ZIP after modifying the images.

No build step is needed to view the HTML collection or use the exported PNGs. Mockup-gallery layout and image loading were checked at 375, 390, 768 and 1440 pixel widths.

## Credits and scope

- Interface design, front-end development and mockup presentation: Qevora Software.
- Inter font: Rasmus Andersson; see `../assets/fonts/LICENSE.txt`.
- Underlying UI uses Bootstrap, Bootstrap Icons and Chart.js; see the full case study for credits.
- Original screenshot assets are unchanged. Presentation uses scaling, framing, placement and cropping.
- Device shells are generic illustrative CSS frames, not photography or representations of a specific hardware brand.
- Business figures and AI responses are demonstration content, not real business outcomes.
- Root project licensing remains applicable. No new license for the template is granted by these exports.
