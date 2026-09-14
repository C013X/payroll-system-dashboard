# Payroll System Dashboard - Installation & Usage Guide

## Quick Start - Web App (PWA)

### Online Access
1. Open your browser and navigate to: `https://yourdomain.com/payroll-system-dashboard/`
2. The app will automatically load and cache all necessary files
3. You can use it offline after the first load

### Install as App

**On Desktop (Chrome, Edge, Firefox):**
- Click the **"Install App"** button in the address bar
- Or press `Ctrl+Shift+M` (Windows/Linux) or `Cmd+Shift+M` (Mac)
- The app will launch in a standalone window like a native application

**On Mobile (iOS/Android):**

*Android (Chrome):*
1. Open the dashboard in Chrome
2. Tap the **Menu** (⋮) button
3. Select **"Install app"** or **"Add to Home Screen""
4. Confirm the installation
5. The app appears on your home screen as an icon

*iOS (Safari):*
1. Open the dashboard in Safari
2. Tap the **Share** button
3. Select **"Add to Home Screen""
4. Choose a name and confirm
5. The app appears on your home screen

### Offline Capability
- All data is stored locally using IndexedDB
- Works completely offline
- Changes sync automatically when you reconnect to the internet
- No internet required after initial load

---

## Local Installation (Self-Hosted)

### Requirements
- Node.js (v14+)
- npm or yarn
- Basic web server knowledge

### Step 1: Clone Repository
```bash
git clone https://github.com/C013X/payroll-system-dashboard.git
cd payroll-system-dashboard
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Local Server
```bash
npm start
```
The app will be available at: `http://localhost:3000`

### Step 4: Deploy to Production

**Option A: Deploy to GitHub Pages**
```bash
npm run build
npm run deploy
```

**Option B: Deploy to Heroku**
```bash
heroku create your-payroll-app
git push heroku main
```

**Option C: Deploy to Netlify**
```bash
npm run build
netlify deploy --prod --dir=public
```

---

## Desktop Application (Electron)

To run as a desktop application:

```bash
npm install --save-dev electron
npm run electron
```

**Build Installer:**
- Windows: `npm run build:windows`
- macOS: `npm run build:mac`
- Linux: `npm run build:linux`

Installers will be in the `dist/` folder.

---

## Docker Deployment

### Build Docker Image
```bash
docker build -t payroll-system .
docker run -p 3000:3000 payroll-system
```

Access at: `http://localhost:3000`

---

## Features

✅ **Employee Clock-In/Out** - Real-time time tracking with GPS location
✅ **Hours Tracking** - Detailed work hours reporting
✅ **Payroll Processing** - Automatic salary calculation with tax withholding
✅ **Reports & Analytics** - Generate payroll, tax, and hours reports
✅ **Compliance & Audit** - Tax compliance tracking and audit trails
✅ **Offline-First PWA** - Works without internet connection
✅ **Encryption** - AES-256 encryption for sensitive data
✅ **Security** - CSRF protection, XSS prevention, session management
✅ **Mobile Responsive** - Works on all devices

---

## Default Login

**Username:** admin@payroll.com
**Password:** Admin123!

*Note: Change credentials immediately in Settings after first login*

---

## Support & Documentation

- **Issues:** https://github.com/C013X/payroll-system-dashboard/issues
- **Documentation:** See `/docs` folder
- **API Reference:** See `/docs/api.md`

---

## License

MIT License - See LICENSE file for details
