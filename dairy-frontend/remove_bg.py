from PIL import Image

def remove_background(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    width, height = img.size

    # Create a mask for flood fill
    # 0 = unvisited, 1 = background, 2 = visited non-background
    visited = set()
    stack = []

    # Add all border pixels to stack
    for x in range(width):
        stack.append((x, 0))
        stack.append((x, height - 1))
    for y in range(height):
        stack.append((0, y))
        stack.append((width - 1, y))

    def is_background(r, g, b):
        # Checkerboard is gray/white, so R,G,B are almost equal and relatively bright
        diff = max(r,g,b) - min(r,g,b)
        return diff < 30 and r > 100

    bg_pixels = []

    while stack:
        x, y = stack.pop()
        if (x, y) in visited:
            continue
        
        visited.add((x, y))
        
        if x < 0 or x >= width or y < 0 or y >= height:
            continue

        r, g, b, a = pixels[x, y]
        
        if is_background(r, g, b):
            bg_pixels.append((x, y))
            # push neighbors
            stack.append((x+1, y))
            stack.append((x-1, y))
            stack.append((x, y+1))
            stack.append((x, y-1))
            
            # check diagonals to cross checkerboard corners easily
            stack.append((x+1, y+1))
            stack.append((x-1, y-1))
            stack.append((x+1, y-1))
            stack.append((x-1, y+1))

    # Make background transparent
    for x, y in bg_pixels:
        pixels[x, y] = (255, 255, 255, 0)

    # Edge smoothing (optional, but let's just save for now)
    img.save(output_path)

remove_background("public/logo.png", "public/logo.png")
print("Background removed successfully!")
