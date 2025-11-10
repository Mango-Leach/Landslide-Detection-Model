# 🎯 IoT Dashboard - Quick Reference Guide

## 🚀 Quick Start

### Option 1: Double-click start.bat
```
Just double-click "start.bat" and everything will start automatically!
```

### Option 2: Manual start
```powershell
# Terminal 1: Start server
node server-advanced.js

# Terminal 2: Start simulator  
python sensor_simulator.py

# Open browser
http://localhost:3000
```

---

## 🌐 Access Points

| Page | URL | Description |
|------|-----|-------------|
| **Main Dashboard** | http://localhost:3000 | Real-time monitoring |
| **Login** | http://localhost:3000/login.html | User authentication |
| **Sign Up** | http://localhost:3000/signup.html | Create account |
| **Admin Panel** | http://localhost:3000/admin.html | Admin controls |

---

## 🎨 Features Overview

### 1. **Main Dashboard (index.html)**
- ✅ Real-time charts (11+ charts)
- ✅ Live sensor data updates
- ✅ Export to CSV/Excel/JSON
- ✅ Dark/Light theme toggle
- ✅ **🔊 Voice Alerts** - Speaks critical alerts
- ✅ Notifications panel
- ✅ 5 sections: Overview, Analytics, Real-time, History, Settings

### 2. **Login Page (login.html)**
- ✅ Email/password authentication
- ✅ Demo credentials provided
- ✅ Remember me option
- ✅ Beautiful gradient design
- ✅ Auto-redirect based on role

**Demo Credentials:**
- Email: demo@iot.com
- Password: demo123

### 3. **Sign Up Page (signup.html)**
- ✅ Create new account
- ✅ Password strength checker
- ✅ Role selection (Admin/User/Viewer)
- ✅ Email validation
- ✅ Terms acceptance

### 4. **Admin Panel (admin.html)**
- ✅ User management (view, edit, delete users)
- ✅ System statistics
- ✅ Settings controls
- ✅ Activity log
- ✅ Real-time monitoring
- ✅ Voice alerts toggle
- ✅ AI/ML settings

---

## 🔊 Voice Alerts

### How to Use:
1. Click the **🔊 Volume icon** in the top-right header
2. Or go to **Settings** → **Voice Alerts** toggle
3. Click **"Test Voice Alert"** button to test

### What it Does:
- **Speaks alerts** when thresholds are exceeded
- Examples:
  - "Warning! High temperature detected at 35 degrees Celsius"
  - "Warning! High humidity detected at 85 percent"
  - "Warning! Low light level detected at 50 lux"

### Features:
- ✅ Queue system (doesn't overlap alerts)
- ✅ Adjustable rate, pitch, volume
- ✅ Enable/disable anytime
- ✅ Works in background
- ✅ Preference saved in localStorage

---

## 📊 Dashboard Sections

### 📈 Overview
- 4 stat cards with sparkline charts
- Main temperature & humidity chart
- Light level monitoring
- Sensor distribution pie chart

### 📉 Analytics
- Statistical analysis
- Correlation matrix
- Hourly bar chart
- Radar metrics
- Scatter plot

### ⚡ Real-time
- Live gauges for temp, humidity, light
- Real-time data feed
- Latest 10 readings
- Auto-scrolling

### 📅 History
- Searchable data table
- Date filtering
- Export buttons (CSV, Excel, JSON)
- Sortable columns

### ⚙️ Settings
- Theme selection
- Chart animation toggle
- Voice alerts control
- Test voice button
- System info

---

## 🎭 User Roles

### 👑 Admin
- Full access to everything
- User management
- System settings
- Can delete data
- Access to admin panel

### 👤 User
- View dashboard
- Export data
- Create alerts
- Personal settings

### 👁️ Viewer
- Read-only access
- View charts
- No exports
- No settings changes

---

## 🔐 Authentication API

### Register New User
```javascript
POST /api/auth/register
Body: {
  "username": "john",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

### Login
```javascript
POST /api/auth/login
Body: {
  "email": "john@example.com",
  "password": "password123"
}
Returns: { token, user }
```

### Get Current User
```javascript
GET /api/auth/me
Headers: { "Authorization": "Bearer <token>" }
```

### Logout
```javascript
POST /api/auth/logout
Headers: { "Authorization": "Bearer <token>" }
```

---

## 📡 Data API

### Get All Data
```javascript
GET /api/data?limit=100
```

### Get Data by Date Range
```javascript
GET /api/data/range?start=2024-01-01&end=2024-01-31
```

### Get Statistics
```javascript
GET /api/stats
```

### Get AI Predictions
```javascript
GET /api/predictions
```

### Get Anomalies
```javascript
GET /api/anomalies
```

### Get Alerts
```javascript
GET /api/alerts
```

---

## ⚙️ Configuration (.env)

```env
# Server
PORT=3000

# Database (optional)
MONGODB_URI=mongodb://localhost:27017/iot-dashboard

# Authentication
JWT_SECRET=your-secret-key
SESSION_SECRET=session-secret

# Email Alerts (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
ALERT_EMAILS=admin@example.com

# Thresholds
TEMP_MAX_THRESHOLD=30
TEMP_MIN_THRESHOLD=10
HUMIDITY_MAX_THRESHOLD=80
HUMIDITY_MIN_THRESHOLD=20
LIGHT_MIN_THRESHOLD=100
```

---

## 🎛️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl + K` | Search data |
| `Ctrl + E` | Export CSV |
| `Ctrl + L` | Toggle theme |
| `Ctrl + V` | Toggle voice alerts |
| `Esc` | Close notifications |

---

## 🐛 Troubleshooting

### Voice Alerts Not Working?
1. Check browser permissions
2. Make sure volume is up
3. Click "Test Voice Alert" button
4. Try different browser (Chrome/Edge work best)

### Server Won't Start?
```powershell
# Check if port is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <process_id> /F
```

### Simulator Connection Failed?
1. Make sure server is running first
2. Check firewall settings
3. Verify WebSocket port 3000 is open

---

## 📚 Tech Stack

- **Backend:** Node.js, Express, WebSocket
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Database:** MongoDB (optional)
- **Auth:** JWT, bcrypt
- **AI:** brain.js (LSTM)
- **Email:** nodemailer
- **Charts:** Chart.js
- **Voice:** Web Speech API
- **Export:** SheetJS

---

## 🎉 What's New in Version 2.0

✨ **New Features:**
- 🔊 **Voice Alerts** with speech synthesis
- 🔐 **Authentication System** (Login/Signup)
- 👑 **Admin Panel** with user management
- 🤖 **AI Predictions** with LSTM
- 📧 **Email Alerts** for critical events
- 📊 **11+ Interactive Charts**
- 🎨 **Professional UI** with dark mode
- 📱 **Responsive Design**
- 💾 **MongoDB Support** (optional)
- 🚀 **One-click Startup** (start.bat)

---

## 💡 Tips & Tricks

1. **Test Voice Alerts Early:** Go to Settings and click "Test Voice Alert" to ensure it works
2. **Use Admin Panel:** Create admin account to access user management
3. **Export Regularly:** Use History section to backup your data
4. **Adjust Thresholds:** Customize alert levels in .env file
5. **Dark Mode:** Better for long monitoring sessions
6. **Quick Login:** Use demo credentials for testing

---

## 🆘 Support

**Need Help?**
1. Check this guide first
2. Review README.md
3. Check browser console for errors
4. Verify .env configuration

**Common Issues:**
- MongoDB not required - works in memory mode
- Email alerts optional - system works without it
- Voice alerts need HTTPS or localhost

---

**Built with ❤️ for IoT monitoring**

Version: 2.0.0 | Last Updated: November 2025
