// ============================================
// MAIN JAVASCRIPT FOR MIFY WEBSITE
// ============================================

function initLogoAnimation() {
    const logo = document.querySelector('.logo');
    
    // Add initial animation class after a short delay
    setTimeout(() => {
        logo.classList.add('initial-animation');
        
        // Remove the class after animation completes to return to normal state
        setTimeout(() => {
            logo.classList.remove('initial-animation');
        }, 1200); // 1.2 seconds - slightly longer than the 0.6s transition
    }, 500); // Small delay to ensure page is loaded
}

// Initialize stats animation
function initStatsAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                console.log('Stats section is visible, starting animations');
                
                // Animate trend lines first
                const trendLines = entry.target.querySelectorAll('.trend-line');
                console.log('Found trend lines:', trendLines.length);
                trendLines.forEach((line, index) => {
                    setTimeout(() => {
                        line.classList.add('animate');
                        console.log('Animated trend line', index);
                    }, index * 300);
                });

                // Animate data points
                const dataPoints = entry.target.querySelectorAll('.data-point');
                console.log('Found data points:', dataPoints.length);
                dataPoints.forEach((point, index) => {
                    setTimeout(() => {
                        point.classList.add('animate');
                        console.log('Animated data point', index);
                    }, 600 + (index * 150));
                });

                // Animate pie charts
                const pieSlices = entry.target.querySelectorAll('.pie-slice');
                console.log('Found pie slices:', pieSlices.length);
                pieSlices.forEach((slice, index) => {
                    setTimeout(() => {
                        slice.classList.add('animate');
                        console.log('Animated pie slice', index);
                    }, 1000 + (index * 200));
                });

                // Animate histogram bars
                const histogramBars = entry.target.querySelectorAll('.histogram-bar');
                console.log('Found histogram bars:', histogramBars.length);
                histogramBars.forEach((bar, index) => {
                    setTimeout(() => {
                        bar.classList.add('animate');
                        console.log('Animated histogram bar', index);
                    }, 1500 + (index * 100));
                });
            }
        });
    }, { threshold: 0.1 });

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        console.log('Observing stats section');
        observer.observe(statsSection);
    } else {
        console.log('Stats section not found');
    }
}

// Toggle data sources visibility
function toggleDataSources() {
    const dataSources = document.querySelector('.data-sources');
    const button = document.querySelector('.view-data-btn');
    
    if (dataSources.style.display === 'none') {
        dataSources.style.display = 'block';
        button.textContent = 'Hide Data Sources';
    } else {
        dataSources.style.display = 'none';
        button.textContent = 'View Detailed Data Sources';
    }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
    initLogoAnimation();
    initStatsAnimation();
});
