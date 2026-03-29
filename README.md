# KhahanA OS 1.0 - Deployment to GitHub Pages

## Quick Deploy (3 steps)

### Step 1: Copy files to your khahana.com repo

Copy the entire contents of this folder into a new `/os/` folder in your GitHub Pages repo:

```
your-repo/
├── index.html          (your main khahana.com site)
├── os/
│   ├── index.html      (KhahanA OS)
│   ├── manifest.json   (PWA manifest)
│   ├── icon-192.png    (app icon small)
│   ├── icon-512.png    (app icon large)
│   └── icon.svg        (vector icon)
```

### Step 2: Push to GitHub

```bash
cd your-repo
git add os/
git commit -m "Add KhahanA OS 1.0"
git push
```

### Step 3: Open on iPhone

1. Open Safari on your iPhone
2. Go to: **khahana.com/os/**
3. Tap the Share button (square with arrow)
4. Tap **"Add to Home Screen"**
5. Name it "KhahanA OS"
6. Tap Add

It will launch fullscreen with no browser UI. The black icon with the teal KhahanA OS logo will appear on your home screen.

## Notes

- The PWA manifest enables standalone mode (no browser chrome)
- The apple-touch-icon provides the home screen icon
- The viewport meta tag locks to portrait and prevents zooming
- Battery API works in Safari on iOS
- Setup runs every time (no persistence) as requested
