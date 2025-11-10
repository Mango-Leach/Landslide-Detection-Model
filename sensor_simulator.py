import asyncio
import websockets
import json
import random
import time
from datetime import datetime

# Configuration
WS_URL = "ws://localhost:3000"
DEVICE_ID = "ESP32-TEST-001"

def generate_sensor_data():
    """Generate realistic sensor data"""
    # Base values with realistic variations
    temperature = 20 + random.gauss(5, 3)  # 15-25°C typical
    humidity = 50 + random.gauss(0, 15)     # 35-65% typical
    light = max(0, 300 + random.gauss(0, 200))  # 100-500 lux typical
    pressure = 1013 + random.gauss(0, 10)  # atmospheric pressure
    co2 = 400 + random.gauss(0, 100)       # 300-500 ppm typical
    motion = random.choice([True, False])   # random motion detection
    
    # Occasionally create anomalies (for testing alerts)
    if random.random() < 0.1:  # 10% chance
        temperature += random.choice([15, -15])  # Extreme temp
    
    if random.random() < 0.1:  # 10% chance
        humidity = random.choice([10, 90])  # Extreme humidity
    
    return {
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2),
        "light": round(light, 1),
        "pressure": round(pressure, 2),
        "co2": round(co2, 1),
        "motion": motion,
        "deviceId": DEVICE_ID,
        "timestamp": datetime.now().isoformat()
    }

async def send_data():
    """Connect to WebSocket and send sensor data with auto-reconnect"""
    retry_count = 0
    max_retries = 999999  # Essentially infinite retries
    
    while retry_count < max_retries:
        try:
            print(f"🔌 Connecting to {WS_URL}...")
            
            async with websockets.connect(
                WS_URL,
                ping_interval=20,  # Send ping every 20 seconds
                ping_timeout=10,   # Wait 10 seconds for pong
                close_timeout=5    # Timeout for close handshake
            ) as websocket:
                print("✅ Connected to IoT Dashboard")
                print(f"📡 Device ID: {DEVICE_ID}")
                print("-" * 50)
                
                retry_count = 0  # Reset retry count on successful connection
                
                while True:
                    # Start timing
                    start_time = time.time()
                    
                    # Generate and send data
                    data = generate_sensor_data()
                    await websocket.send(json.dumps(data))
                    
                    # Display what we sent (compact format for performance)
                    timestamp = datetime.now().strftime('%H:%M:%S')
                    print(f"📊 [{timestamp}] T:{data['temperature']:.1f}°C H:{data['humidity']:.1f}% "
                          f"L:{data['light']:.0f}lux P:{data['pressure']:.1f}hPa "
                          f"CO2:{data['co2']:.0f}ppm M:{'Y' if data['motion'] else 'N'}")
                    
                    # Calculate how long to wait to maintain exactly 2 seconds interval
                    elapsed = time.time() - start_time
                    sleep_time = max(0, 2.0 - elapsed)
                    
                    # Wait before sending next reading
                    await asyncio.sleep(sleep_time)
                    
        except websockets.exceptions.ConnectionClosed as e:
            retry_count += 1
            print(f"⚠️  Connection closed: {e}")
            print(f"🔄 Reconnecting in 3 seconds... (Attempt {retry_count})")
            await asyncio.sleep(3)
            
        except websockets.exceptions.WebSocketException as e:
            retry_count += 1
            print(f"⚠️  WebSocket error: {e}")
            print(f"🔄 Reconnecting in 3 seconds... (Attempt {retry_count})")
            await asyncio.sleep(3)
            
        except KeyboardInterrupt:
            print("\n👋 Simulator stopped by user")
            break
            
        except Exception as e:
            retry_count += 1
            print(f"❌ Error: {e}")
            print(f"🔄 Reconnecting in 5 seconds... (Attempt {retry_count})")
            await asyncio.sleep(5)

if __name__ == "__main__":
    print("╔════════════════════════════════════════╗")
    print("║   🎲 IoT Sensor Simulator             ║")
    print("╚════════════════════════════════════════╝")
    print()
    
    try:
        asyncio.run(send_data())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
