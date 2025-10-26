/**
 * Chart Renderer for Arduino Data
 * 
 * This module handles real-time chart rendering of Arduino health data
 * using HTML5 Canvas for smooth performance.
 */

class ChartRenderer {
    constructor() {
        this.canvas = document.getElementById('live-chart');
        this.ctx = this.canvas.getContext('2d');
        this.isPaused = false;
        this.chartDuration = 60; // seconds
        this.maxDataPoints = 120; // 2 points per second for 60 seconds
        
        // Chart configuration
        this.config = {
            padding: { top: 20, right: 20, bottom: 40, left: 60 },
            colors: {
                heartRate: '#e94560',
                movement: '#00d4ff',
                proximity: '#00ff88',
                circuit: '#ffaa00',
                grid: '#e0e0e0',
                text: '#333333'
            },
            lineWidth: 2,
            pointRadius: 3
        };
        
        // Data storage
        this.chartData = {
            heartRate: [],
            movement: [],
            proximity: [],
            circuit: []
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.startRenderLoop();
        this.drawInitialChart();
    }
    
    setupCanvas() {
        // Set canvas size
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Handle resize
        window.addEventListener('resize', () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.drawChart();
        });
    }
    
    setupEventListeners() {
        // Chart duration setting
        const durationSelect = document.getElementById('chart-duration');
        if (durationSelect) {
            durationSelect.addEventListener('change', (e) => {
                this.chartDuration = parseInt(e.target.value);
                this.maxDataPoints = this.chartDuration * 2; // 2 points per second
                this.trimData();
            });
        }
    }
    
    startRenderLoop() {
        const render = () => {
            if (!this.isPaused) {
                this.drawChart();
            }
            requestAnimationFrame(render);
        };
        render();
    }
    
    updateChart(data) {
        if (this.isPaused) return;
        
        const timestamp = Date.now();
        
        // Add data points
        this.chartData.heartRate.push({ time: timestamp, value: data.heartRate });
        this.chartData.movement.push({ time: timestamp, value: this.movementToNumber(data.movement) });
        this.chartData.proximity.push({ time: timestamp, value: data.proximity });
        this.chartData.circuit.push({ time: timestamp, value: data.circuit === 'Closed' ? 1 : 0 });
        
        // Trim data to max points
        this.trimData();
    }
    
    movementToNumber(movement) {
        const levels = { 'Low': 1, 'Medium': 2, 'High': 3 };
        return levels[movement] || 0;
    }
    
    trimData() {
        Object.keys(this.chartData).forEach(key => {
            if (this.chartData[key].length > this.maxDataPoints) {
                this.chartData[key] = this.chartData[key].slice(-this.maxDataPoints);
            }
        });
    }
    
    drawInitialChart() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio);
        this.drawGrid();
        this.drawLabels();
    }
    
    drawChart() {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        // Clear canvas
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw data lines
        this.drawDataLine('heartRate', this.config.colors.heartRate, 50, 120);
        this.drawDataLine('movement', this.config.colors.movement, 0, 3);
        this.drawDataLine('proximity', this.config.colors.proximity, 5, 30);
        this.drawDataLine('circuit', this.config.colors.circuit, 0, 1);
        
        // Draw labels
        this.drawLabels();
        
        // Draw legend
        this.drawLegend();
    }
    
    drawGrid() {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const chartWidth = width - this.config.padding.left - this.config.padding.right;
        const chartHeight = height - this.config.padding.top - this.config.padding.bottom;
        
        this.ctx.strokeStyle = this.config.colors.grid;
        this.ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let i = 0; i <= 10; i++) {
            const x = this.config.padding.left + (chartWidth / 10) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.config.padding.top);
            this.ctx.lineTo(x, this.config.padding.top + chartHeight);
            this.ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = this.config.padding.top + (chartHeight / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(this.config.padding.left, y);
            this.ctx.lineTo(this.config.padding.left + chartWidth, y);
            this.ctx.stroke();
        }
    }
    
    drawDataLine(dataType, color, minValue, maxValue) {
        const data = this.chartData[dataType];
        if (data.length < 2) return;
        
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const chartWidth = width - this.config.padding.left - this.config.padding.right;
        const chartHeight = height - this.config.padding.top - this.config.padding.bottom;
        
        // Calculate time range
        const now = Date.now();
        const timeRange = this.chartDuration * 1000; // Convert to milliseconds
        const startTime = now - timeRange;
        
        // Filter data within time range
        const filteredData = data.filter(point => point.time >= startTime);
        
        if (filteredData.length < 2) return;
        
        // Draw line
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = this.config.lineWidth;
        this.ctx.beginPath();
        
        filteredData.forEach((point, index) => {
            const x = this.config.padding.left + ((point.time - startTime) / timeRange) * chartWidth;
            const y = this.config.padding.top + chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
        
        // Draw data points
        this.ctx.fillStyle = color;
        filteredData.forEach(point => {
            const x = this.config.padding.left + ((point.time - startTime) / timeRange) * chartWidth;
            const y = this.config.padding.top + chartHeight - ((point.value - minValue) / (maxValue - minValue)) * chartHeight;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.config.pointRadius, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }
    
    drawLabels() {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        this.ctx.fillStyle = this.config.colors.text;
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        
        // Y-axis labels
        const yLabels = [
            { value: 120, label: '120' },
            { value: 90, label: '90' },
            { value: 60, label: '60' },
            { value: 30, label: '30' },
            { value: 0, label: '0' }
        ];
        
        yLabels.forEach(label => {
            const y = this.config.padding.top + ((120 - label.value) / 120) * (height - this.config.padding.top - this.config.padding.bottom);
            this.ctx.fillText(label.label, this.config.padding.left - 10, y + 4);
        });
        
        // X-axis label
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Time (seconds)', width / 2, height - 10);
        
        // Y-axis label
        this.ctx.save();
        this.ctx.translate(15, height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('Values', 0, 0);
        this.ctx.restore();
    }
    
    drawLegend() {
        const width = this.canvas.width / window.devicePixelRatio;
        const legendItems = [
            { name: 'Heart Rate (BPM)', color: this.config.colors.heartRate },
            { name: 'Movement Level', color: this.config.colors.movement },
            { name: 'Proximity (cm)', color: this.config.colors.proximity },
            { name: 'Circuit Status', color: this.config.colors.circuit }
        ];
        
        const legendWidth = 200;
        const legendHeight = 80;
        const legendX = width - legendWidth - 20;
        const legendY = 20;
        
        // Legend background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
        
        this.ctx.strokeStyle = this.config.colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
        
        // Legend items
        this.ctx.font = '11px Inter, sans-serif';
        this.ctx.textAlign = 'left';
        
        legendItems.forEach((item, index) => {
            const itemY = legendY + 20 + (index * 15);
            
            // Color line
            this.ctx.strokeStyle = item.color;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(legendX + 10, itemY);
            this.ctx.lineTo(legendX + 30, itemY);
            this.ctx.stroke();
            
            // Label
            this.ctx.fillStyle = this.config.colors.text;
            this.ctx.fillText(item.name, legendX + 35, itemY + 4);
        });
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-chart');
        if (pauseBtn) {
            pauseBtn.innerHTML = this.isPaused ? 
                '<ion-icon name="play-outline"></ion-icon>Resume' : 
                '<ion-icon name="pause-outline"></ion-icon>Pause';
        }
    }
    
    clearChart() {
        this.chartData = {
            heartRate: [],
            movement: [],
            proximity: [],
            circuit: []
        };
        this.drawInitialChart();
    }
    
    // Public methods
    getChartData() {
        return this.chartData;
    }
    
    exportChart() {
        const dataUrl = this.canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `arduino-chart-${new Date().toISOString().slice(0, 19)}.png`;
        a.click();
    }
}

// Initialize chart renderer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chartRenderer = new ChartRenderer();
});
