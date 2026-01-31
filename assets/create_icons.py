#!/usr/bin/env python3
"""
Create proper macOS and Windows icons with transparent background
"""
from PIL import Image
import os

def remove_white_background(input_path, output_path, threshold=240):
    """Remove white background and save as PNG with transparency"""
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # Change all white (also shades of whites) pixels to transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"✓ Created transparent PNG: {output_path}")
    return img

def create_icon_sizes(base_img, output_dir):
    """Create all required icon sizes for macOS and Windows"""
    # macOS icon sizes (.icns)
    mac_sizes = [16, 32, 64, 128, 256, 512, 1024]
    
    # Windows icon sizes (.ico)
    win_sizes = [16, 24, 32, 48, 64, 128, 256]
    
    all_sizes = sorted(set(mac_sizes + win_sizes))
    
    icons = []
    for size in all_sizes:
        resized = base_img.resize((size, size), Image.Resampling.LANCZOS)
        icon_path = os.path.join(output_dir, f"icon_{size}x{size}.png")
        resized.save(icon_path, "PNG")
        icons.append(resized)
        print(f"✓ Created {size}x{size} icon")
    
    return icons, all_sizes

def main():
    assets_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(assets_dir, "externai-logo.png")
    
    # Step 1: Remove white background
    print("\n🎨 Removing white background...")
    transparent_png = os.path.join(assets_dir, "icon-transparent.png")
    base_img = remove_white_background(input_file, transparent_png, threshold=240)
    
    # Step 2: Create various sizes
    print("\n📐 Creating icon sizes...")
    icons, sizes = create_icon_sizes(base_img, assets_dir)
    
    # Step 3: Create Windows .ico file
    print("\n🪟 Creating Windows .ico file...")
    ico_path = os.path.join(assets_dir, "icon.ico")
    win_icons = []
    win_sizes = [16, 24, 32, 48, 64, 128, 256]
    for size in win_sizes:
        resized = base_img.resize((size, size), Image.Resampling.LANCZOS)
        win_icons.append(resized)
    
    win_icons[0].save(ico_path, format='ICO', sizes=[(s, s) for s in win_sizes])
    print(f"✓ Created Windows icon: {ico_path}")
    
    # Step 4: For macOS .icns, we need to use iconutil (built into macOS)
    print("\n🍎 Creating macOS .icns file...")
    iconset_dir = os.path.join(assets_dir, "icon.iconset")
    os.makedirs(iconset_dir, exist_ok=True)
    
    # macOS requires specific naming convention
    mac_icon_mapping = {
        16: ["icon_16x16.png"],
        32: ["icon_16x16@2x.png", "icon_32x32.png"],
        64: ["icon_32x32@2x.png"],
        128: ["icon_128x128.png"],
        256: ["icon_128x128@2x.png", "icon_256x256.png"],
        512: ["icon_256x256@2x.png", "icon_512x512.png"],
        1024: ["icon_512x512@2x.png"]
    }
    
    for size, filenames in mac_icon_mapping.items():
        resized = base_img.resize((size, size), Image.Resampling.LANCZOS)
        for filename in filenames:
            iconset_path = os.path.join(iconset_dir, filename)
            resized.save(iconset_path, "PNG")
            print(f"  ✓ {filename}")
    
    print(f"\n✓ Created iconset directory: {iconset_dir}")
    print("  Run this command to generate .icns:")
    print(f"  iconutil -c icns {iconset_dir}")
    
    print("\n✅ Icon creation complete!")
    print(f"\nGenerated files:")
    print(f"  - {transparent_png} (transparent PNG)")
    print(f"  - {ico_path} (Windows)")
    print(f"  - {iconset_dir}/ (macOS iconset)")

if __name__ == "__main__":
    main()
