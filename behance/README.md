# Qevora — Behance portfolio kit

A dedicated portfolio case study for the existing Qevora AI SaaS UI project. The original dashboard and its build configuration are unchanged.

## Open the case study

From the repository root:

```bash
python3 tools/preview.py 8080
```

Open `/behance/` on the preview server. You can also open `behance/index.html` directly in a browser. The presentation uses one HTML file with inline CSS and JavaScript, local screenshots and local Inter fonts; it does not fetch external libraries. Keep `assets/` beside `index.html`. Links to the actual application expect this folder to remain inside the repository.

## Included files

- `index.html`: responsive case-study landing page; all narrative content, design details, credits, metadata and publishing guidance are in this file.
- `assets/`: actual screenshots of the repository's UI plus locally bundled Inter fonts and their license.
- `exports/behance-cover.jpg`: 808 × 632 cover artwork.
- `exports/01-…08-….jpg`: eight ordered case-study sections, each 1400 pixels wide.
- `exports/project-brief.txt`: copy-ready title, description, fields, tags and credits.
- `exports/qevora-behance-kit.zip`: cover, eight sections, brief and publishing instructions in one download.

## Behance પર upload કેવી રીતે કરવું

1. Behanceમાં login કરીને **Create a Project** પસંદ કરો.
2. Cover માટે `exports/behance-cover.jpg` પસંદ કરો અને crop તપાસો.
3. `exports/`માં રહેલી `01` થી `08` numbered JPG images ક્રમ પ્રમાણે upload કરો. Coverને ફરીથી bodyમાં upload કરવાની જરૂર નથી.
4. `project-brief.txt`માંથી title, description અને tags copy કરો. ઉપલબ્ધ creative fieldsમાંથી સંબંધિત fields પસંદ કરો.
5. Qevora Softwareને credit આપો અને repository/project link ઉમેરો.
6. Desktop/mobile preview, image ordering અને credits તપાસીને publish કરો.

**HTML Behance project તરીકે સીધી upload થતી નથી.** HTML આ showcaseની live preview અને source છે; Behance માટે તૈયાર કરેલા JPG sections વાપરો. Behanceના current editorમાં supported formats, size limits, cropping અને required fields ફરી તપાસો. Included dimensions are production recommendations, not a claim of current mandatory platform requirements.

## Sections / upload order

1. Cover story — identity, product thesis and dashboard preview.
2. Project overview — challenge, response, scope, authorship and kit counts.
3. Dashboard experience — dark-theme interface and hierarchy rationale.
4. Connected workflows — AI chat, content generation, analytics and Kanban.
5. Responsive design — real mobile captures at 390 CSS pixels.
6. Design system — Inter, actual product colors, spacing, radii and component library.
7. Delivery and scope — page inventory, technology stack, implementation considerations and limitations.
8. Closing and credits — project attribution and component/font credits.

## Interaction / accessibility

- Light/dark screenshot switcher with pressed states.
- Native image-preview dialog with Escape dismissal and focus restoration.
- Mobile menu with expanded state and close-on-navigation behavior.
- Copy project brief with a blocked-clipboard fallback message.
- Download links for the cover and complete publishing ZIP.
- Print / Save PDF action and print-specific layout.
- Skip link, semantic sections, image descriptions, visible keyboard focus and reduced-motion support.

This is not a claim of accessibility certification. The page was browser-tested at 375, 390, 768, 1024 and 1440 pixel widths for page overflow and image loading. Menu, theme switching and dialog behavior were also tested.

## Truthful project representation

All screenshots come from the actual template. Business metrics and AI outputs are demonstration data, not achieved outcomes. This is a static Bootstrap front-end kit, not a deployed SaaS backend. Production authentication, payment processing, data persistence and AI services need implementation. No user interviews, usability results, business impact, project duration or Figma workflow are invented.

Creative fields and tags are suggestions; use the options available in Behance at publication time. No Behance approval or reach is guaranteed. Use only tool credits that match your actual work.

## Updating the artwork

If the application changes, recapture the actual screens before publishing. The desktop source captures are 1440 × 1000; mobile captures use 390 × 844 CSS pixels at 2× pixel density. The dashboard section defaults to the dark screenshot, while its live switcher can show either theme.

To re-export section artwork from a browser, use a 1400-pixel viewport, fully load all images, and capture each section marked `data-export`. Hide the navigation and publishing utility panel for presentation exports (the HTML supports the `exporting` class on `<body>`). The cover is a separate compact composition. Rebuild the publishing ZIP after changing exports or text.

## Credits

- Design and front-end development: **Qevora Software**.
- Inter: **Rasmus Andersson**, SIL Open Font License; see `assets/fonts/LICENSE.txt`.
- Bootstrap / Bootstrap Icons: **Bootstrap team**.
- Chart.js: **Chart.js contributors**.
- Project source: https://github.com/qevorasoftware/qevora-ai-saas-ui

Existing project licensing continues to apply; see the root `LICENSE.txt`. This portfolio folder does not grant a different license for the underlying template.
