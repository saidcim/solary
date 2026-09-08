# Solary: A space-themed New Tab page styled like a terminal.

It features a standard terminal interface on the left, while the right side displays
ASCII art and an animated rotating planet. There are eight distinct themes—one for
each of the eight planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. Here is the [page](https://saidcim.github.io/solary/).
<img width="1280" height="640" alt="image" src="https://github.com/user-attachments/assets/be23fcfe-a022-4896-b599-e8577b1e3608" />

## Commands

| Command | What it does |
| --- | --- |
| `mercury` … `neptune` | Travel to a body |
| `ls` | List every body with its distance |
| `info [body]` | Full telemetry for one body |
| `next` / `prev` | Step one orbit out or in (not listed in `help`) |
| `spin <0.25–4>` / `spin stop` | Set rotation speed (not listed in `help`) |
| `size` | Compare diameters as a bar chart |
| `s <query>` | Search the web with the current engine |
| `g` / `yt` / `gh` | Open Google, YouTube or GitHub — add a query to search that site |
| `engine google\|duckduckgo\|yahoo` | Set the search engine, remembered between sessions |
| `clear` | Wipe the log |
| `about` | What this screen is (not listed in `help`) |

The chosen search engine is stored in localStorage so it survives a reload.

`Tab` completes commands and planet names. `↑` `↓` walk the command history.
`Ctrl+L` clears. Typing anywhere on the page focuses the prompt.

## ASCII Planets
Each frame walks a character grid, and combines three terms into one brightness value:

1. **lighting** — dot product against a fixed light direction, with ambient floor
2. **texture** — a per-planet procedural function (banding for the gas giants, a Great
  Red Spot for Jupiter, ice caps for Earth and Mars, cloud swirl for Venus)
3. **limb** — a falloff toward the edge of the disc so the sphere reads as round

That value indexes a per-planet character ramp, which is part of each body's
identity: Venus uses block shading, Jupiter uses `≡` for its bands, Mercury uses a
pitted `.·:-=+o0#@`. Saturn's rings are a separate pass — the ring plane is tilted,
sampled in polar coordinates, and split into a back half drawn before the sphere
and a front half drawn over it.

## Stack
- `index.html` — structure
- `styles.css` — layout, type, per-body theming through CSS custom properties
- `app.js` — body data, ASCII renderer, command shell

## Runing it
Open `index.html`, or serve the folder:

```
python3 -m http.server 8000
```
- if you want to use it as your New Tab page you have to install a custom new tab extension and point it at the deployed
[URL](https://saidcim.github.io/solary/).
