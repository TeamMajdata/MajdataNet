`MajRadarBG.png` is copied unchanged from TeamMajdata/MajdataPlay,
`Assets/Sprites/Ribbon/MajRadarBG.png` at commit
`dc19722d602f099131d93b37091624ad30150ad1`.

The axis fill/outline colors in `src/utils/radar.ts` come from that revision's
`Assets/Scenes/List.unity`. Polygon orientation and the 0.5-second transition
follow `MajRadar.shader` and `MajRadarDisplayer.cs`.

The web UI places 100 at the reference hexagon's vertices. Scores from 100 to
200 extend linearly beyond it; 200–250 share the same maximum drawing radius.
Numeric labels and dominant-axis colors still use the original scores. Labels
sit on the enlarged reference hexagon's vertices, and accessible values use an
ARIA label without a hover tooltip.

Source: https://github.com/TeamMajdata/MajdataPlay/tree/dc19722d602f099131d93b37091624ad30150ad1
