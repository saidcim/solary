# Solary
I made a new tab page that features a terminal-style look while also having
a space themed starry background and a planet that you can change

<img width="1280" height="640" alt="image" src="https://github.com/user-attachments/assets/be23fcfe-a022-4896-b599-e8577b1e3608" />

it has a ASCII art rotating planet. and you can also select which one you like.
there are color theme for each planet: Mercury, Venus, Earth, Mars, Jupiter, Saturn,
Uranus, and Neptune. Here is the [page](https://saidcim.github.io/solary/).

## Terminal Commands
- `<planet name>` changes the planet and color theme
- `ls` shows other planets and their distances.
- `s <query>` searches the web with the current engine
- `g` / `yt` / `gh` shortcut for Google, YouTube and Github
- `engine google\|duckduckgo\|yahoo` changes the default search engine in `s <query>`
- `info [body]` gives information about current planet
- `clear` clears the terminal history
- `about` info about the project
- `next` / `prev` navigating between planets
- `spin <0.25–4>` / `spin stop` managing the speed of the planet
- `size` compares the sizes of planets

- `Tab` key completes commands and theme names(planets) and `CTRL+L` clears the terminal history

## ASCII Planets

None of the planets have stored look. Every frame, each planet is drawn from scratch as a lit,
rotating ball, shaded with characters instead of pixels and coloured by what the surface
is made of. I got help from AI for this one

## Setup
Open `index.html`, or run this in the folder:
```
python3 -m http.server 8000
```
- if you want to use it as your New Tab page you have to install "custom new tab" extension and point it at the deployed [site](https://saidcim.github.io/solary/). 
