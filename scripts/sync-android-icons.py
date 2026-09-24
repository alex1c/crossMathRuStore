"""Refresh local android/ mipmap launcher icons from Expo icon assets.

android/ is gitignored; this keeps the existing native tree in sync for device QA
without a full prebuild. Source of truth remains assets/icon_gpt.png + assets/images/.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'
IMAGES = ROOT / 'assets' / 'images'

# Adaptive / legacy density sizes used by Expo Android icon generation.
LEGACY = {
	'mipmap-mdpi': 48,
	'mipmap-hdpi': 72,
	'mipmap-xhdpi': 96,
	'mipmap-xxhdpi': 144,
	'mipmap-xxxhdpi': 192,
}
ADAPTIVE = {
	'mipmap-mdpi': 108,
	'mipmap-hdpi': 162,
	'mipmap-xhdpi': 216,
	'mipmap-xxhdpi': 324,
	'mipmap-xxxhdpi': 432,
}


def save_webp(img: Image.Image, path: Path) -> None:
	path.parent.mkdir(parents=True, exist_ok=True)
	img.save(path, 'WEBP', quality=90, method=6)
	print('wrote', path.relative_to(ROOT), img.size)


def main() -> None:
	if not RES.is_dir():
		print('android res missing — skip (run after prebuild)')
		return

	icon = Image.open(IMAGES / 'icon.png').convert('RGBA')
	foreground = Image.open(IMAGES / 'android-icon-foreground.png').convert('RGBA')
	background = Image.open(IMAGES / 'android-icon-background.png').convert('RGBA')
	monochrome = Image.open(IMAGES / 'android-icon-monochrome.png').convert('RGBA')

	for folder, size in LEGACY.items():
		resized = icon.resize((size, size), Image.Resampling.LANCZOS)
		save_webp(resized, RES / folder / 'ic_launcher.webp')
		save_webp(resized, RES / folder / 'ic_launcher_round.webp')

	for folder, size in ADAPTIVE.items():
		save_webp(
			foreground.resize((size, size), Image.Resampling.LANCZOS),
			RES / folder / 'ic_launcher_foreground.webp',
		)
		save_webp(
			background.resize((size, size), Image.Resampling.LANCZOS),
			RES / folder / 'ic_launcher_background.webp',
		)
		save_webp(
			monochrome.resize((size, size), Image.Resampling.LANCZOS),
			RES / folder / 'ic_launcher_monochrome.webp',
		)

	print('DONE')


if __name__ == '__main__':
	main()
