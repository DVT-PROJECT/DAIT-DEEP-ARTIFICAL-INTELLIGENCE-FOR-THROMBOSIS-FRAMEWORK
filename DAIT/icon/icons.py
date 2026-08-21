from PIL import Image

img = Image.open("favicon.png")

# convert to proper Windows icon
img.save("favicon.ico", format="ICO", sizes=[(256, 256)])