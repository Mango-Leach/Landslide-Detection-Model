# 🔌 ESP32 Wiring Diagram - Your Sensors

## Pin Connections

```
ESP32 DevKit               Sensors
┌─────────────┐
│             │
│    3.3V     │──────┬─────── DHT22 VCC
│             │      ├─────── MPU6050 VCC
│             │      └─────── DS3231 VCC
│             │      └─────── Soil Moisture VCC (if 3.3V sensor)
│             │
│     GND     │──────┬─────── DHT22 GND
│             │      ├─────── MPU6050 GND
│             │      ├─────── DS3231 GND
│             │      └─────── Soil Moisture GND
│             │
│    GPIO 4   │───────────── DHT22 DATA
│             │
│   GPIO 21   │──────┬─────── MPU6050 SDA (I2C)
│    (SDA)    │      └─────── DS3231 SDA (I2C)
│             │
│   GPIO 22   │──────┬─────── MPU6050 SCL (I2C)
│    (SCL)    │      └─────── DS3231 SCL (I2C)
│             │
│   GPIO 34   │───────────── Soil Moisture AOUT (analog)
│             │
└─────────────┘
```

---

## Detailed Connections

### 1. DHT22 (Temperature & Humidity)
| DHT22 Pin | ESP32 Pin |
|-----------|-----------|
| VCC       | 3.3V      |
| DATA      | GPIO 4    |
| GND       | GND       |

**Note:** Some DHT22 modules need a 10kΩ pull-up resistor between DATA and VCC (many breakout boards have it built-in).

---

### 2. Capacitive Soil Moisture Sensor
| Sensor Pin | ESP32 Pin |
|------------|-----------|
| VCC        | 3.3V or 5V (check your sensor spec) |
| AOUT       | GPIO 34   |
| GND        | GND       |

**Note:** This is an **analog sensor** - AOUT goes to an ADC-capable pin (GPIO 34).

**Calibration Required:**
1. Keep sensor in **dry air** → note Serial Monitor value
2. Dip sensor in **water** → note Serial Monitor value
3. Update these values in `esp32_sensor_bluetooth.ino`:
   ```cpp
   const int SOIL_DRY = 3000;   // Your dry value
   const int SOIL_WET = 1300;   // Your wet value
   ```

---

### 3. MPU6050 (Motion/Vibration Sensor)
| MPU6050 Pin | ESP32 Pin |
|-------------|-----------|
| VCC         | 3.3V      |
| SDA         | GPIO 21   |
| SCL         | GPIO 22   |
| GND         | GND       |

**Note:** This uses I2C protocol (shares bus with DS3231).

---

### 4. RTC DS3231 (Real-Time Clock)
| DS3231 Pin | ESP32 Pin |
|------------|-----------|
| VCC        | 3.3V or 5V (check your module) |
| SDA        | GPIO 21   |
| SCL        | GPIO 22   |
| GND        | GND       |

**Note:** 
- Has **battery backup** (CR2032 coin cell) to keep time when powered off
- Shares I2C bus with MPU6050 (this is normal and works fine)
- First upload will set time to compile time automatically

---

## I2C Bus Sharing (Important!)

Both **MPU6050** and **DS3231** use I2C:
- They share the same SDA (GPIO 21) and SCL (GPIO 22) wires
- This is **totally normal** - I2C supports multiple devices on one bus
- Each device has a unique address (MPU6050: 0x68, DS3231: 0x68)
- Wait... they have the same address? 🤔
  - Don't worry! DS3231 modules often have address select pins
  - Or they use 0x57 for EEPROM and 0x68 for RTC
  - Arduino libraries handle this automatically

---

## Power Notes

### Power Supply Options:
1. **USB Cable** → 5V from computer (easiest for testing)
2. **5V External** → VIN pin + GND (for deployment)
3. **3.7V LiPo Battery** → Through voltage regulator

### Power Consumption:
- ESP32: ~80mA (Bluetooth active)
- DHT22: ~1mA
- Soil Moisture: ~5mA
- MPU6050: ~3.5mA
- DS3231: ~0.2mA
- **Total: ~90mA** (safe for USB power)

---

## Breadboard Layout (ASCII Art)

```
                    DHT22
                   [VCC][DATA][GND]
                     |    |     |
                    3.3V GPIO4 GND
                     |          |
    ┌────────────────┼──────────┼────────────────┐
    │                |          |                │
    │  ESP32         |          |                │
    │                |          |                │
    │  3.3V ─────────┴──────────┼────────┬───┬───┼──── GND
    │  GPIO4 ───────────────────┘        │   │   │
    │  GPIO21 (SDA) ──────────────┬──────┤   │   │
    │  GPIO22 (SCL) ──────────────┼──┬───┤   │   │
    │  GPIO34 ────────────────────┼──┼───┼───┼───┼──── Soil AOUT
    │                             │  │   │   │   │
    └─────────────────────────────┼──┼───┼───┼───┘
                                  │  │   │   │
                            MPU6050│  │   │   │
                         [VCC][SDA][SCL][GND] │
                           │                  │
                           │         DS3231   │
                           │    [VCC][SDA][SCL][GND]
                           │      │           │
                           └──────┴───────────┘
```

---

## Final Checklist Before Upload

✅ **DHT22** connected to GPIO 4  
✅ **Soil Moisture** connected to GPIO 34  
✅ **MPU6050** SDA → GPIO 21, SCL → GPIO 22  
✅ **DS3231** SDA → GPIO 21, SCL → GPIO 22  
✅ All VCC pins to 3.3V (or 5V if sensor requires)  
✅ All GND pins connected together  
✅ USB cable connected to ESP32  
✅ Arduino IDE set to correct COM port  
✅ Libraries installed (DHT, MPU6050, RTClib, ArduinoJson)  

**Ready to upload!** 🚀
