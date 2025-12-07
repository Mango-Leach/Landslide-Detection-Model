// Global variables
let ws;
let allData = [];
let charts = {};
let currentView = 'overview';
let thresholds = {
    tempMax: 30,
    humidityMax: 80,
    pressureMin: 980,
    pressureMax: 1050
};
let notifications = [];
let startTime = Date.now();

// Voice alerts configuration
let voiceEnabled = localStorage.getItem('voiceAlertsEnabled') === 'true';
let speechSynthesis = window.speechSynthesis;
let voiceQueue = [];
let isSpeaking = false;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initializing...');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    console.log('💡 Loading saved theme:', savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update toggle checkbox
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark';
        console.log('✅ Theme toggle initialized, checked:', themeToggle.checked);
    } else {
        console.error('❌ Theme toggle element not found!');
    }
    
    // Update theme selector dropdown
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = savedTheme;
        console.log('✅ Theme selector initialized, value:', themeSelect.value);
    }
    
    // 📍 Get user's GPS location first
    getUserLocation();
    
    initCharts();
    connectWebSocket();
    startUptime();
    initEventListeners();
    initVoiceAlerts(); // Initialize voice alert UI
    requestNotificationPermission(); // Request browser notification permission
});

// WebSocket Connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to server');
        updateStatus(true);
        addNotification('Connected to IntelliSlide', 'success');
    };
    
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'initial') {
            allData = message.data;
            updateAll();
        } else if (message.type === 'update') {
            allData.push(message.data);
            checkThresholds(message.data);
            updateAll();
            updateLiveFeed(message.data);
        } else if (message.type === 'alert') {
            // Handle real-time alert from server
            handleServerAlert(message.alert);
        }
    };
    
    ws.onclose = () => {
        console.log('Disconnected from server');
        updateStatus(false);
        addNotification('Disconnected from server', 'error');
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus(false);
    };
}

// Update connection status
function updateStatus(connected) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (connected) {
        indicator.classList.add('connected');
        statusText.textContent = 'Connected';
    } else {
        indicator.classList.remove('connected');
        statusText.textContent = 'Disconnected';
    }
}

// Initialize all charts
function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        }
    };
    
    // Temperature & Humidity Chart
    charts.tempHumidity = new Chart(document.getElementById('tempHumidityChart'), {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: { minute: 'HH:mm' }
                    }
                },
                y: { beginAtZero: false }
            }
        }
    });
    
    // Pressure Chart
    charts.pressure = new Chart(document.getElementById('pressureChart'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Atmospheric Pressure (hPa)',
                data: [],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: { minute: 'HH:mm' }
                    }
                },
                y: { 
                    beginAtZero: false,
                    min: 950,
                    max: 1100
                }
            }
        }
    });
    
    // Pie Chart
    charts.pie = new Chart(document.getElementById('pieChart'), {
        type: 'doughnut',
        data: {
            labels: ['Temperature', 'Humidity', 'Pressure'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#ef4444', '#3b82f6', '#8b5cf6'],
                borderWidth: 0
            }]
        },
        options: {
            ...commonOptions,
            aspectRatio: 1.5
        }
    });
    
    // Bar Chart
    charts.bar = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels: ['Temperature', 'Humidity', 'Pressure'],
            datasets: [{
                label: 'Current Values',
                data: [0, 0, 0],
                backgroundColor: ['#ef4444', '#3b82f6', '#8b5cf6'],
                borderRadius: 8
            }]
        },
        options: {
            ...commonOptions,
            scales: { y: { beginAtZero: true } }
        }
    });
    
    // Radar Chart
    charts.radar = new Chart(document.getElementById('radarChart'), {
        type: 'radar',
        data: {
            labels: ['Temp (Avg)', 'Humidity (Avg)', 'Pressure (Avg)', 'Temp (Max)', 'Humidity (Max)'],
            datasets: [{
                label: 'Sensor Metrics',
                data: [0, 0, 0, 0, 0],
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                pointBackgroundColor: '#6366f1'
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                r: { beginAtZero: true }
            }
        }
    });
    
    // Scatter Chart (for analytics)
    charts.scatter = new Chart(document.getElementById('scatterChart'), {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Temp vs Humidity',
                data: [],
                backgroundColor: 'rgba(99, 102, 241, 0.6)'
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                x: { title: { display: true, text: 'Temperature (°C)' } },
                y: { title: { display: true, text: 'Humidity (%)' } }
            }
        }
    });
    
    // Mini charts for stats cards
    initMiniCharts();
    
    // Gauge charts
    initGaugeCharts();
}

// Initialize mini charts in stat cards
function initMiniCharts() {
    const miniChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { display: false },
            y: { display: false }
        },
        elements: { point: { radius: 0 } }
    };
    
    charts.tempMini = new Chart(document.getElementById('tempMiniChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: '#ef4444',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: miniChartOptions
    });
    
    charts.humidityMini = new Chart(document.getElementById('humidityMiniChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: '#3b82f6',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: miniChartOptions
    });
    
    charts.pressureMini = new Chart(document.getElementById('pressureMiniChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: '#8b5cf6',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: miniChartOptions
    });
}

// Initialize gauge charts
function initGaugeCharts() {
    const gaugeOptions = {
        responsive: true,
        maintainAspectRatio: true,
        circumference: 180,
        rotation: 270,
        cutout: '70%',
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        }
    };
    
    charts.tempGauge = new Chart(document.getElementById('tempGauge'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#ef4444', '#e5e7eb'],
                borderWidth: 0
            }]
        },
        options: gaugeOptions
    });
    
    charts.humidityGauge = new Chart(document.getElementById('humidityGauge'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#3b82f6', '#e5e7eb'],
                borderWidth: 0
            }]
        },
        options: gaugeOptions
    });
    
    charts.pressureGauge = new Chart(document.getElementById('pressureGauge'), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 150],
                backgroundColor: ['#8b5cf6', '#e5e7eb'],
                borderWidth: 0
            }]
        },
        options: gaugeOptions
    });
    
    // Initialize enhanced visualization charts
    initEnhancedCharts();
}

// Initialize enhanced visualization charts
function initEnhancedCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            }
        }
    };
    
    // Heatmap Chart (Temperature over time blocks)
    charts.heatmap = new Chart(document.getElementById('heatmapChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature Intensity',
                data: [],
                backgroundColor: [],
                borderRadius: 4,
                barThickness: 'flex'
            }]
        },
        options: {
            ...commonOptions,
            indexAxis: 'y',
            scales: {
                x: { 
                    title: { display: true, text: 'Temperature (°C)' },
                    beginAtZero: false
                },
                y: {
                    title: { display: true, text: 'Time Block' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Temp: ${context.parsed.x.toFixed(1)}°C`;
                        }
                    }
                }
            }
        }
    });
    
    // Multi-sensor comparison chart
    charts.comparison = new Chart(document.getElementById('comparisonChart'), {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }
            ]
        },
        options: {
            ...commonOptions,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: { minute: 'HH:mm' }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Temperature (°C)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Humidity (%)' },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
    
    // Hourly average comparison chart
    charts.hourly = new Chart(document.getElementById('hourlyChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: [],
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: 'Pressure (hPa / 10)',
                    data: [],
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Value' }
                },
                x: {
                    title: { display: true, text: 'Hour' }
                }
            }
        }
    });
}

// Update all dashboard elements
function updateAll() {
    if (allData.length === 0) return;
    
    updateStatCards();
    updateMainCharts();
    updateMiniCharts();
    updateGauges();
    updateAnalytics();
    updateDataTable();
    updateEnhancedCharts();
}

// Update stat cards
function updateStatCards() {
    const latest = allData[allData.length - 1];
    const previous = allData[allData.length - 2] || latest;
    
    // Temperature
    document.getElementById('tempValue').textContent = latest.temperature?.toFixed(1) || '--';
    updateTrend('tempTrend', latest.temperature, previous.temperature, '°C');
    
    // Humidity
    document.getElementById('humidityValue').textContent = latest.humidity?.toFixed(1) || '--';
    updateTrend('humidityTrend', latest.humidity, previous.humidity, '%');
    
    // Pressure
    document.getElementById('pressureValue').textContent = latest.pressure?.toFixed(1) || '--';
    updateTrend('pressureTrend', latest.pressure, previous.pressure, ' hPa');
    
    // Rainfall - Fetch from server
    fetchRainfallData();
    
    // Data points
    document.getElementById('dataPoints').textContent = allData.length;
    const progress = (allData.length / 1000) * 100;
    document.getElementById('dataProgress').style.width = `${Math.min(progress, 100)}%`;
    document.querySelector('.progress-text').textContent = `${Math.min(progress, 100).toFixed(1)}% of capacity`;
    
    // Update rate
    if (allData.length >= 2) {
        const timeDiff = new Date(latest.timestamp) - new Date(previous.timestamp);
        const rate = timeDiff > 0 ? (1000 / timeDiff).toFixed(2) : '--';
        document.getElementById('updateRate').textContent = `${rate} /sec`;
    }
}

// Update trend indicator
function updateTrend(elementId, current, previous, unit) {
    const element = document.getElementById(elementId);
    const diff = current - previous;
    const icon = diff > 0 ? 'fa-arrow-up' : diff < 0 ? 'fa-arrow-down' : 'fa-minus';
    const className = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
    
    element.className = `trend ${className}`;
    element.innerHTML = `<i class="fas ${icon}"></i> ${diff > 0 ? '+' : ''}${diff.toFixed(1)}${unit}`;
}

// Update main charts
function updateMainCharts() {
    const maxPoints = 50;
    const startIndex = Math.max(0, allData.length - maxPoints);
    const recentData = allData.slice(startIndex);
    
    const timestamps = recentData.map(d => new Date(d.timestamp));
    const temperatures = recentData.map(d => ({ x: new Date(d.timestamp), y: d.temperature }));
    const humidities = recentData.map(d => ({ x: new Date(d.timestamp), y: d.humidity }));
    const pressures = recentData.map(d => ({ x: new Date(d.timestamp), y: d.pressure }));
    
    // Update temp/humidity chart
    charts.tempHumidity.data.datasets[0].data = temperatures;
    charts.tempHumidity.data.datasets[1].data = humidities;
    charts.tempHumidity.update('none');
    
    // Update pressure chart
    charts.pressure.data.datasets[0].data = pressures;
    charts.pressure.update('none');
    
    // Update pie chart
    const temps = allData.map(d => d.temperature || 0);
    const hums = allData.map(d => d.humidity || 0);
    const press = allData.map(d => d.pressure || 0);
    
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const avgHum = hums.reduce((a, b) => a + b, 0) / hums.length;
    const avgPressure = press.reduce((a, b) => a + b, 0) / press.length;
    
    charts.pie.data.datasets[0].data = [avgTemp, avgHum, avgPressure / 10];
    charts.pie.update('none');
    
    // Update bar chart
    const latest = allData[allData.length - 1];
    charts.bar.data.datasets[0].data = [
        latest.temperature || 0,
        latest.humidity || 0,
        (latest.pressure || 0) / 10
    ];
    charts.bar.update('none');
    
    // Update radar chart
    const maxTemp = Math.max(...temps);
    const maxHum = Math.max(...hums);
    charts.radar.data.datasets[0].data = [
        avgTemp, avgHum, avgPressure / 10, maxTemp, maxHum
    ];
    charts.radar.update('none');
}

// Update mini charts
function updateMiniCharts() {
    const maxPoints = 20;
    const startIndex = Math.max(0, allData.length - maxPoints);
    const recentData = allData.slice(startIndex);
    
    const labels = recentData.map((_, i) => i);
    const temps = recentData.map(d => d.temperature || 0);
    const hums = recentData.map(d => d.humidity || 0);
    const pressures = recentData.map(d => d.pressure || 0);
    
    charts.tempMini.data.labels = labels;
    charts.tempMini.data.datasets[0].data = temps;
    charts.tempMini.update('none');
    
    charts.humidityMini.data.labels = labels;
    charts.humidityMini.data.datasets[0].data = hums;
    charts.humidityMini.update('none');
    
    charts.pressureMini.data.labels = labels;
    charts.pressureMini.data.datasets[0].data = pressures;
    charts.pressureMini.update('none');
}

// Update gauges
function updateGauges() {
    const latest = allData[allData.length - 1];
    
    charts.tempGauge.data.datasets[0].data = [latest.temperature || 0, 50 - (latest.temperature || 0)];
    charts.tempGauge.update('none');
    
    charts.humidityGauge.data.datasets[0].data = [latest.humidity || 0, 100 - (latest.humidity || 0)];
    charts.humidityGauge.update('none');
    
    charts.pressureGauge.data.datasets[0].data = [(latest.pressure || 1000) - 950, 1100 - (latest.pressure || 1000)];
    charts.pressureGauge.update('none');
}

// Update analytics
function updateAnalytics() {
    const temps = allData.map(d => d.temperature || 0);
    const hums = allData.map(d => d.humidity || 0);
    const pressures = allData.map(d => d.pressure || 0);
    
    // Calculate statistics
    const stats = {
        temp: calculateStats(temps),
        humidity: calculateStats(hums),
        pressure: calculateStats(pressures)
    };
    
    // Update stats table
    document.getElementById('avgTemp').textContent = stats.temp.avg.toFixed(2);
    document.getElementById('minTemp').textContent = stats.temp.min.toFixed(2);
    document.getElementById('maxTemp').textContent = stats.temp.max.toFixed(2);
    document.getElementById('stdTemp').textContent = stats.temp.std.toFixed(2);
    
    document.getElementById('avgHumidity').textContent = stats.humidity.avg.toFixed(2);
    document.getElementById('minHumidity').textContent = stats.humidity.min.toFixed(2);
    document.getElementById('maxHumidity').textContent = stats.humidity.max.toFixed(2);
    document.getElementById('stdHumidity').textContent = stats.humidity.std.toFixed(2);
    
    document.getElementById('avgPressure').textContent = stats.pressure.avg.toFixed(1);
    document.getElementById('minPressure').textContent = stats.pressure.min.toFixed(1);
    document.getElementById('maxPressure').textContent = stats.pressure.max.toFixed(1);
    document.getElementById('stdPressure').textContent = stats.pressure.std.toFixed(1);
    
    // Update scatter chart
    const scatterData = allData.map(d => ({
        x: d.temperature,
        y: d.humidity
    }));
    charts.scatter.data.datasets[0].data = scatterData;
    charts.scatter.update('none');
}

// Calculate statistics
function calculateStats(data) {
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const variance = data.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / data.length;
    const std = Math.sqrt(variance);
    
    return { avg, min, max, std };
}

// Update data table
function updateDataTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    
    if (allData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No data available yet</td></tr>';
        return;
    }
    
    const recentData = allData.slice(-25).reverse();
    
    recentData.forEach((data, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${new Date(data.timestamp).toLocaleString()}</td>
            <td>${data.temperature?.toFixed(2) || 'N/A'}</td>
            <td>${data.humidity?.toFixed(2) || 'N/A'}</td>
            <td>${data.pressure?.toFixed(1) || 'N/A'}</td>
            <td>
                <button class="icon-btn-sm" onclick="deleteRow(${allData.length - 1 - index})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
    });
}

// Update live feed
function updateLiveFeed(data) {
    const feed = document.getElementById('liveFeed');
    const feedItem = document.createElement('div');
    feedItem.className = 'feed-item';
    feedItem.innerHTML = `
        <strong>${new Date(data.timestamp).toLocaleTimeString()}</strong><br>
        🌡️ ${data.temperature?.toFixed(1)}°C | 
        💧 ${data.humidity?.toFixed(1)}% | 
        � ${data.pressure?.toFixed(1)} hPa
    `;
    feed.insertBefore(feedItem, feed.firstChild);
    
    // Keep only last 20 items
    while (feed.children.length > 20) {
        feed.removeChild(feed.lastChild);
    }
}

// Check thresholds and create alerts
function checkThresholds(data) {
    if (!document.getElementById('enableAlerts').checked) return;
    
    if (data.temperature > thresholds.tempMax) {
        const message = `High temperature: ${data.temperature.toFixed(1)}°C`;
        addNotification(message, 'warning');
        speakAlert(`Warning! High temperature detected at ${data.temperature.toFixed(1)} degrees Celsius`);
    }
    if (data.humidity > thresholds.humidityMax) {
        const message = `High humidity: ${data.humidity.toFixed(1)}%`;
        addNotification(message, 'warning');
        speakAlert(`Warning! High humidity detected at ${data.humidity.toFixed(1)} percent`);
    }
    if (data.light < thresholds.lightMin) {
        const message = `Low light level: ${data.light.toFixed(0)} lux`;
        addNotification(message, 'warning');
        speakAlert(`Warning! Low light level detected at ${data.light.toFixed(0)} lux`);
    }
}

// Voice alert function
function speakAlert(text) {
    if (!voiceEnabled || !speechSynthesis) return;
    
    // Add to queue
    voiceQueue.push(text);
    
    // Process queue if not already speaking
    if (!isSpeaking) {
        processVoiceQueue();
    }
}

function processVoiceQueue() {
    if (voiceQueue.length === 0) {
        isSpeaking = false;
        return;
    }
    
    isSpeaking = true;
    const text = voiceQueue.shift();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';
    
    utterance.onend = () => {
        // Wait a bit before next alert
        setTimeout(() => {
            processVoiceQueue();
        }, 500);
    };
    
    utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        isSpeaking = false;
    };
    
    speechSynthesis.speak(utterance);
}

// Toggle voice alerts
function toggleVoiceAlerts() {
    voiceEnabled = !voiceEnabled;
    const status = voiceEnabled ? 'enabled' : 'disabled';
    addNotification(`Voice alerts ${status}`, 'info');
    
    // Save preference
    localStorage.setItem('voiceAlertsEnabled', voiceEnabled.toString());
    
    // Update both UI elements
    updateVoiceUI();
    
    // Stop any current speech
    if (!voiceEnabled && speechSynthesis) {
        speechSynthesis.cancel();
        voiceQueue = [];
        isSpeaking = false;
    }
}

// Initialize voice alert UI
function initVoiceAlerts() {
    // Load saved preference, default to false for less annoyance
    if (localStorage.getItem('voiceAlertsEnabled') === null) {
        voiceEnabled = false;
        localStorage.setItem('voiceAlertsEnabled', 'false');
    }
    updateVoiceUI();
}

// Update voice alert UI elements
function updateVoiceUI() {
    // Update header button
    const toggle = document.getElementById('voiceToggle');
    if (toggle) {
        toggle.textContent = voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF';
    }
    
    // Update settings checkbox
    const checkbox = document.getElementById('voiceAlertsToggle');
    if (checkbox) {
        checkbox.checked = voiceEnabled;
    }
}

// Test voice alert
function testVoiceAlert() {
    speakAlert('This is a test alert. Voice alerts are working correctly.');
}

// Add notification
function addNotification(message, type = 'info') {
    notifications.unshift({ message, type, time: new Date() });
    
    const badge = document.getElementById('notificationBadge');
    badge.textContent = notifications.length;
    
    updateNotificationPanel();
}

// Update notification panel
function updateNotificationPanel() {
    const list = document.getElementById('notificationList');
    list.innerHTML = '';
    
    if (notifications.length === 0) {
        list.innerHTML = '<p class="no-notifications">No new notifications</p>';
        return;
    }
    
    notifications.slice(0, 10).forEach(notif => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `
            <strong>${notif.message}</strong><br>
            <small>${notif.time.toLocaleTimeString()}</small>
        `;
        list.appendChild(item);
    });
}

// Export functions
function exportData(format) {
    if (allData.length === 0) {
        alert('No data to export!');
        return;
    }
    
    if (format === 'csv') {
        exportCSV();
    } else if (format === 'pdf') {
        exportPDF();
    } else if (format === 'json') {
        exportJSON();
    }
}

function exportCSV() {
    const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Pressure (hPa)'];
    const csvContent = [
        headers.join(','),
        ...allData.map(d => [
            new Date(d.timestamp).toISOString(),
            d.temperature || '',
            d.humidity || '',
            d.pressure || ''
        ].join(','))
    ].join('\n');
    
    downloadFile(csvContent, 'iot-data.csv', 'text/csv');
}

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('IntelliSlide - Sensor Data Report', 14, 22);
    
    // Add metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Records: ${allData.length}`, 14, 36);
    
    // Add device location if available
    if (deviceLocation.lat && deviceLocation.lon) {
        const region = determineRegionFromCoords(deviceLocation.lat, deviceLocation.lon);
        doc.text(`Location: ${deviceLocation.lat.toFixed(4)}°N, ${deviceLocation.lon.toFixed(4)}°E (${region})`, 14, 42);
    }
    
    // Prepare table data
    const tableData = allData.map(d => [
        new Date(d.timestamp).toLocaleString(),
        d.temperature ? d.temperature.toFixed(2) : 'N/A',
        d.humidity ? d.humidity.toFixed(2) : 'N/A',
        d.pressure ? d.pressure.toFixed(2) : 'N/A'
    ]);
    
    // Add table
    doc.autoTable({
        head: [['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Pressure (hPa)']],
        body: tableData,
        startY: deviceLocation.lat ? 48 : 42,
        theme: 'striped',
        headStyles: {
            fillColor: [76, 175, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        margin: { top: 10 }
    });
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Page ${i} of ${pageCount} | IntelliSlide System`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
        );
    }
    
    // Save the PDF
    doc.save('intellislide-data.pdf');
}

function exportJSON() {
    const jsonContent = JSON.stringify(allData, null, 2);
    downloadFile(jsonContent, 'iot-data.json', 'application/json');
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

// UI Functions
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function switchView(view) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    // Update sections
    document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
    document.getElementById(view).classList.add('active');
    
    currentView = view;
}

function toggleNotifications() {
    document.getElementById('notificationPanel').classList.toggle('active');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// Logout function
function logout() {
    // Clear authentication token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Show logout notification
    if (typeof addNotification === 'function') {
        addNotification('Logged out successfully', 'info');
    }
    
    // Redirect to login page after a short delay
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 500);
}

function toggleTheme() {
    console.log('toggleTheme called!');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    console.log('Current theme:', currentTheme);
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update checkbox state
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = newTheme === 'dark';
        console.log('Checkbox updated, checked:', themeToggle.checked);
    }
    
    // Update theme selector dropdown
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        themeSelect.value = newTheme;
    }
    
    console.log('Theme toggled to:', newTheme);
}

function changeTheme() {
    const theme = document.getElementById('themeSelect').value;
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const selectedTheme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', selectedTheme);
        localStorage.setItem('theme', selectedTheme);
    } else {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
    
    // Update toggle checkbox
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        themeToggle.checked = currentTheme === 'dark';
    }
    
    console.log('Theme changed via selector to:', theme);
}

function updateThresholds() {
    thresholds.tempMax = parseFloat(document.getElementById('tempMax').value);
    thresholds.humidityMax = parseFloat(document.getElementById('humidityMax').value);
    thresholds.pressureMin = parseFloat(document.getElementById('pressureMin').value);
    thresholds.pressureMax = parseFloat(document.getElementById('pressureMax').value);
}

function clearData() {
    if (confirm('Are you sure you want to clear all data?')) {
        fetch('/api/data', { method: 'DELETE' })
            .then(response => response.json())
            .then(data => {
                allData = [];
                updateAll();
                addNotification('Data cleared successfully', 'success');
            })
            .catch(error => console.error('Error clearing data:', error));
    }
}

function deleteRow(index) {
    allData.splice(index, 1);
    updateAll();
}

function sortTable(col) {
    // Table sorting implementation
    console.log('Sorting by column:', col);
}

function filterTable() {
    // Table filtering implementation
    const input = document.getElementById('tableSearch').value.toLowerCase();
    const rows = document.getElementById('dataTableBody').getElementsByTagName('tr');
    
    Array.from(rows).forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(input) ? '' : 'none';
    });
}

function changeRowsPerPage() {
    updateDataTable();
}

function updateTimeRange() {
    updateMainCharts();
}

function downloadChart(chartId) {
    const canvas = document.getElementById(chartId);
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chartId}.png`;
    a.click();
}

function startUptime() {
    setInterval(() => {
        const uptime = Date.now() - startTime;
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);
        document.getElementById('uptime').textContent = `${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

function initEventListeners() {
    // Theme toggle - handle both checkbox change and direct clicks on the switch
    const themeToggle = document.getElementById('themeToggle');
    const switchLabel = document.querySelector('.switch');
    
    if (themeToggle) {
        // Remove any existing listeners to avoid duplicates
        themeToggle.removeEventListener('change', toggleTheme);
        themeToggle.addEventListener('change', toggleTheme);
        console.log('✅ Theme toggle event listener attached');
    }
    
    // Also make the entire switch clickable
    if (switchLabel) {
        switchLabel.addEventListener('click', function(e) {
            console.log('🖱️ Switch clicked!');
            // Let the label handle it naturally, but log it
        });
    }
}

// Update enhanced visualization charts
function updateEnhancedCharts() {
    if (!charts.heatmap || !charts.comparison || !charts.hourly) return;
    
    updateHeatmap();
    updateComparisonChart();
    updateHourlyChart();
}

// Update heatmap chart
function updateHeatmap() {
    const hours = parseInt(document.getElementById('heatmapRange')?.value || 12);
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const filteredData = allData.filter(d => new Date(d.timestamp) >= cutoffTime);
    
    if (filteredData.length === 0) return;
    
    // Group data into 30-minute blocks
    const blockSize = 30 * 60 * 1000; // 30 minutes in ms
    const blocks = {};
    
    filteredData.forEach(d => {
        const time = new Date(d.timestamp);
        const blockKey = Math.floor(time.getTime() / blockSize) * blockSize;
        if (!blocks[blockKey]) {
            blocks[blockKey] = [];
        }
        blocks[blockKey].push(d.temperature);
    });
    
    // Calculate average for each block and create color scale
    const labels = [];
    const data = [];
    const colors = [];
    
    Object.keys(blocks).sort().forEach(key => {
        const avg = blocks[key].reduce((a, b) => a + b, 0) / blocks[key].length;
        const time = new Date(parseInt(key));
        labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        data.push(avg);
        
        // Color gradient based on temperature
        if (avg < 20) colors.push('rgba(59, 130, 246, 0.8)'); // Blue (cold)
        else if (avg < 25) colors.push('rgba(34, 197, 94, 0.8)'); // Green (normal)
        else if (avg < 30) colors.push('rgba(245, 158, 11, 0.8)'); // Orange (warm)
        else colors.push('rgba(239, 68, 68, 0.8)'); // Red (hot)
    });
    
    charts.heatmap.data.labels = labels;
    charts.heatmap.data.datasets[0].data = data;
    charts.heatmap.data.datasets[0].backgroundColor = colors;
    charts.heatmap.update('none');
}

// Update comparison chart
function updateComparisonChart() {
    const maxPoints = 30;
    const startIndex = Math.max(0, allData.length - maxPoints);
    const recentData = allData.slice(startIndex);
    
    const temps = recentData.map(d => ({ x: new Date(d.timestamp), y: d.temperature }));
    const hums = recentData.map(d => ({ x: new Date(d.timestamp), y: d.humidity }));
    
    charts.comparison.data.datasets[0].data = temps;
    charts.comparison.data.datasets[1].data = hums;
    charts.comparison.update('none');
}

// Update hourly chart
function updateHourlyChart() {
    // Group data by hour
    const hourlyData = {};
    
    allData.forEach(d => {
        const hour = new Date(d.timestamp).getHours();
        if (!hourlyData[hour]) {
            hourlyData[hour] = { temps: [], hums: [], pressures: [] };
        }
        hourlyData[hour].temps.push(d.temperature);
        hourlyData[hour].hums.push(d.humidity);
        hourlyData[hour].pressures.push(d.pressure);
    });
    
    const labels = [];
    const tempData = [];
    const humData = [];
    const pressureData = [];
    
    for (let i = 0; i < 24; i++) {
        labels.push(`${i}:00`);
        if (hourlyData[i]) {
            const temps = hourlyData[i].temps;
            const hums = hourlyData[i].hums;
            const pressures = hourlyData[i].pressures;
            
            tempData.push(temps.reduce((a, b) => a + b, 0) / temps.length);
            humData.push(hums.reduce((a, b) => a + b, 0) / hums.length);
            pressureData.push((pressures.reduce((a, b) => a + b, 0) / pressures.length) / 10);
        } else {
            tempData.push(0);
            humData.push(0);
            pressureData.push(0);
        }
    }
    
    // Check which sensors to show
    const showTemp = document.getElementById('showTemp')?.checked !== false;
    const showHum = document.getElementById('showHumidity')?.checked !== false;
    const showPressure = document.getElementById('showPressure')?.checked !== false;
    
    charts.hourly.data.labels = labels;
    charts.hourly.data.datasets[0].data = showTemp ? tempData : [];
    charts.hourly.data.datasets[1].data = showHum ? humData : [];
    charts.hourly.data.datasets[2].data = showPressure ? pressureData : [];
    charts.hourly.update('none');
}

// Toggle comparison view
function toggleComparisonView() {
    updateComparisonChart();
}

// Browser Push Notification Functions
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
                addNotification('Browser notifications enabled', 'success');
            }
        });
    }
}

function showBrowserNotification(title, message, icon = '🚨') {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'iot-alert',
            requireInteraction: false,
            silent: false
        });
    }
}

function handleServerAlert(alert) {
    console.log('🚨 Alert received from server:', alert);
    
    // Add to notification panel
    addNotification(alert.message, alert.severity);
    
    // Show browser notification
    const title = `IntelliSlide Alert: ${alert.type.toUpperCase()}`;
    showBrowserNotification(title, alert.message);
    
    // Speak alert if voice is enabled
    if (voiceEnabled) {
        speakAlert(alert.message);
    }
    
    // Visual flash effect
    flashAlert(alert.severity);
}

function flashAlert(severity) {
    const body = document.body;
    const originalBg = body.style.backgroundColor;
    
    // Flash color based on severity
    const flashColor = severity === 'warning' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
    
    body.style.backgroundColor = flashColor;
    setTimeout(() => {
        body.style.backgroundColor = originalBg;
    }, 300);
}

// 🌋 AI Landslide Prediction Functions
async function loadLandslidePrediction() {
    try {
        const response = await fetch('/api/landslide-prediction');
        const data = await response.json();
        
        displayAIPrediction(data.prediction);
        displayPatternDetection(data.patterns);
        
    } catch (error) {
        console.error('Error loading landslide prediction:', error);
        document.getElementById('ai-prediction-content').innerHTML = `
            <div style="text-align: center; padding: 20px; opacity: 0.8;">
                <i class="fas fa-exclamation-circle"></i> Error loading prediction
            </div>
        `;
    }
}

function displayAIPrediction(prediction) {
    const container = document.getElementById('ai-prediction-content');
    
    if (!prediction) {
        container.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 10px;">🧠</div>
                <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">AI Learning Mode</div>
                <div style="font-size: 0.85rem; opacity: 0.9;">
                    Model training in progress...<br>
                    Need 10+ landslide events for predictions
                </div>
            </div>
        `;
        return;
    }
    
    const riskColor = prediction.risk === 'HIGH' ? '#ff4444' : 
                     prediction.risk === 'MODERATE' ? '#ffbb33' : '#00C851';
    
    container.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 15px;">
                ${prediction.confidence === 'LEARNING' ? '📚 Learning' : '✅ Trained'} • 
                ${prediction.eventsAnalyzed} Events Analyzed
            </div>
            <div style="font-size: 4rem; font-weight: bold; margin: 15px 0;">
                ${prediction.probability}%
            </div>
            <div style="font-size: 1.3rem; font-weight: 600; padding: 10px 20px; background: ${riskColor}; border-radius: 25px; display: inline-block; margin-top: 10px;">
                ${prediction.risk} RISK
            </div>
            <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 15px;">
                Landslide Probability
            </div>
        </div>
    `;
}

function displayPatternDetection(patterns) {
    const container = document.getElementById('pattern-detection-content');
    
    if (!patterns) {
        container.innerHTML = `
            <div style="text-align: center; opacity: 0.8;">
                <i class="fas fa-search"></i> No pattern data
            </div>
        `;
        return;
    }
    
    const scoreColor = patterns.warning === 'CRITICAL' ? '#ff4444' : 
                      patterns.warning === 'WARNING' ? '#ffbb33' : '#00C851';
    
    const patternIcons = {
        rapidHumidityIncrease: '💧',
        temperatureSpike: '🌡️',
        pressureDrop: '🌍',
        sustainedMotion: '📳'
    };
    
    const activePatterns = Object.keys(patterns).filter(key => 
        patterns[key] === true && patternIcons[key]
    );
    
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 3rem; font-weight: bold; color: ${scoreColor};">
                ${patterns.anomalyScore}/10
            </div>
            <div style="font-size: 0.9rem; opacity: 0.9; margin-top: 5px;">
                Anomaly Score
            </div>
            <div style="font-size: 1.1rem; font-weight: 600; margin-top: 10px; padding: 8px 16px; background: rgba(255,255,255,0.2); border-radius: 20px; display: inline-block;">
                ${patterns.warning}
            </div>
        </div>
        <div style="font-size: 0.85rem; opacity: 0.9;">
            ${activePatterns.length > 0 ? 
                `<div style="margin-top: 15px;">
                    <div style="font-weight: 600; margin-bottom: 8px;">⚠️ Active Patterns:</div>
                    ${activePatterns.map(key => `
                        <div style="background: rgba(255,255,255,0.15); padding: 8px 12px; border-radius: 8px; margin: 5px 0;">
                            ${patternIcons[key]} ${key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                    `).join('')}
                </div>` : 
                `<div style="margin-top: 10px;">✅ No critical patterns detected</div>`
            }
        </div>
    `;
}

function refreshLandslidePrediction() {
    loadLandslidePrediction();
    addNotification('AI prediction refreshed', 'success');
}

// Auto-refresh AI prediction every 30 seconds
setInterval(loadLandslidePrediction, 30000);

// Load on initialization
setTimeout(loadLandslidePrediction, 2000);

// ============================================================
// 🚀 PATENT FEATURES: Enhanced Risk, Rainfall, Safe Zones
// ============================================================

// Default location (Pune, India) - will be updated from browser GPS
let userLocation = {
    latitude: 18.5204,
    longitude: 73.8567,
    city: 'Pune'
};

// 📍 Get user's real GPS location
function getUserLocation() {
    if (navigator.geolocation) {
        console.log('📍 Requesting GPS location...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    city: 'Current Location',
                    accuracy: position.coords.accuracy
                };
                console.log('✅ GPS location obtained:', userLocation);
                console.log(`📍 Coordinates: ${userLocation.latitude}, ${userLocation.longitude}`);
                console.log(`🎯 Accuracy: ${userLocation.accuracy} meters`);
                
                // Reload all location-dependent data
                loadSafeZones();
                loadRainfallForecast();
                
                // 🌧️ Fetch rainfall data for user's actual location
                fetchRainfallData();
            },
            (error) => {
                console.warn('⚠️ GPS error:', error.message);
                console.log('📍 Using default location: Pune, India');
                
                if (error.code === error.PERMISSION_DENIED) {
                    showNotification('GPS access denied. Using default location (Pune).', 'warning');
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    showNotification('GPS unavailable. Using default location.', 'warning');
                } else if (error.code === error.TIMEOUT) {
                    showNotification('GPS timeout. Using default location.', 'warning');
                }
                
                // 🌧️ Still fetch rainfall for default location
                fetchRainfallData();
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000  // Cache for 5 minutes
            }
        );
    } else {
        console.warn('⚠️ Geolocation not supported by browser');
        showNotification('GPS not supported. Using default location.', 'warning');
        
        // 🌧️ Fetch rainfall for default location
        fetchRainfallData();
    }
}

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // You can add visual notification UI here if needed
}

// 🌧️ Load Rainfall Forecast
async function loadRainfallForecast() {
    try {
        const response = await fetch(`/api/rainfall/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`);
        
        const data = await response.json();
        
        // Check if rainfall API is available
        if (data.available === false || !data.dailyForecasts || data.dailyForecasts.length === 0) {
            document.getElementById('rainfall-forecast-content').innerHTML = `
                <div style="text-align: center; opacity: 0.8; padding: 20px;">
                    <i class="fas fa-cloud-rain" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                    <div style="font-size: 1rem; margin-bottom: 5px;">Weather API Not Configured</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">
                        Add OpenWeather API key to enable rainfall predictions
                    </div>
                    <div style="font-size: 0.75rem; opacity: 0.6; margin-top: 10px;">
                        See SETUP_OPENWEATHER.md for instructions
                    </div>
                </div>
            `;
            return;
        }
        
        displayRainfallForecast(data);
    } catch (error) {
        console.error('Error loading rainfall forecast:', error);
        document.getElementById('rainfall-forecast-content').innerHTML = `
            <div style="text-align: center; opacity: 0.8; padding: 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <div>Weather API unavailable</div>
                <div style="font-size: 0.8rem; margin-top: 5px; opacity: 0.7;">
                    ${error.message}
                </div>
            </div>
        `;
    }
}

function displayRainfallForecast(data) {
    const container = document.getElementById('rainfall-forecast-content');
    
    if (!data || !data.dailyForecasts || data.dailyForecasts.length === 0) {
        container.innerHTML = '<div style="text-align: center; opacity: 0.8;">No forecast data</div>';
        return;
    }
    
    // Get first day's forecast
    const today = data.dailyForecasts[0];
    const totalRainfall = today.totalRainfall || 0;
    const maxIntensity = today.maxIntensity || 0;
    
    const riskLevel = today.riskLevel || (totalRainfall > 100 ? 'CRITICAL' : 
                     totalRainfall > 50 ? 'HIGH' : 
                     totalRainfall > 25 ? 'MODERATE' : 'MINIMAL');
    
    const riskColor = riskLevel === 'CRITICAL' ? '#ff4444' : 
                     riskLevel === 'HIGH' ? '#ff8800' : 
                     riskLevel === 'MODERATE' ? '#ffbb33' : '#00C851';
    
    // Get current weather from first forecast
    const currentWeather = today.forecasts && today.forecasts[0] ? today.forecasts[0] : null;
    
    container.innerHTML = `
        ${currentWeather ? `
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 5px;">Current Weather</div>
                <div style="font-size: 1.1rem; font-weight: 600; text-transform: capitalize;">${currentWeather.weather}</div>
                <div style="font-size: 2rem; font-weight: bold; margin: 5px 0;">${currentWeather.temperature.toFixed(1)}°C</div>
                <div style="font-size: 0.85rem; opacity: 0.8;">Humidity: ${currentWeather.humidity}% | Pressure: ${currentWeather.pressure} hPa</div>
            </div>
        ` : ''}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: bold;">${totalRainfall.toFixed(1)}</div>
                <div style="font-size: 0.8rem; opacity: 0.9;">mm in 24hrs</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: bold;">${maxIntensity.toFixed(1)}</div>
                <div style="font-size: 0.8rem; opacity: 0.9;">mm/hr peak</div>
            </div>
        </div>
        
        <div style="text-align: center; margin-bottom: 15px;">
            <div style="padding: 8px 16px; background: ${riskColor}; border-radius: 20px; display: inline-block; font-weight: 600;">
                ${riskLevel} RISK
            </div>
        </div>
        
        <div style="font-size: 0.85rem; opacity: 0.9;">
            <div style="font-weight: 600; margin-bottom: 8px;">📊 48-Hour Forecast:</div>
            ${data.dailyForecasts.slice(0, 2).map(day => {
                const date = new Date(day.date);
                return `
                    <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; margin: 8px 0;">
                        <div style="font-weight: 600; margin-bottom: 5px;">${date.toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'})}</div>
                        ${day.forecasts.slice(0, 4).map(f => {
                            const time = new Date(f.time);
                            return `
                                <div style="display: flex; justify-content: space-between; padding: 3px 5px; font-size: 0.8rem;">
                                    <span>${time.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}</span>
                                    <span>${f.temperature.toFixed(1)}°C</span>
                                    <span style="text-transform: capitalize;">${f.weather}</span>
                                    <span style="font-weight: 600; color: ${f.rainfall > 0 ? '#30cfd0' : 'inherit'}">${f.rainfall.toFixed(1)}mm</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }).join('')}
        </div>
        
        ${totalRainfall > 100 ? `
            <div style="margin-top: 15px; padding: 10px; background: rgba(255,68,68,0.2); border-radius: 8px; border-left: 4px solid #ff4444;">
                <strong>⚠️ GSI Warning:</strong> Rainfall exceeds 100mm/24hr landslide threshold!
            </div>
        ` : ''}
        
        <div style="font-size: 0.7rem; opacity: 0.6; text-align: center; margin-top: 15px;">
            📍 ${data.location ? data.location.name : 'Pune'} | Powered by OpenWeather
        </div>
    `;
}

// 🚀 Load Enhanced Risk Assessment
async function loadEnhancedRisk() {
    try {
        const response = await fetch(`/api/enhanced-risk?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`);
        
        if (!response.ok) {
            throw new Error('Enhanced risk unavailable');
        }
        
        const data = await response.json();
        displayEnhancedRisk(data);
    } catch (error) {
        console.error('Error loading enhanced risk:', error);
        document.getElementById('enhanced-risk-content').innerHTML = `
            <div style="text-align: center; opacity: 0.8; padding: 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <div>Enhanced risk unavailable</div>
                <div style="font-size: 0.8rem; margin-top: 5px; opacity: 0.7;">
                    Using sensor data only
                </div>
            </div>
        `;
    }
}

function displayEnhancedRisk(data) {
    const container = document.getElementById('enhanced-risk-content');
    
    if (!data) {
        container.innerHTML = '<div style="text-align: center; opacity: 0.8;">No risk data</div>';
        return;
    }
    
    // Safely get values with fallbacks
    const probability = data.probability !== undefined ? data.probability : 0;
    const sensorRisk = data.factors?.sensorRisk !== undefined ? data.factors.sensorRisk : 0;
    const rainfallRisk = data.factors?.rainfallRisk !== undefined ? data.factors.rainfallRisk : 0;
    const soilRisk = data.factors?.soilMoistureRisk !== undefined ? data.factors.soilMoistureRisk : 0;
    const weatherRisk = data.factors?.weatherRisk !== undefined ? data.factors.weatherRisk : 0;
    
    const riskColor = data.riskLevel === 'CRITICAL' ? '#ff4444' : 
                     data.riskLevel === 'HIGH' ? '#ff8800' : 
                     data.riskLevel === 'MODERATE' ? '#ffbb33' : 
                     data.riskLevel === 'LOW' ? '#00C851' : '#00bcd4';
    
    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 3.5rem; font-weight: bold; color: ${riskColor};">
                ${probability.toFixed(0)}%
            </div>
            <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 5px;">
                Combined Risk Probability
                ${data.rainfallAvailable === false ? '<br><span style="font-size: 0.75rem; opacity: 0.6;">(Weather data unavailable)</span>' : ''}
            </div>
            <div style="padding: 8px 16px; background: ${riskColor}; border-radius: 20px; display: inline-block; font-weight: 600; margin-top: 10px;">
                ${data.riskLevel}
            </div>
        </div>
        
        <div style="background: rgba(0,0,0,0.1); border-radius: 10px; padding: 15px; margin-bottom: 15px;">
            <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 10px;">🎯 Risk Breakdown:</div>
            <div style="display: grid; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>📊 Sensor Risk</span>
                    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; margin: 0 10px;">
                        <div style="height: 100%; background: #667eea; border-radius: 4px; width: ${sensorRisk}%;"></div>
                    </div>
                    <span style="font-weight: 600;">${sensorRisk.toFixed(1)}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>🌧️ Rainfall Risk</span>
                    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; margin: 0 10px;">
                        <div style="height: 100%; background: #30cfd0; border-radius: 4px; width: ${rainfallRisk}%;"></div>
                    </div>
                    <span style="font-weight: 600;">${rainfallRisk.toFixed(1)}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>💧 Soil Moisture</span>
                    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; margin: 0 10px;">
                        <div style="height: 100%; background: #fa709a; border-radius: 4px; width: ${soilRisk}%;"></div>
                    </div>
                    <span style="font-weight: 600;">${soilRisk.toFixed(1)}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>☁️ Weather Risk</span>
                    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; margin: 0 10px;">
                        <div style="height: 100%; background: #feca57; border-radius: 4px; width: ${weatherRisk}%;"></div>
                    </div>
                    <span style="font-weight: 600;">${weatherRisk.toFixed(1)}%</span>
                </div>
            </div>
        </div>
        
        ${data.recommendations && data.recommendations.length > 0 ? `
            <div style="background: rgba(255,193,7,0.15); border-radius: 8px; padding: 12px; border-left: 4px solid #ffc107; margin-top: 15px;">
                <div style="font-weight: 600; margin-bottom: 8px;">💡 Recommendations:</div>
                ${data.recommendations.map(rec => `<div style="font-size: 0.85rem; margin: 4px 0;">• ${rec}</div>`).join('')}
            </div>
        ` : ''}
        
        <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 15px; text-align: center;">
            Powered by AI + ${data.rainfallAvailable ? 'Weather Integration' : 'Sensor Data'} + Regional Calibration
        </div>
    `;
}

// Refresh functions
function refreshEnhancedRisk() {
    loadEnhancedRisk();
    addNotification('Enhanced risk refreshed', 'success');
}

function refreshRainfallForecast() {
    loadRainfallForecast();
    addNotification('Rainfall forecast refreshed', 'success');
}

// Auto-refresh every 5 minutes
setInterval(() => {
    loadEnhancedRisk();
    loadRainfallForecast();
}, 300000);

// Load on initialization
setTimeout(() => {
    loadEnhancedRisk();
    loadRainfallForecast();
}, 2000);

// 🌧️ Fetch Rainfall Data from OpenWeather API
let rainfallDataCache = null;
let rainfallLastFetch = 0;
const RAINFALL_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function fetchRainfallData() {
    // Use cache if available and fresh
    if (rainfallDataCache && (Date.now() - rainfallLastFetch) < RAINFALL_CACHE_DURATION) {
        updateRainfallDisplay(rainfallDataCache);
        return;
    }
    
    try {
        // 📍 Use user's GPS location for rainfall data
        const lat = userLocation.latitude;
        const lon = userLocation.longitude;
        const response = await fetch(`/api/rainfall/current?latitude=${lat}&longitude=${lon}`);
        if (!response.ok) {
            throw new Error('Failed to fetch rainfall data');
        }
        
        const data = await response.json();
        rainfallDataCache = data;
        rainfallLastFetch = Date.now();
        updateRainfallDisplay(data);
    } catch (error) {
        console.error('Error fetching rainfall data:', error);
        // Display "--" if API fails
        document.getElementById('rainfallValue').textContent = '--';
        document.getElementById('rainfall24h').textContent = '--';
        document.getElementById('rainfall48h').textContent = '--';
        document.getElementById('rainfallLocation').textContent = 'API Unavailable';
    }
}

function updateRainfallDisplay(data) {
    const rainfallValue = document.getElementById('rainfallValue');
    const rainfall24h = document.getElementById('rainfall24h');
    const rainfall48h = document.getElementById('rainfall48h');
    const rainfallLocation = document.getElementById('rainfallLocation');
    
    if (rainfallValue) {
        rainfallValue.textContent = data.currentIntensity?.toFixed(1) || '0.0';
    }
    
    if (rainfall24h) {
        rainfall24h.textContent = data.cumulative24h?.toFixed(1) || '0.0';
        // Color code based on threshold
        if (data.cumulative24h >= 100) {
            rainfall24h.style.color = '#ff4444'; // Red - Critical
        } else if (data.cumulative24h >= 50) {
            rainfall24h.style.color = '#ff9800'; // Orange - Warning
        } else {
            rainfall24h.style.color = '#4CAF50'; // Green - Normal
        }
    }
    
    if (rainfall48h) {
        rainfall48h.textContent = data.cumulative48h?.toFixed(1) || '0.0';
        // Color code based on threshold
        if (data.cumulative48h >= 150) {
            rainfall48h.style.color = '#ff4444'; // Red - Critical
        } else if (data.cumulative48h >= 75) {
            rainfall48h.style.color = '#ff9800'; // Orange - Warning
        } else {
            rainfall48h.style.color = '#4CAF50'; // Green - Normal
        }
    }
    
    if (rainfallLocation) {
        rainfallLocation.textContent = data.location || 'Unknown';
    }
}

// Fetch rainfall data every 10 minutes
setInterval(fetchRainfallData, RAINFALL_CACHE_DURATION);

// ========================================
// 🗺️ 3D TERRAIN MAPPING & WEAK POINT DETECTION
// ========================================

let terrainScene, terrainCamera, terrainRenderer, terrainMesh;
let weakPointMarkers = [];
let terrainData = { slopes: [], weakPoints: [] };
let deviceLocation = { lat: 30.0668, lon: 79.0193, elevation: 2500 };

function init3DTerrain() {
    const canvas = document.getElementById('terrain-3d-canvas');
    if (!canvas || typeof THREE === 'undefined') {
        console.warn('Three.js not loaded or canvas not found');
        return;
    }
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight || 500;
    
    terrainScene = new THREE.Scene();
    terrainScene.fog = new THREE.Fog(0x232526, 10, 50);
    
    terrainCamera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    terrainCamera.position.set(0, 8, 15);
    terrainCamera.lookAt(0, 0, 0);
    
    terrainRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    terrainRenderer.setSize(width, height);
    terrainRenderer.setClearColor(0x232526, 1);
    
    // Generate terrain
    generateTerrain();
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    terrainScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 5);
    terrainScene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x4CAF50, 0.8, 20);
    pointLight.position.set(0, 5, 0);
    terrainScene.add(pointLight);
    
    animate3DTerrain();
    
    // Update initial display
    updateTerrainDisplay();
}

function generateTerrain() {
    terrainData = { slopes: [], weakPoints: [] };
    
    const geometry = new THREE.PlaneGeometry(20, 20, 60, 60);
    const vertices = geometry.attributes.position.array;
    const colors = [];
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        
        // Create realistic slope terrain
        const baseSlope = y * 0.8;
        const noise1 = Math.sin(x * 0.3) * Math.cos(y * 0.4) * 1.5;
        const noise2 = Math.sin(x * 0.8 + y * 0.6) * 0.8;
        const roughness = Math.random() * 0.3;
        
        const elevation = baseSlope + noise1 + noise2 + roughness;
        vertices[i + 2] = elevation;
        
        // Calculate slope angle
        const dx = Math.abs(noise1);
        const dy = Math.abs(baseSlope);
        const slopeAngle = Math.atan2(Math.sqrt(dx*dx + dy*dy), 1) * (180 / Math.PI);
        
        terrainData.slopes.push({ x, y, elevation, slopeAngle });
        
        // Color based on slope angle (risk)
        let color;
        if (slopeAngle > 45) {
            color = new THREE.Color(0xff0000); // Critical - red
        } else if (slopeAngle > 30) {
            color = new THREE.Color(0xff4400); // High risk - orange
        } else if (slopeAngle > 15) {
            color = new THREE.Color(0xffaa00); // Moderate - yellow
        } else {
            color = new THREE.Color(0x00ff00); // Stable - green
        }
        
        colors.push(color.r, color.g, color.b);
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        wireframe: false,
        flatShading: true,
        shininess: 0
    });
    
    if (terrainMesh) {
        terrainScene.remove(terrainMesh);
    }
    
    terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.rotation.x = -Math.PI / 3;
    terrainScene.add(terrainMesh);
    
    // Identify and mark weak points
    identifyWeakPoints();
    createWeakPointMarkers();
}

function identifyWeakPoints() {
    terrainData.weakPoints = [];
    
    for (let i = 0; i < terrainData.slopes.length; i++) {
        const point = terrainData.slopes[i];
        
        const isSteep = point.slopeAngle > 35;
        const isHighElevation = point.elevation > 2;
        const geologicalRisk = Math.random() < 0.15;
        
        if (isSteep && (isHighElevation || geologicalRisk)) {
            terrainData.weakPoints.push({
                x: point.x,
                y: point.y,
                elevation: point.elevation,
                slopeAngle: point.slopeAngle,
                riskFactor: Math.min(100, point.slopeAngle * 2)
            });
        }
    }
    
    console.log(`🔍 Identified ${terrainData.weakPoints.length} weak points`);
}

function createWeakPointMarkers() {
    // Clear existing markers
    weakPointMarkers.forEach(marker => terrainScene.remove(marker));
    weakPointMarkers = [];
    
    // Create 3D markers for weak points
    terrainData.weakPoints.forEach(point => {
        const markerGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(point.x, point.y, point.elevation + 0.5);
        marker.rotation.x = -Math.PI / 3;
        
        terrainScene.add(marker);
        weakPointMarkers.push(marker);
        
        // Add warning pillar
        const pillarGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
        const pillarMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.4
        });
        
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(point.x, point.y, point.elevation + 1);
        pillar.rotation.x = -Math.PI / 3;
        
        terrainScene.add(pillar);
        weakPointMarkers.push(pillar);
    });
}

function animate3DTerrain() {
    requestAnimationFrame(animate3DTerrain);
    
    if (!terrainRenderer || !terrainScene || !terrainCamera) return;
    
    if (terrainMesh) {
        terrainMesh.rotation.z += 0.001;
    }
    
    // Animate weak point markers
    weakPointMarkers.forEach((marker, i) => {
        if (i % 2 === 0) { // Spheres
            marker.scale.set(
                1 + Math.sin(Date.now() * 0.005 + i) * 0.3,
                1 + Math.sin(Date.now() * 0.005 + i) * 0.3,
                1 + Math.sin(Date.now() * 0.005 + i) * 0.3
            );
            marker.material.opacity = 0.6 + Math.sin(Date.now() * 0.003 + i) * 0.4;
        }
    });
    
    terrainRenderer.render(terrainScene, terrainCamera);
}

function updateTerrainMap() {
    const deviceName = document.getElementById('terrain-device-name').value;
    const lat = parseFloat(document.getElementById('terrain-latitude').value);
    const lon = parseFloat(document.getElementById('terrain-longitude').value);
    const elev = parseFloat(document.getElementById('terrain-elevation').value);
    
    if (isNaN(lat) || isNaN(lon) || isNaN(elev)) {
        alert('ERROR: Invalid coordinates. Please enter numeric values.');
        return;
    }
    
    deviceLocation = { lat, lon, elevation: elev };
    
    // Determine region
    const region = determineRegionFromCoords(lat, lon);
    
    // Regenerate terrain
    generateTerrain();
    
    // Update display
    updateTerrainDisplay();
    
    // Send to server
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'location_update',
            deviceName,
            lat,
            lon,
            elevation: elev,
            weakPoints: terrainData.weakPoints.length
        }));
    }
    
    console.log(`📍 Terrain updated: ${region}, ${terrainData.weakPoints.length} weak points`);
}

function updateTerrainDisplay() {
    const lat = deviceLocation.lat;
    const lon = deviceLocation.lon;
    const region = determineRegionFromCoords(lat, lon);
    
    document.getElementById('terrain-coords-display').innerHTML = `
        <div style="font-weight: bold; margin-bottom: 3px;">COORDINATES LOCKED</div>
        <div>LAT: ${lat.toFixed(4)}°N | LON: ${lon.toFixed(4)}°E</div>
        <div>ZONE: <span id="terrain-region-name">${region.toUpperCase()}</span></div>
        <div style="margin-top: 5px; color: #ff9800;">
            <i class="fas fa-exclamation-triangle"></i> 
            WEAK POINTS: <span id="terrain-weak-count">${terrainData.weakPoints.length}</span>
        </div>
    `;
}

function determineRegionFromCoords(lat, lon) {
    if (lat >= 28 && lat <= 31 && lon >= 77 && lon <= 81) {
        return 'uttarakhand, india';
    } else if (lat >= 8 && lat <= 13 && lon >= 74 && lon <= 78) {
        return 'kerala, india';
    } else if (lat >= 17 && lat <= 21 && lon >= 72 && lon <= 77) {
        return 'maharashtra, india';
    } else if (lat >= 30 && lat <= 33 && lon >= 75 && lon <= 78) {
        return 'himachal pradesh, india';
    } else if (lat >= 24 && lat <= 27 && lon >= 87 && lon <= 92) {
        return 'west bengal, india';
    } else if (lat >= 12 && lat <= 16 && lon >= 74 && lon <= 78) {
        return 'karnataka, india';
    } else if (lat >= 25 && lat <= 26 && lon >= 90 && lon <= 92) {
        return 'meghalaya, india';
    } else if (lat >= 26.5 && lat <= 29.5 && lon >= 91 && lon <= 97) {
        return 'arunachal pradesh, india';
    } else if (lat >= 27 && lat <= 28.5 && lon >= 88 && lon <= 89) {
        return 'sikkim, india';
    } else {
        return 'unknown region';
    }
}

// Initialize terrain on page load
if (typeof THREE !== 'undefined') {
    setTimeout(() => {
        init3DTerrain();
    }, 1000); // Delay to ensure canvas is ready
}

// Handle window resize for terrain
window.addEventListener('resize', () => {
    if (terrainRenderer && terrainCamera) {
        const canvas = document.getElementById('terrain-3d-canvas');
        if (canvas) {
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight || 500;
            terrainRenderer.setSize(width, height);
            terrainCamera.aspect = width / height;
            terrainCamera.updateProjectionMatrix();
        }
    }
});

// 🔍 Search Bar Functionality

