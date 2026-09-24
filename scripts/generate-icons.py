"""Generate CrossMath icon derivatives from assets/icon_gpt.png without modifying the master."""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / 'assets' / 'icon_gpt.png'
IMAGES = ROOT / 'assets' / 'images'
ARTIFACTS = ROOT / 'release-artifacts'
ARTIFACTS.mkdir(parents=True, exist_ok=True)

# Sampled from the master blue field (not rounded white corners).
BG = (0x00, 0x97, 0xFE, 255)


def resize_square(img: Image.Image, size: int) -> Image.Image:
	"""Resize a square source; never stretch non-uniformly."""
	return img.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
	master = Image.open(MASTER).convert('RGBA')
	if master.size[0] != master.size[1]:
		raise SystemExit(f'master must be square, got {master.size}')
	print('master', master.size)

	# Launcher / Expo icon (full composition, no crop).
	icon_1024 = resize_square(master, 1024)
	icon_1024.convert('RGB').save(IMAGES / 'icon.png', 'PNG', optimize=True)
	print('icon.png', icon_1024.size)

	# RuStore listing artifact — exactly 512x512.
	icon_512 = resize_square(master, 512)
	icon_512.convert('RGB').save(ARTIFACTS / 'icon-512.png', 'PNG', optimize=True)
	print('icon-512.png', icon_512.size)
	assert icon_512.size == (512, 512)

	# Adaptive background — solid compatible blue.
	bg = Image.new('RGBA', (1024, 1024), BG)
	bg.save(IMAGES / 'android-icon-background.png', 'PNG', optimize=True)

	# Adaptive foreground — pad into Android safe zone (~66% of canvas).
	# Important tiles / pencil / glow stay inside common launcher masks.
	safe_scale = 0.66
	fg_size = int(1024 * safe_scale)
	fg_content = resize_square(master, fg_size)
	offset = ((1024 - fg_size) // 2, (1024 - fg_size) // 2)
	# Opaque padded composition so Expo mipmap generation stays stable.
	pad_base = Image.new('RGBA', (1024, 1024), BG)
	pad_base.paste(fg_content, offset, fg_content)
	pad_base.save(IMAGES / 'android-icon-foreground.png', 'PNG', optimize=True)
	print('android-icon-foreground.png', pad_base.size, 'content_scale', safe_scale)

	# Monochrome: bright silhouette suitable for themed icons (also safe-zone padded).
	gray = ImageOps.autocontrast(ImageOps.grayscale(master))
	mono_scaled = gray.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
	mono = Image.new('L', (1024, 1024), 0)
	mono.paste(mono_scaled, offset)
	mono_rgba = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
	pixels = mono_rgba.load()
	src = mono.load()
	for y in range(1024):
		for x in range(1024):
			value = src[x, y]
			if value > 40:
				pixels[x, y] = (255, 255, 255, min(255, int(value * 1.1)))
	mono_rgba.save(IMAGES / 'android-icon-monochrome.png', 'PNG', optimize=True)
	print('android-icon-monochrome.png', mono_rgba.size)

	favicon = resize_square(master, 48)
	favicon.convert('RGB').save(IMAGES / 'favicon.png', 'PNG', optimize=True)
	print('favicon.png', favicon.size)

	for rel in (
		'assets/images/icon.png',
		'assets/images/android-icon-foreground.png',
		'assets/images/android-icon-background.png',
		'assets/images/android-icon-monochrome.png',
		'assets/images/favicon.png',
		'release-artifacts/icon-512.png',
	):
		path = ROOT / rel
		image = Image.open(path)
		print(f'OK {rel}: {image.size} {image.mode}')
		image.close()

	print('DONE')


if __name__ == '__main__':
	main()
