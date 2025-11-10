# 🌋 Landslide Detection & Alert System

## Overview
Your IoT dashboard now includes an intelligent landslide detection system that monitors environmental conditions and sends **different email alerts** to admins and users based on risk assessment.

---

## 🚨 How It Works

### Detection Algorithm
The system calculates a **Risk Score** based on multiple sensor readings:

| Condition | Risk Points | Threshold |
|-----------|------------|-----------|
| **Critical Humidity** | +3 | ≥ 85% |
| **High Humidity** | +2 | ≥ 75% |
| **High Temperature** | +2 | ≥ 35°C |
| **Critical Soil Moisture** | +3 | ≥ 80% |
| **Low Pressure** | +1 | < 1000 hPa |
| **Motion Detection** | +2 | Motion = Yes |

**Landslide Alert Triggered When:** Risk Score ≥ 5

---

## 📧 Email Alert System

### 🔧 Admin Alert (Warning)
**Sent to:** Users with `role: 'admin'` and `emailAlerts: true`

**Content:**
- ⚠️ Technical landslide warning
- 📊 Detailed sensor readings
- 🎯 Required admin actions:
  - Verify sensor data
  - Contact emergency services
  - Initiate evacuation protocols
  - Monitor real-time data
  - Alert all users
  - Document actions
- 📈 Risk indicators breakdown
- 🌐 Link to dashboard

**Purpose:** Inform administrators about the technical situation so they can coordinate response.

---

### 🚨 User Alert (Evacuation)
**Sent to:** Users with `role: 'user'` (or no admin role) and `emailAlerts: true`

**Content:**
- 🚨 **URGENT EVACUATION NOTICE**
- 🏃 Immediate action steps:
  1. Leave immediately
  2. Alert family & neighbors
  3. Move to high ground
  4. Avoid river valleys
  5. Call emergency services
- ✅ Safe evacuation locations
- 📞 Emergency contact numbers
- ❌ Safety warnings (what NOT to do)
- 💡 Life-saving priority message

**Purpose:** Instruct regular users to evacuate immediately with clear, actionable safety steps.

---

## 🎯 Configuration

### Environment Variables (.env)
```env
# Landslide Detection Thresholds
LANDSLIDE_HUMIDITY_THRESHOLD=85
LANDSLIDE_TEMP_THRESHOLD=35
LANDSLIDE_SOIL_THRESHOLD=80
LANDSLIDE_PRESSURE_THRESHOLD=1000
```

You can adjust these thresholds based on your geographical conditions.

---

## 👥 User Roles

### Admin User
- **Receives:** Technical warning with sensor data
- **Action:** Coordinate emergency response
- **Example:** atharvadhamdhere2006@gmail.com (current admin)

### Regular User
- **Receives:** Evacuation alert with safety instructions
- **Action:** Evacuate immediately to safe location

---

## 🧪 Testing the System

### Trigger Landslide Alert:
The simulator sends random data. To manually trigger an alert, conditions need to match:

**Example Scenario 1:**
- Humidity: 90% (+3 points)
- Temperature: 37°C (+2 points)
- Motion: Yes (+2 points)
- **Total: 7 points → LANDSLIDE ALERT!**

**Example Scenario 2:**
- Humidity: 86% (+3 points)
- Temperature: 24°C (0 points)
- Motion: Yes (+2 points)
- **Total: 5 points → LANDSLIDE ALERT!**

**Example Scenario 3:**
- Humidity: 76% (+2 points)
- Temperature: 36°C (+2 points)
- Pressure: 998 hPa (+1 point)
- **Total: 5 points → LANDSLIDE ALERT!**

---

## 📱 Additional Features

### SMS Alerts (Optional)
If you configure Twilio credentials, **all users** with `smsAlerts: true` will receive:
```
🚨 LANDSLIDE ALERT! Evacuate immediately to safe location. 
Risk: HIGH. Call emergency services.
```

### WebSocket Broadcast
All connected dashboard clients receive real-time landslide alerts with:
- Alert type: `landslide-alert`
- Risk score
- Risk factors list
- Full sensor data

---

## 📊 Current Status

### Admin User
- ✅ Email: atharvadhamdhere2006@gmail.com
- ✅ Role: admin
- ✅ Email Alerts: Enabled
- ✅ Will receive: LANDSLIDE WARNING

### Test User (Optional)
You can create additional users with role `'user'` who will receive evacuation alerts.

---

## 🔔 Alert Flow

```
Sensor Data Received
        ↓
Risk Score Calculated
        ↓
Risk Score ≥ 5?
   ↙        ↘
 NO         YES
 ↓           ↓
Continue   LANDSLIDE ALERT TRIGGERED!
           ↓
           ├─→ Admin Email (Warning)
           ├─→ User Email (Evacuation)
           ├─→ SMS (if enabled)
           └─→ WebSocket Broadcast
```

---

## 🛡️ Safety Features

1. **Dual Alert System**: Different messages for different roles
2. **Multi-Factor Detection**: Uses 6 different sensor parameters
3. **Real-time Monitoring**: Continuous sensor data analysis
4. **Multiple Channels**: Email + SMS + Dashboard
5. **Clear Instructions**: Actionable steps for both admins and users

---

## 📝 Logs

When a landslide is detected, you'll see in the server console:
```
🚨🚨🚨 LANDSLIDE CONDITIONS DETECTED! 🚨🚨🚨
🚨 Sending landslide ADMIN WARNING to: admin@example.com
🚨 Sending landslide EVACUATION ALERT to 5 users
🚨 LANDSLIDE ALERT SENT - Risk Score: 7, Factors: Critical humidity: 90.0%, High temperature: 37.0°C, Ground motion detected
```

---

## 🎨 Email Design

### Admin Email
- **Color Scheme:** Red gradient (danger)
- **Layout:** Professional with data grids
- **Tone:** Technical and informative
- **Focus:** Action items and monitoring

### User Email  
- **Color Scheme:** Red with pulsing warning icon
- **Layout:** Clear sections with step-by-step instructions
- **Tone:** Urgent and directive
- **Focus:** Personal safety and evacuation

---

## 🚀 All Features Active

✅ Landslide detection algorithm  
✅ Admin warning emails  
✅ User evacuation emails  
✅ SMS support (needs Twilio config)  
✅ WebSocket real-time alerts  
✅ Configurable thresholds  
✅ Risk score calculation  
✅ Multi-parameter monitoring  

---

**Your IoT dashboard is now a complete landslide early warning system!** 🎉
