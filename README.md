# American Rumble

A browser-first 2D fighting game that uses one codebase for:

- Desktop / PC browsers
- Mobile browsers
- Installable PWA
- Telegram Mini Apps
- Future Android wrapper / Google Play release

## Publish

Upload the **contents of this folder** to the root of a GitHub repository.

GitHub Pages:
1. Settings
2. Pages
3. Deploy from a branch
4. `main`
5. `/(root)`

Because the app is a PWA, it must be served over HTTPS for installation and service workers. GitHub Pages provides HTTPS.

## Telegram Mini App

After the site is live:

1. Create or use a Telegram bot in BotFather.
2. Configure a Mini App / menu button for the bot.
3. Set the Mini App URL to your live American Rumble HTTPS URL.
4. Open the bot and tap the game button.

`js/platform.js` automatically detects Telegram and calls the Telegram Web App bridge. Outside Telegram, the same game runs normally.

## PWA files

- `manifest.webmanifest`
- `sw.js`
- `assets/icons/icon-192.png`
- `assets/icons/icon-512.png`
- `js/platform.js`

The service worker caches the core game locally so the installed PWA can reopen even when the network is unavailable. Telegram-specific features still require Telegram/network access.

## Current game

The existing prototype includes 1v1 combat, Family/Adult modes, health, stamina, special meter, attacks, CPU opponent, touch/keyboard controls, dialogue, and Policy Clash.

The next major gameplay milestone should be Team / Tag Mode without replacing the current core engine.
