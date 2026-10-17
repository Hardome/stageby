/// <reference types="node" />

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const publicDirectory = path.resolve('public');
const iconSchema = z.object({ src: z.string(), sizes: z.string(), type: z.string(), purpose: z.string() });
const manifestSchema = z.object({
  id: z.string(),
  start_url: z.string(),
  scope: z.string(),
  display: z.string(),
  lang: z.string(),
  icons: z.array(iconSchema),
});
const manifestText = readFileSync(path.resolve(publicDirectory, 'manifest.webmanifest'), 'utf8');
const manifest = manifestSchema.parse(JSON.parse(manifestText));
const html = readFileSync(path.resolve('index.html'), 'utf8');

describe('Ярлык приложения', () => {
  it('запускает общую главную без привязки к роли или этапу', () => {
    expect(manifest).toMatchObject({ id: '/', start_url: '/', scope: '/', display: 'standalone', lang: 'ru' });
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png"');
  });

  it.each([192, 512])('поставляет PNG %i px для обычного и маскируемого значка', (size) => {
    const icon = manifest.icons.find((entry) => entry.sizes === `${size}x${size}`);

    expect(icon).toMatchObject({ type: 'image/png', purpose: 'any maskable' });

    if (!icon) throw new Error(`Не найден значок ${size} px`);

    const png = readFileSync(path.resolve(publicDirectory, icon.src.slice(1)));

    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(size);
    expect(png.readUInt32BE(20)).toBe(size);
  });

  it('поставляет значок Apple размером 180 px', () => {
    const png = readFileSync(path.resolve(publicDirectory, 'icons/apple-touch-icon.png'));

    expect(png.readUInt32BE(16)).toBe(180);
    expect(png.readUInt32BE(20)).toBe(180);
  });
});
