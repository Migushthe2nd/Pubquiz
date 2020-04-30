for /l %%x in (1, 1, 99) do (
    magick convert -size 200x200 xc:white -transparent white %%x.png
    magick convert %%x.png -font Berlin-Sans-FB -weight 700 -pointsize 180 -draw "gravity north fill white text 0,-10 '%%x' " %%x.png
)