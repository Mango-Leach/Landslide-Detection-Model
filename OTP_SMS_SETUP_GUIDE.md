# 🔐 OTP & SMS Alert Setup Guide

## ✅ What's New

### **3 Major Features Added:**

1. **🔐 OTP Authentication** - Secure 2-factor authentication via email/SMS
2. **📱 SMS Alerts** - Send alerts to mobile phones via Twilio
3. **👑 Admin-Only Email Alerts** - Email alerts now sent ONLY to admin users

---

## 📧 Email Alerts (Admin Only)

### **Changed Behavior:**

❌ **Before**: All users with `emailAlerts: true` received emails  
✅ **Now**: **ONLY ADMIN users** receive email alerts

### **Who Gets Emails:**

- Users with **role = 'admin'** AND **emailAlerts = true**
- Admin emails in `.env` file (`ALERT_EMAILS`)

### **Make a User Admin:**

```javascript
// In MongoDB Compass or shell:
db.users.updateOne(
  { email: "atharva.dhamdhere24@vit.edu" },
  { $set: { role: "admin" } }
)
```

Or use the Admin Panel at: http://localhost:3000/admin.html

---

## 🔐 OTP Authentication

### **How It Works:**

1. User enters email on login page
2. Clicks **"Send OTP"**
3. Receives 6-digit code via **email** or **SMS**
4. Enters code to login (valid for 5 minutes)

### **API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/otp/send-otp-email` | POST | Send OTP via email |
| `/api/otp/send-otp-sms` | POST | Send OTP via SMS |
| `/api/otp/verify-otp` | POST | Verify OTP code |
| `/api/otp/resend-otp` | POST | Resend OTP |

### **Example: Send OTP via Email**

```javascript
fetch('http://localhost:3000/api/otp/send-otp-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        email: 'user@example.com' 
    })
})
.then(res => res.json())
.then(data => console.log(data));
// Response: { success: true, message: "OTP sent to your email", expiresIn: 300 }
```

### **Example: Verify OTP**

```javascript
fetch('http://localhost:3000/api/otp/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        email: 'user@example.com',
        otp: '123456'
    })
})
.then(res => res.json())
.then(data => {
    if (data.success) {
        // Save token and redirect
        localStorage.setItem('token', data.token);
        window.location.href = '/';
    }
});
```

---

## 📱 SMS Alerts (Twilio)

### **Setup Required:**

1. **Sign up** for Twilio: https://www.twilio.com/try-twilio
2. **Get free trial** credits ($15 USD)
3. **Get your credentials**:
   - Account SID
   - Auth Token  
   - Phone Number

### **Update .env File:**

```env
# SMS Configuration (Twilio)
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### **Add Phone to User:**

```javascript
// Update user with phone number
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { 
      phone: "+919876543210",  // Include country code!
      smsAlerts: true 
  }}
)
```

### **SMS Alert Format:**

```
🌡️ IoT Alert [WARNING]

TEMPERATURE: 35.2°C
Threshold: 30°C
Time: 11/7/2025, 11:30:15 PM

- IoT Dashboard
```

---

## 🎯 User Model Updates

### **New Fields:**

```javascript
{
  // Existing fields...
  phone: String,           // Mobile number with country code
  smsAlerts: Boolean,      // Enable/disable SMS alerts
  otp: {
    code: String,          // 6-digit OTP
    expiresAt: Date        // OTP expiration (5 minutes)
  }
}
```

---

## 🚀 Testing Guide

### **Test OTP Authentication:**

1. **Send OTP via Email**:
   ```bash
   curl -X POST http://localhost:3000/api/otp/send-otp-email \
     -H "Content-Type: application/json" \
     -d '{"email":"atharva.dhamdhere24@vit.edu"}'
   ```

2. **Check your email** for 6-digit code

3. **Verify OTP**:
   ```bash
   curl -X POST http://localhost:3000/api/otp/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"email":"atharva.dhamdhere24@vit.edu", "otp":"123456"}'
   ```

### **Test SMS Alerts:**

1. **Configure Twilio** in `.env`
2. **Add phone** to user profile
3. **Enable SMS alerts**: `smsAlerts: true`
4. **Trigger alert** (temperature > 30°C)
5. **Check your phone** for SMS

### **Test Admin Email Alerts:**

1. **Make yourself admin**:
   ```javascript
   db.users.updateOne(
     { email: "atharva.dhamdhere24@vit.edu" },
     { $set: { role: "admin", emailAlerts: true } }
   )
   ```

2. **Trigger alert** (lower temperature threshold to 20°C)
3. **Check inbox** - only admins receive emails

---

## 📊 Alert Flow

```
┌─────────────────┐
│ Threshold       │
│ Exceeded        │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
    ┌────────┐         ┌─────────┐
    │ Email  │         │   SMS   │
    │ Admins │         │  Users  │
    └────┬───┘         └────┬────┘
         │                  │
         ▼                  ▼
  [Admin Inboxes]    [Mobile Phones]
```

### **Email Recipients:**

- ✅ Admin users with `emailAlerts: true`
- ✅ Emails from `.env` (`ALERT_EMAILS`)

### **SMS Recipients:**

- ✅ Users with `smsAlerts: true` AND `phone` set
- ✅ Any role (admin/user/viewer)

---

## 🔧 Configuration Checklist

### **For OTP Email:**

- [x] `.env` has real Gmail credentials
- [x] User exists in database
- [x] Email service initialized

### **For OTP SMS:**

- [ ] Twilio account created
- [ ] `SMS_ENABLED=true` in `.env`
- [ ] Twilio credentials added to `.env`
- [ ] Twilio phone number added
- [ ] User has `phone` field
- [ ] `npm install twilio` completed

### **For Email Alerts:**

- [ ] User has `role: 'admin'`
- [ ] User has `emailAlerts: true`
- [ ] Gmail credentials in `.env`

### **For SMS Alerts:**

- [ ] Same as OTP SMS above
- [ ] User has `smsAlerts: true`

---

## 💡 Important Notes

### **Twilio Free Trial Limitations:**

- ✅ $15 USD free credit
- ⚠️ Can only send SMS to **verified numbers**
- ⚠️ Shows "Sent from Twilio trial account" message
- ℹ️ Upgrade account to remove restrictions

### **Phone Number Format:**

Always use **E.164 format** (international):
- ✅ `+919876543210` (India)
- ✅ `+14155552671` (USA)
- ❌ `9876543210` (Missing country code)
- ❌ `+91-987-654-3210` (No dashes/spaces)

### **OTP Security:**

- OTP expires in **5 minutes**
- Cannot reuse the same OTP
- OTP is cleared after successful verification
- Store OTP codes securely (not logged)

---

## 🎨 Frontend Integration Example

### **OTP Login Page:**

```html
<form id="otpLoginForm">
  <input type="email" id="email" placeholder="Email" required>
  <button type="button" onclick="sendOTP()">Send OTP</button>
  
  <input type="text" id="otp" placeholder="Enter 6-digit code" maxlength="6">
  <button type="submit">Verify & Login</button>
</form>

<script>
async function sendOTP() {
  const email = document.getElementById('email').value;
  
  const response = await fetch('/api/otp/send-otp-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  alert(data.message);
}

document.getElementById('otpLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const otp = document.getElementById('otp').value;
  
  const response = await fetch('/api/otp/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    window.location.href = '/';
  } else {
    alert(data.message);
  }
});
</script>
```

---

## 📝 Summary

### **What Changed:**

1. ✅ **Email alerts** → Admin-only
2. ✅ **OTP authentication** → Email & SMS support
3. ✅ **SMS alerts** → Via Twilio
4. ✅ **User model** → Added phone, smsAlerts, otp fields

### **Next Steps:**

1. **Restart server** to load new code
2. **Make yourself admin** in database
3. **Optional**: Configure Twilio for SMS
4. **Test OTP** via email
5. **Test alerts** to admin inbox

---

## 🔗 Quick Links

- **Twilio Console**: https://console.twilio.com/
- **Twilio Pricing**: https://www.twilio.com/sms/pricing
- **E.164 Format**: https://www.twilio.com/docs/glossary/what-e164
- **Admin Panel**: http://localhost:3000/admin.html

**All features are ready! Restart server to activate.** 🚀
