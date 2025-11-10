import asyncio
import websockets
import json
from datetime import datetime

async def send_landslide_data():
    uri = "ws://localhost:3000"
    
    print("╔════════════════════════════════════════╗")
    print("║   🌋 Landslide Test Data Sender       ║")
    print("╚════════════════════════════════════════╝\n")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to IoT Dashboard")
            print("📡 Device ID: ESP32-LANDSLIDE-TEST\n")
            
            # Test Case 1: High Risk Landslide (Risk Score = 7)
            print("🚨 TEST CASE 1: High Risk Landslide Conditions")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            landslide_data_1 = {
                "deviceId": "ESP32-LANDSLIDE-TEST",
                "temperature": 37.5,      # High temp: +2 points
                "humidity": 90.0,         # Critical humidity: +3 points
                "light": 250,
                "pressure": 1015.0,
                "co2": 400,
                "motion": True,           # Motion detected: +2 points
                "timestamp": datetime.now().isoformat()
            }
            
            print(f"   🌡️  Temperature: {landslide_data_1['temperature']}°C (≥35°C = +2 points)")
            print(f"   💧 Humidity: {landslide_data_1['humidity']}% (≥85% = +3 points)")
            print(f"   🚶 Motion: {'Yes' if landslide_data_1['motion'] else 'No'} (+2 points)")
            print(f"   📊 Total Risk Score: 7 points")
            print(f"   ⚠️  LANDSLIDE ALERT SHOULD TRIGGER!\n")
            
            await websocket.send(json.dumps(landslide_data_1))
            print("✅ Sent Test Case 1 data")
            print("📧 Check your email: atharvadhamdhere2006@gmail.com\n")
            
            await asyncio.sleep(5)
            
            # Test Case 2: Moderate Risk (Risk Score = 5)
            print("\n🚨 TEST CASE 2: Moderate Risk Landslide Conditions")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            landslide_data_2 = {
                "deviceId": "ESP32-LANDSLIDE-TEST",
                "temperature": 24.0,      # Normal temp: 0 points
                "humidity": 86.0,         # Critical humidity: +3 points
                "light": 300,
                "pressure": 995.0,        # Low pressure: +1 point
                "co2": 450,
                "motion": True,           # Motion detected: +2 points
                "timestamp": datetime.now().isoformat()
            }
            
            print(f"   🌡️  Temperature: {landslide_data_2['temperature']}°C (Normal)")
            print(f"   💧 Humidity: {landslide_data_2['humidity']}% (≥85% = +3 points)")
            print(f"   🌍 Pressure: {landslide_data_2['pressure']} hPa (<1000 = +1 point)")
            print(f"   🚶 Motion: {'Yes' if landslide_data_2['motion'] else 'No'} (+2 points)")
            print(f"   📊 Total Risk Score: 6 points")
            print(f"   ⚠️  LANDSLIDE ALERT SHOULD TRIGGER!\n")
            
            await websocket.send(json.dumps(landslide_data_2))
            print("✅ Sent Test Case 2 data")
            print("📧 Check your email again!\n")
            
            await asyncio.sleep(5)
            
            # Test Case 3: Extreme Risk (Risk Score = 10+)
            print("\n🚨🚨 TEST CASE 3: EXTREME RISK - All Factors")
            print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
            landslide_data_3 = {
                "deviceId": "ESP32-LANDSLIDE-TEST",
                "temperature": 38.0,      # High temp: +2 points
                "humidity": 92.0,         # Critical humidity: +3 points
                "light": 150,
                "pressure": 998.0,        # Low pressure: +1 point
                "co2": 500,
                "motion": True,           # Motion detected: +2 points
                "soilMoisture": 85.0,     # Critical soil moisture: +3 points
                "timestamp": datetime.now().isoformat()
            }
            
            print(f"   🌡️  Temperature: {landslide_data_3['temperature']}°C (≥35°C = +2 points)")
            print(f"   💧 Humidity: {landslide_data_3['humidity']}% (≥85% = +3 points)")
            print(f"   🌍 Pressure: {landslide_data_3['pressure']} hPa (<1000 = +1 point)")
            print(f"   🚶 Motion: {'Yes' if landslide_data_3['motion'] else 'No'} (+2 points)")
            print(f"   🌱 Soil Moisture: {landslide_data_3['soilMoisture']}% (≥80% = +3 points)")
            print(f"   📊 Total Risk Score: 11 points")
            print(f"   🚨🚨 EXTREME LANDSLIDE ALERT!\n")
            
            await websocket.send(json.dumps(landslide_data_3))
            print("✅ Sent Test Case 3 data")
            print("📧 Multiple emails should be sent!\n")
            
            print("\n" + "="*50)
            print("✅ All test cases completed!")
            print("="*50)
            print("\n📬 Email Check Instructions:")
            print("   1. Open atharvadhamdhere2006@gmail.com")
            print("   2. Look for emails with subjects:")
            print("      • 🚨 LANDSLIDE WARNING DETECTED - ADMIN ALERT")
            print("      • 🚨 URGENT: LANDSLIDE ALERT - EVACUATE IMMEDIATELY")
            print("\n💡 If emails don't arrive:")
            print("   • Check spam/junk folder")
            print("   • Verify email credentials in .env")
            print("   • Check server console for email logs\n")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("⚠️  Make sure the server is running on http://localhost:3000")

if __name__ == "__main__":
    asyncio.run(send_landslide_data())
