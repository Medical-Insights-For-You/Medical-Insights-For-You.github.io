/**
 * Demo Analytics JavaScript
 * 
 * This module generates sample health data visualizations and charts
 * to demonstrate what the Arduino health monitoring system would produce.
 */

class DemoAnalytics {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createCharts());
        } else {
            this.createCharts();
        }
    }

    createCharts() {
        this.createHeartRateChart();
        this.createMovementChart();
        this.createProximityChart();
        this.animateHealthScore();
    }

    createHeartRateChart() {
        const canvas = document.getElementById('heartRateChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Generate sample heart rate data (24 hours)
        const data = this.generateHeartRateData();
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set up chart
        const padding = 40;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        
        // Draw grid
        this.drawGrid(ctx, padding, chartWidth, chartHeight);
        
        // Draw heart rate line
        this.drawHeartRateLine(ctx, data, padding, chartWidth, chartHeight);
        
        // Draw labels
        this.drawChartLabels(ctx, 'Heart Rate (BPM)', padding, chartWidth, chartHeight);
    }

    createMovementChart() {
        const canvas = document.getElementById('movementChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Generate sample movement data
        const data = this.generateMovementData();
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set up chart
        const padding = 40;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        
        // Draw grid
        this.drawGrid(ctx, padding, chartWidth, chartHeight);
        
        // Draw movement bars
        this.drawMovementBars(ctx, data, padding, chartWidth, chartHeight);
        
        // Draw labels
        this.drawChartLabels(ctx, 'Movement Level', padding, chartWidth, chartHeight);
    }

    createProximityChart() {
        const canvas = document.getElementById('proximityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Generate sample proximity data
        const data = this.generateProximityData();
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set up chart
        const padding = 40;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);
        
        // Draw grid
        this.drawGrid(ctx, padding, chartWidth, chartHeight);
        
        // Draw proximity line
        this.drawProximityLine(ctx, data, padding, chartWidth, chartHeight);
        
        // Draw labels
        this.drawChartLabels(ctx, 'Distance (cm)', padding, chartWidth, chartHeight);
    }

    generateHeartRateData() {
        const data = [];
        const baseRate = 70;
        
        for (let i = 0; i < 24; i++) {
            // Simulate daily heart rate pattern
            let rate = baseRate;
            
            // Morning: slightly elevated
            if (i >= 6 && i < 9) {
                rate += Math.random() * 10 + 5;
            }
            // Afternoon: normal
            else if (i >= 9 && i < 17) {
                rate += Math.random() * 8 - 4;
            }
            // Evening: elevated from activity
            else if (i >= 17 && i < 21) {
                rate += Math.random() * 15 + 10;
            }
            // Night: lower resting rate
            else {
                rate += Math.random() * 6 - 8;
            }
            
            data.push(Math.max(50, Math.min(120, Math.round(rate))));
        }
        
        return data;
    }

    generateMovementData() {
        const data = [];
        
        for (let i = 0; i < 12; i++) {
            // Simulate movement levels (0-100)
            let movement = 0;
            
            // Active periods
            if (i >= 2 && i < 4) movement = Math.random() * 30 + 20; // Morning activity
            else if (i >= 6 && i < 8) movement = Math.random() * 40 + 30; // Afternoon activity
            else if (i >= 10 && i < 12) movement = Math.random() * 50 + 40; // Evening activity
            else movement = Math.random() * 15; // Rest periods
            
            data.push(Math.round(movement));
        }
        
        return data;
    }

    generateProximityData() {
        const data = [];
        const baseDistance = 20;
        
        for (let i = 0; i < 24; i++) {
            // Simulate proximity changes (5-30 cm)
            let distance = baseDistance;
            
            // Close proximity during work hours (poor posture)
            if (i >= 9 && i < 17) {
                distance = Math.random() * 10 + 8;
            }
            // Normal distance during other times
            else {
                distance = Math.random() * 15 + 15;
            }
            
            data.push(Math.round(distance * 10) / 10);
        }
        
        return data;
    }

    drawGrid(ctx, padding, width, height) {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = padding + (width / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, padding + height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + width, y);
            ctx.stroke();
        }
    }

    drawHeartRateLine(ctx, data, padding, width, height) {
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (width / (data.length - 1)) * index;
            const y = padding + height - ((value - 50) / 70) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#e94560';
        data.forEach((value, index) => {
            const x = padding + (width / (data.length - 1)) * index;
            const y = padding + height - ((value - 50) / 70) * height;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    drawMovementBars(ctx, data, padding, width, height) {
        const barWidth = width / data.length * 0.8;
        const barSpacing = width / data.length * 0.2;
        
        data.forEach((value, index) => {
            const x = padding + (width / data.length) * index + barSpacing / 2;
            const barHeight = (value / 100) * height;
            const y = padding + height - barHeight;
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, '#00d4ff');
            gradient.addColorStop(1, '#0099cc');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth, barHeight);
        });
    }

    drawProximityLine(ctx, data, padding, width, height) {
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + (width / (data.length - 1)) * index;
            const y = padding + height - ((value - 5) / 25) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#00ff88';
        data.forEach((value, index) => {
            const x = padding + (width / (data.length - 1)) * index;
            const y = padding + height - ((value - 5) / 25) * height;
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    drawChartLabels(ctx, title, padding, width, height) {
        ctx.fillStyle = '#666';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, padding + width / 2, padding + height + 30);
    }

    animateHealthScore() {
        const scoreElements = document.querySelectorAll('.score-fill');
        
        scoreElements.forEach((element, index) => {
            setTimeout(() => {
                element.style.width = element.style.width;
                element.style.animation = 'fillAnimation 1s ease-out';
            }, index * 200);
        });
    }
}

// Initialize demo analytics when the page loads
new DemoAnalytics();

// Add CSS animation for score bars
const style = document.createElement('style');
style.textContent = `
    @keyframes fillAnimation {
        from { width: 0%; }
        to { width: var(--target-width); }
    }
`;
document.head.appendChild(style);