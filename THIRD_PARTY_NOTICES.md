# Third-party notices

## Human IPA recordings

The isolated phoneme audio files in `assets/audio/human/` are derived from the public IPA Chart recordings:

- Source: <https://www.ipachart.com/>
- Reference and individual licences: <https://commons.wikimedia.org/wiki/General_phonetics>
- Contributors include Peter Isotalo, Denelson83, UCLA Phonetics Lab Archive 2003, Halibutt, Pmx and Octane.
- Licence: free and/or copyleft Wikimedia Commons recording; individual source URL and licence note are recorded in `audio-sources.json`.

The eight diphthongs and `/tr dr ts dz/` are local composites made only from the human recordings above. No text-to-speech or AI-generated voice is used.

## Kingsoft Iciba audio

Example word audio is requested at runtime from Kingsoft Iciba:

- Service: <https://www.iciba.com/>
- Purpose: British and American example-word pronunciation
- Failure behavior: no AI/TTS fallback; the interface asks the user to retry

## Articulation diagrams

All SVG diagrams in `assets/diagrams/` are original diagrams created for this project from general articulatory-phonetics reference material.
