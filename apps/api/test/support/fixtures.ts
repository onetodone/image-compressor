import { readFileSync } from 'node:fs'

/** Reads an image from `test/fixtures`: `photo.jpg`, `graphic.png` or `corrupt.jpg`. */
export function fixture(name: 'photo.jpg' | 'graphic.png' | 'corrupt.jpg'): Buffer {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url))
}
