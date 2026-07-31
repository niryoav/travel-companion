import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import {
  parseRestaurantMenuManifest,
  RESTAURANT_ORDER,
  loadRestaurantMenuManifest,
} from './restaurantMenus'

const manifestPath =
  'public/documents/restaurant-menus/manifest.json'

describe('restaurant menu manifest', () => {
  it('derives the approved restaurant order and available menu types from the manifest', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const groups = parseRestaurantMenuManifest(manifest)

    expect(groups.map(({ restaurant }) => restaurant)).toEqual(
      RESTAURANT_ORDER,
    )
    expect(
      groups.find(({ restaurant }) => restaurant === 'Aquamar Kitchen')
        ?.menus.map(({ menuType }) => menuType),
    ).toEqual(['Breakfast', 'Lunch'])
    expect(
      groups.find(({ restaurant }) => restaurant === 'Red Ginger')
        ?.menus.map(({ menuType }) => menuType),
    ).toEqual(['Dinner'])
  })

  it('maps every manifest entry to an existing public PDF path', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      menus: { file: string }[]
    }

    for (const { file } of manifest.menus) {
      expect(
        existsSync(`public/documents/restaurant-menus/${file}`),
        file,
      ).toBe(true)
    }
  })

  it('skips one unsafe PDF entry without hiding valid menus', () => {
    const groups = parseRestaurantMenuManifest({
      menus: [
        {
          restaurant: 'Jacques',
          menuType: 'Dinner',
          file: 'Jacques/Dinner.pdf',
        },
        {
          restaurant: 'Jacques',
          menuType: 'Lunch',
          file: '../missing.pdf',
        },
      ],
    })

    expect(groups).toEqual([
      {
        restaurant: 'Jacques',
        menus: [
          {
            restaurant: 'Jacques',
            menuType: 'Dinner',
            href: '/documents/restaurant-menus/Jacques/Dinner.pdf',
          },
        ],
      },
    ])
  })

  it('rejects a failed manifest request', async () => {
    const fetchRequest = vi.fn(async () => new Response(null, {
      status: 503,
    }))

    await expect(loadRestaurantMenuManifest(fetchRequest)).rejects.toThrow(
      'Restaurant menu manifest returned 503',
    )
  })
})
