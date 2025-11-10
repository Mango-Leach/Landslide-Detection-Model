# 🚀 IoT Dashboard - Real-time Data Visualization

A beautiful, real-time IoT dashboard for visualizing sensor data from ESP32, Arduino, or any IoT device. Features live charts, graphs, timelines, and data export capabilities.

![Dashboard Preview](https://img.shields.io/badge/Status-Ready-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-v14+-blue) ![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- 📊 **Real-time Data Visualization** - Live updating charts and graphs
- 🌐 **WebSocket Support** - Instant data streaming from IoT devices
- 📈 **Multiple Chart Types** - Line charts, bar charts, pie charts, and timelines
- 💾 **Data Export** - Export to CSV and Excel formats
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🎨 **Beautiful UI** - Modern gradient design with smooth animations
- 🔄 **Auto-reconnect** - Automatic reconnection on connection loss
- 📋 **Data Logging** - View recent data in a sortable table

## 🎯 Supported Devices

- ESP32 / ESP8266
- Arduino (with Ethernet or WiFi shield)
- Raspberry Pi
- Any device that can send HTTP/WebSocket requests

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Arduino IDE (for Arduino/ESP32 code)

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd iot-dashboard
npm install
```

### 2. Start the Server

```powershell
npm start
```

The dashboard will be available at `http://localhost:3000`

### 3. Test with Python Simulator (Optional)

Install Python WebSocket library:
```powershell
pip install websocket-client
```

Run the simulator:
```powershell
python arduino-examples/python_simulator.py
```

## 🔧 Hardware Setup

### ESP32/ESP8266 Setup

#### Hardware Connections:
- **DHT22 Sensor** → GPIO 4
- **LDR (Light Sensor)** → GPIO 34 (ESP32) or A0 (ESP8266)

#### Arduino Libraries Required:
1. DHT sensor library by Adafruit
2. Adafruit Unified Sensor
3. ArduinoJson
4. WebSockets by Markus Sattler

#### Installation Steps:
1. Open Arduino IDE
2. Go to **Sketch → Include Library → Manage Libraries**
3. Search and install the libraries above
4. Open `arduino-examples/esp32_websocket.ino`
5. Update WiFi credentials and server IP:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* serverIP = "192.168.1.100";  // Your PC's IP
   ```
6. Upload to your ESP32/ESP8266

### Arduino with Ethernet Shield

For Arduino boards with Ethernet/WiFi shields, use `arduino-examples/arduino_ethernet.ino`

Update the server IP address:
```cpp
IPAddress serverIP(192, 168, 1, 100);  // Your server's IP
```

## 📊 Dashboard Features

### Real-time Charts
- **Temperature & Humidity Timeline** - Dual-axis line chart
- **Light Level Monitor** - Live light sensor readings
- **Sensor Distribution** - Pie chart showing average values
- **Current Values** - Bar chart of latest readings

### Data Management
- **Export to CSV** - Download all data in CSV format
- **Export to Excel** - Download as .xlsx file
- **Clear Data** - Reset all stored data
- **Auto-scroll Table** - View latest 20 entries

## 🌐 API Endpoints

### WebSocket
- **URL**: `ws://localhost:3000`
- **Format**: Send JSON data
  ```json
  {
    "temperature": 25.5,
    "humidity": 60.2,
    "light": 450
  }
  ```

### REST API

#### POST `/api/data`
Send sensor data via HTTP POST
```bash
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"temperature": 25.5, "humidity": 60.2, "light": 450}'
```

#### GET `/api/data`
Retrieve all stored data
```bash
curl http://localhost:3000/api/data
```

#### GET `/api/data/export`
Get data for export
```bash
curl http://localhost:3000/api/data/export
```

#### DELETE `/api/data`
Clear all stored data
```bash
curl -X DELETE http://localhost:3000/api/data
```

## 📁 Project Structure

```
iot-dashboard/
├── server.js              # Node.js server with WebSocket
├── package.json           # Dependencies
├── public/
│   ├── index.html         # Dashboard UI
│   ├── style.css          # Styling
│   └── app.js             # Frontend logic & charts
└── arduino-examples/
    ├── esp32_websocket.ino    # ESP32 WebSocket example
    ├── arduino_ethernet.ino   # Arduino HTTP example
    └── python_simulator.py    # Python test script
```

## 🎨 Customization

### Change Data Fields
Edit `server.js` and `public/app.js` to add/modify sensor fields:

```javascript
// In server.js and app.js, add new fields:
{
  "temperature": 25.5,
  "humidity": 60.2,
  "light": 450,
  "pressure": 1013.25,  // Add your custom field
  "altitude": 120       // Add another field
}
```

### Modify Chart Colors
Edit `public/app.js` to change chart colors:

```javascript
borderColor: 'rgb(239, 68, 68)',  // Change to your color
backgroundColor: 'rgba(239, 68, 68, 0.1)',
```

### Change Update Interval
In your Arduino code:
```cpp
const unsigned long sendInterval = 2000; // Change to desired milliseconds
```

## 🔒 Security Notes

- This is a basic implementation for local networks
- For production use:
  - Add authentication (JWT tokens)
  - Use HTTPS/WSS instead of HTTP/WS
  - Implement rate limiting
  - Add data validation
  - Use a proper database (MongoDB, PostgreSQL)

## 🐛 Troubleshooting

### Dashboard shows "Disconnected"
- Check if the server is running (`npm start`)
- Verify firewall settings allow port 3000
- Check console for errors (F12 in browser)

### ESP32/Arduino won't connect
- Verify WiFi credentials
- Check server IP address (use `ipconfig` on Windows)
- Ensure ESP32 and PC are on same network
- Check serial monitor for error messages

### Charts not updating
- Open browser console (F12) to check for errors
- Verify data format matches expected structure
- Check WebSocket connection status

## 📝 Data Format

All sensor data should be sent in JSON format:

```json
{
  "temperature": 25.5,    // Float (Celsius)
  "humidity": 60.2,       // Float (Percentage)
  "light": 450,           // Integer (lux)
  "timestamp": "2025-01-01T12:00:00.000Z"  // Optional, auto-generated
}
```

## 🚀 Advanced Usage

### Running on Different Port
```powershell
$env:PORT=8080; npm start
```

### Development Mode (Auto-restart)
```powershell
npm run dev
```

### Using with ngrok (Internet Access)
```powershell
npm start
# In another terminal:
ngrok http 3000
```

## 📚 Resources

- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ESP32 WebSocket Library](https://github.com/Links2004/arduinoWebSockets)
- [DHT Sensor Library](https://github.com/adafruit/DHT-sensor-library)

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 💡 Ideas for Enhancement

- [ ] Add authentication system
- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Email/SMS alerts for threshold values
- [ ] Historical data analysis
- [ ] Multiple device support
- [ ] Custom dashboard layouts
- [ ] Dark mode theme
- [ ] Mobile app (React Native)

## 📞 Support

If you encounter any issues or have questions:
1. Check the Troubleshooting section
2. Review the example code
3. Check browser console for errors
4. Verify your hardware connections

---

**Enjoy your IoT Dashboard! 🎉**

Made with ❤️ for IoT enthusiasts
