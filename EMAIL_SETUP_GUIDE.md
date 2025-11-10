# 📧 Email Alerts Setup Guide

## Why You Didn't Receive Email

There are **3 reasons** why you didn't get email alerts:

### ❌ Problem 1: Email Not Configured
Your `.env` file has placeholder values:
```env
EMAIL_USER=your-email@gmail.com        # ❌ Not a real email
EMAIL_PASSWORD=your-app-password       # ❌ Not a real password
```

### ❌ Problem 2: No User Account Created
You need to **sign up** with your real email address first!

### ❌ Problem 3: Email Alerts Not Enabled for User
Even if you sign up, `emailAlerts` must be set to `true` in your user profile.

---

## ✅ How to Fix (2 Options)

### **Option 1: Quick Test (Console Logs Only)** 🔍
Skip email setup and just watch the server console:

1. Open the terminal running `node server-advanced.js`
2. Wait for temperature spikes (simulator generates them automatically)
3. Look for this message:
   ```
   📧 Sending alert to 1 user(s): your-email@example.com
   ```

**This confirms alerts ARE triggering** (just not sending emails yet)

---

### **Option 2: Full Email Setup (Real Emails)** 📬

#### **Step 1: Get Gmail App Password**

1. **Go to**: https://myaccount.google.com/apppasswords
2. **Sign in** with your Gmail account
3. **Create app password**:
   - App name: `IoT Dashboard`
   - Click **Create**
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

**Important**: This is NOT your regular Gmail password!

#### **Step 2: Update .env File**

Edit `c:\Users\athar\OneDrive\Desktop\Riot Games\iot-dashboard\.env`:

```env
# Replace these lines:
EMAIL_USER=your-real-email@gmail.com          # ← Your Gmail address
EMAIL_PASSWORD=abcd efgh ijkl mnop            # ← App password from Step 1
EMAIL_FROM=IoT Dashboard <your-real-email@gmail.com>
```

**Example**:
```env
EMAIL_USER=john.doe@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=IoT Dashboard <john.doe@gmail.com>
```

#### **Step 3: Restart Server**

Stop the current server and restart:
```powershell
# Stop server
Get-Process -Name node | Stop-Process -Force

# Start server
cd "c:\Users\athar\OneDrive\Desktop\Riot Games\iot-dashboard"
node server-advanced.js
```

#### **Step 4: Sign Up with Your Email**

1. **Open**: http://localhost:3000/signup.html
2. **Fill form**:
   - Username: `your_username`
   - Email: `your-real-email@gmail.com` ← **MUST be your real email!**
   - Password: `yourpassword`
3. **Click** "Create Account"
4. **Login** at http://localhost:3000/login.html

#### **Step 5: Enable Email Alerts**

Your account has `emailAlerts: true` by default (already enabled).

To verify in MongoDB:
```javascript
// In MongoDB Compass or terminal:
db.users.find({}, { email: 1, emailAlerts: 1 })
```

Should show:
```json
{
  "email": "your-real-email@gmail.com",
  "emailAlerts": true
}
```

#### **Step 6: Test Email Alerts**

**Automatic Test** (Wait for anomalies):
- Simulator generates temperature spikes automatically
- When temp > 30°C, you'll get an email!

**Manual Test** (Instant):
Lower the threshold to trigger immediately:

1. Go to **Analytics** tab
2. Find **Alert Thresholds** section
3. Change Temperature Max to: `20°C` (below current temps)
4. Click **Save Thresholds**
5. **Check your email inbox!** 📧

---

## 📊 How to Verify Alerts Are Working

### **Check Server Console**:
```bash
✅ Connected to MongoDB
🔌 New client connected
📧 Sending alert to 1 user(s): your-email@gmail.com
✅ Alert email sent successfully
```

### **Check Browser Console** (F12):
```javascript
Alert sent to server: {type: "temperature", value: 35.2, ...}
```

### **Check Email Inbox**:
- **Subject**: `🚨 IoT Alert: Temperature`
- **From**: `IoT Dashboard <your-email@gmail.com>`
- **Body**: Alert details with timestamp

---

## 🚨 Common Issues

### **Issue 1: "Invalid credentials" Error**
❌ **Problem**: Wrong email/password in `.env`
✅ **Solution**: Use **App Password**, not regular Gmail password

### **Issue 2: No email received**
❌ **Problem**: Signed up with wrong email address
✅ **Solution**: 
1. Go to http://localhost:3000/signup.html
2. Create NEW account with your **real email**
3. Make sure it matches `EMAIL_USER` in `.env`

### **Issue 3: Server says "Email sent" but nothing in inbox**
❌ **Problem**: Check spam folder
✅ **Solution**: 
- Check **Spam/Junk** folder
- Add sender to safe list
- Wait 1-2 minutes for delivery

### **Issue 4: "EADDRINUSE: port 3000 in use"**
❌ **Problem**: Server already running
✅ **Solution**:
```powershell
Get-Process -Name node | Stop-Process -Force
# Then restart server
```

---

## 🎯 Quick Verification Checklist

Before expecting emails, verify:

- [ ] `.env` has real Gmail address (not `your-email@gmail.com`)
- [ ] `.env` has real App Password (16 characters, not `your-app-password`)
- [ ] Server restarted after editing `.env`
- [ ] Signed up at `/signup.html` with **real email address**
- [ ] Logged in successfully
- [ ] Server console shows: `✅ Connected to MongoDB`
- [ ] Temperature exceeds 30°C (check simulator output)
- [ ] Server console shows: `📧 Sending alert to...`

---

## 📝 Current Status (Your System)

**Server**: ✅ Running (Process ID: 34284)
**Simulator**: ✅ Running (sending data with temperature spikes)
**MongoDB**: ✅ Connected
**Email Config**: ❌ Not configured (placeholder values)
**User Account**: ❌ Not created yet

**Next Steps**:
1. ✅ Keep server running
2. 🔧 Update `.env` with real Gmail credentials (Option 2 above)
3. 🔄 Restart server
4. 👤 Sign up with your real email
5. ⏳ Wait for temperature spike or lower threshold to test

---

## 💡 Tips

- **Gmail App Passwords** require 2-Factor Authentication enabled on your Google account
- **Alternative**: Use any SMTP service (SendGrid, Mailgun, etc.)
- **Testing**: Lower temperature threshold to 20°C for instant alerts
- **Monitoring**: Watch server console for real-time alert activity

---

## 🔗 Resources

- **Gmail App Passwords**: https://support.google.com/accounts/answer/185833
- **Enable 2FA**: https://myaccount.google.com/security
- **Test Email**: http://localhost:3000/signup.html

**Good luck!** 🚀
