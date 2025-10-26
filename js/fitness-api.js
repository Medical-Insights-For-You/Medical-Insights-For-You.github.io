// ============================================
// GOOGLE FITNESS API INTEGRATION
// ============================================

class GoogleFitnessAPI {
    constructor() {
        this.clientId = '40359737596-07dvjuh9kkcf7g9bsu7kia4k4idb7pci.apps.googleusercontent.com';
        this.clientSecret = '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';
        this.redirectUri = `${window.location.origin}/auth/callback.html`;
        this.scope = 'https://www.googleapis.com/auth/fitness.activity.read';
        this.baseURL = 'https://www.googleapis.com/fitness/v1';
        this.accessToken = localStorage.getItem('google_fitness_token');
        this.tokenExpiry = localStorage.getItem('google_fitness_token_expiry');
    }

    // Check if user is authenticated
    isAuthenticated() {
        if (!this.accessToken) return false;
        if (this.tokenExpiry && Date.now() > Number.parseInt(this.tokenExpiry)) {
            this.logout();
            return false;
        }
        return true;
    }

    // Check for stored auth code and exchange it for token
    async checkForStoredAuthCode() {
        const authCode = localStorage.getItem('google_auth_code');
        const authState = localStorage.getItem('google_auth_state');
        
        if (authCode && authState) {
            try {
                await this.exchangeCodeForToken(authCode);
                // Clear the stored code after successful exchange
                localStorage.removeItem('google_auth_code');
                localStorage.removeItem('google_auth_state');
                return true;
            } catch (error) {
                console.error('Failed to exchange auth code:', error);
                // Clear invalid codes
                localStorage.removeItem('google_auth_code');
                localStorage.removeItem('google_auth_state');
                return false;
            }
        }
        return false;
    }

    // Initiate OAuth flow
    authenticate() {
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', this.scope);
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');

        // Store state for security
        const state = Math.random().toString(36).substring(7);
        localStorage.setItem('oauth_state', state);
        authUrl.searchParams.set('state', state);

        window.location.href = authUrl.toString();
    }

    // Handle OAuth callback (would be called from callback page)
    handleCallback(code, state) {
        const storedState = localStorage.getItem('oauth_state');
        if (state !== storedState) {
            throw new Error('Invalid state parameter');
        }

        return this.exchangeCodeForToken(code);
    }

    // Exchange authorization code for access token
    async exchangeCodeForToken(code) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to exchange code for token');
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);

        // Store in localStorage
        localStorage.setItem('google_fitness_token', this.accessToken);
        localStorage.setItem('google_fitness_token_expiry', this.tokenExpiry.toString());

        return data;
    }

    // Make authenticated request to Google Fitness API
    async makeRequest(endpoint, options = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated. Please log in first.');
        }

        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            // Token expired, need to re-authenticate
            this.logout();
            throw new Error('Authentication expired. Please log in again.');
        }

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // Get available data sources
    async getDataSources() {
        return this.makeRequest('/users/me/dataSources');
    }

    // Get aggregated fitness data
    async getFitnessData(startTime, endTime) {
        const requestBody = {
            aggregateBy: [
                { dataTypeName: 'com.google.step_count.delta' },
                { dataTypeName: 'com.google.calories.expended' },
                { dataTypeName: 'com.google.activity.segment' }
            ],
            bucketByTime: {
                durationMillis: 86400000 // 1 day buckets
            },
            startTimeMillis: startTime,
            endTimeMillis: endTime
        };

        return this.makeRequest('/users/me/dataset:aggregate', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
    }

    // Get fitness data for the last N days
    async getRecentFitnessData(days = 7) {
        const endTime = Date.now();
        const startTime = endTime - (days * 24 * 60 * 60 * 1000);
        return this.getFitnessData(startTime, endTime);
    }

    // Logout and clear stored tokens
    logout() {
        this.accessToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem('google_fitness_token');
        localStorage.removeItem('google_fitness_token_expiry');
        localStorage.removeItem('oauth_state');
    }

    // Parse fitness data into a more usable format
    parseFitnessData(data) {
        const result = {
            steps: [],
            calories: [],
            activities: []
        };

        if (data.bucket) {
            data.bucket.forEach(bucket => {
                const date = new Date(parseInt(bucket.startTimeMillis));
                
                // Parse steps data
                if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
                    bucket.dataset[0].point.forEach(point => {
                        if (point.originDataSourceId.includes('step_count')) {
                            result.steps.push({
                                date: date,
                                value: point.value[0].intVal || 0
                            });
                        }
                    });
                }

                // Parse calories data
                if (bucket.dataset && bucket.dataset[1] && bucket.dataset[1].point) {
                    bucket.dataset[1].point.forEach(point => {
                        if (point.originDataSourceId.includes('calories')) {
                            result.calories.push({
                                date: date,
                                value: point.value[0].fpVal || 0
                            });
                        }
                    });
                }

                // Parse activity data
                if (bucket.dataset && bucket.dataset[2] && bucket.dataset[2].point) {
                    bucket.dataset[2].point.forEach(point => {
                        if (point.originDataSourceId.includes('activity')) {
                            result.activities.push({
                                date: date,
                                activity: point.value[0].intVal || 0,
                                duration: point.endTimeNanos - point.startTimeNanos
                            });
                        }
                    });
                }
            });
        }

        return result;
    }
}

// ============================================
// FITNESS DASHBOARD MANAGER
// ============================================

class FitnessDashboard {
    constructor() {
        this.api = new GoogleFitnessAPI();
        this.charts = {};
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthenticationStatus();
    }

    setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('fitness-login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }

        // Logout button
        const logoutBtn = document.getElementById('fitness-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Refresh data button
        const refreshBtn = document.getElementById('fitness-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadFitnessData());
        }

        // Date range selector
        const dateRangeSelect = document.getElementById('fitness-date-range');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', (e) => {
                this.loadFitnessData(Number.parseInt(e.target.value));
            });
        }
    }

    async checkAuthenticationStatus() {
        const loginSection = document.getElementById('fitness-login-section');
        const dashboardSection = document.getElementById('fitness-dashboard-section');

        // First check if we have a stored auth code to exchange
        const hasStoredCode = await this.api.checkForStoredAuthCode();
        
        if (this.api.isAuthenticated()) {
            if (loginSection) loginSection.style.display = 'none';
            if (dashboardSection) dashboardSection.style.display = 'block';
            this.loadFitnessData();
        } else {
            if (loginSection) loginSection.style.display = 'block';
            if (dashboardSection) dashboardSection.style.display = 'none';
        }
    }

    async handleLogin() {
        try {
            this.showLoading('Connecting to Google Fit...');
            this.api.authenticate();
        } catch (error) {
            this.showError(`Failed to initiate login: ${error.message}`);
        }
    }

    handleLogout() {
        this.api.logout();
        this.checkAuthenticationStatus();
        this.showSuccess('Logged out successfully');
    }

    async loadFitnessData(days = 7) {
        try {
            this.showLoading('Loading fitness data...');
            
            const data = await this.api.getRecentFitnessData(days);
            const parsedData = this.api.parseFitnessData(data);
            
            this.displayFitnessData(parsedData);
            this.hideLoading();
            
        } catch (error) {
            this.hideLoading();
            this.showError(`Failed to load fitness data: ${error.message}`);
        }
    }

    displayFitnessData(data) {
        this.displayStepsChart(data.steps);
        this.displayCaloriesChart(data.calories);
        this.displayActivitySummary(data.activities);
        this.displayStats(data);
    }

    displayStepsChart(stepsData) {
        const container = document.getElementById('steps-chart');
        if (!container) return;

        // Calculate total steps
        const totalSteps = stepsData.reduce((sum, day) => sum + day.value, 0);
        const avgSteps = Math.round(totalSteps / stepsData.length);

        // Create simple bar chart
        container.innerHTML = `
            <div class="chart-header">
                <h3>Daily Steps</h3>
                <div class="chart-stats">
                    <span class="stat">Total: ${totalSteps.toLocaleString()}</span>
                    <span class="stat">Avg: ${avgSteps.toLocaleString()}</span>
                </div>
            </div>
            <div class="chart-container">
                ${stepsData.map(day => `
                    <div class="chart-bar">
                        <div class="bar" style="height: ${Math.min(100, (day.value / Math.max(...stepsData.map(d => d.value))) * 100)}%"></div>
                        <div class="bar-label">${day.date.toLocaleDateString()}</div>
                        <div class="bar-value">${day.value.toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    displayCaloriesChart(caloriesData) {
        const container = document.getElementById('calories-chart');
        if (!container) return;

        const totalCalories = caloriesData.reduce((sum, day) => sum + day.value, 0);
        const avgCalories = Math.round(totalCalories / caloriesData.length);

        container.innerHTML = `
            <div class="chart-header">
                <h3>Daily Calories</h3>
                <div class="chart-stats">
                    <span class="stat">Total: ${totalCalories.toLocaleString()}</span>
                    <span class="stat">Avg: ${avgCalories.toLocaleString()}</span>
                </div>
            </div>
            <div class="chart-container">
                ${caloriesData.map(day => `
                    <div class="chart-bar">
                        <div class="bar calories" style="height: ${Math.min(100, (day.value / Math.max(...caloriesData.map(d => d.value))) * 100)}%"></div>
                        <div class="bar-label">${day.date.toLocaleDateString()}</div>
                        <div class="bar-value">${Math.round(day.value).toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    displayActivitySummary(activitiesData) {
        const container = document.getElementById('activity-summary');
        if (!container) return;

        // Group activities by type
        const activityTypes = {};
        activitiesData.forEach(activity => {
            const type = this.getActivityTypeName(activity.activity);
            if (!activityTypes[type]) {
                activityTypes[type] = 0;
            }
            activityTypes[type] += activity.duration;
        });

        container.innerHTML = `
            <h3>Activity Summary</h3>
            <div class="activity-list">
                ${Object.entries(activityTypes).map(([type, duration]) => `
                    <div class="activity-item">
                        <span class="activity-type">${type}</span>
                        <span class="activity-duration">${this.formatDuration(duration)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    displayStats(data) {
        const container = document.getElementById('fitness-stats');
        if (!container) return;

        const totalSteps = data.steps.reduce((sum, day) => sum + day.value, 0);
        const totalCalories = data.calories.reduce((sum, day) => sum + day.value, 0);
        const avgSteps = Math.round(totalSteps / data.steps.length);
        const avgCalories = Math.round(totalCalories / data.calories.length);

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">👟</div>
                <div class="stat-content">
                    <div class="stat-value">${totalSteps.toLocaleString()}</div>
                    <div class="stat-label">Total Steps</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🔥</div>
                <div class="stat-content">
                    <div class="stat-value">${totalCalories.toLocaleString()}</div>
                    <div class="stat-label">Total Calories</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-content">
                    <div class="stat-value">${avgSteps.toLocaleString()}</div>
                    <div class="stat-label">Avg Steps/Day</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚡</div>
                <div class="stat-content">
                    <div class="stat-value">${avgCalories.toLocaleString()}</div>
                    <div class="stat-label">Avg Calories/Day</div>
                </div>
            </div>
        `;
    }

    getActivityTypeName(activityCode) {
        const activityMap = {
            0: 'In Vehicle',
            1: 'Biking',
            2: 'Still',
            3: 'Unknown',
            4: 'Tilting',
            5: 'Walking',
            6: 'Running',
            7: 'Aerobics',
            8: 'Badminton',
            9: 'Baseball',
            10: 'Basketball',
            11: 'Biathlon',
            12: 'Handbiking',
            13: 'Mountain Biking',
            14: 'Boxing',
            15: 'Calisthenics',
            16: 'Circuit Training',
            17: 'Cricket',
            18: 'Crossfit',
            19: 'Curling',
            20: 'Dancing',
            21: 'Elliptical',
            22: 'Ergometer',
            23: 'Fencing',
            24: 'Football (American)',
            25: 'Football (Australian)',
            26: 'Football (Soccer)',
            27: 'Frisbee',
            28: 'Gardening',
            29: 'Golf',
            30: 'Gymnastics',
            31: 'Handball',
            32: 'Hiking',
            33: 'Hockey',
            34: 'Horseback Riding',
            35: 'Housework',
            36: 'Ice Skating',
            37: 'In Vehicle',
            38: 'Jumping Rope',
            39: 'Kayaking',
            40: 'Kettlebell Training',
            41: 'Kickboxing',
            42: 'Kitesurfing',
            43: 'Martial Arts',
            44: 'Meditation',
            45: 'Mixed Martial Arts',
            46: 'P90X Exercises',
            47: 'Paragliding',
            48: 'Pilates',
            49: 'Polo',
            50: 'Racquetball',
            51: 'Rock Climbing',
            52: 'Rowing',
            53: 'Rowing Machine',
            54: 'Rugby',
            55: 'Running',
            56: 'Jogging',
            57: 'Running on Sand',
            58: 'Running (Treadmill)',
            59: 'Sailing',
            60: 'Self Defense',
            61: 'Skateboarding',
            62: 'Skating',
            63: 'Cross Skating',
            64: 'Indoor Skating',
            65: 'Inline Skating (Rollerblading)',
            66: 'Skiing',
            67: 'Back-Country Skiing',
            68: 'Cross-Country Skiing',
            69: 'Downhill Skiing',
            70: 'Kite Skiing',
            71: 'Roller Skiing',
            72: 'Sledding',
            73: 'Sleeping',
            74: 'Light Sleep',
            75: 'Deep Sleep',
            76: 'REM Sleep',
            77: 'Awake (during sleep cycle)',
            78: 'Snowboarding',
            79: 'Snowmobile',
            80: 'Snowshoeing',
            81: 'Squash',
            82: 'Stair Climbing',
            83: 'Stair-Climbing Machine',
            84: 'Stand-Up Paddleboarding',
            85: 'Strength Training',
            86: 'Surfing',
            87: 'Swimming',
            88: 'Swimming (open water)',
            89: 'Swimming (swimming pool)',
            90: 'Table Tennis (Ping Pong)',
            91: 'Team Sports',
            92: 'Tennis',
            93: 'Treadmill (Walking or Running)',
            94: 'Unknown (unable to detect activity)',
            95: 'Volleyball',
            96: 'Volleyball (Beach)',
            97: 'Volleyball (Indoor)',
            98: 'Wakeboarding',
            99: 'Walking (Fitness)',
            100: 'Nording Walking',
            101: 'Walking (Treadmill)',
            102: 'Waterpolo',
            103: 'Weightlifting',
            104: 'Wheelchair',
            105: 'Windsurfing',
            106: 'Yoga',
            107: 'Zumba'
        };
        return activityMap[activityCode] || 'Unknown Activity';
    }

    formatDuration(nanoseconds) {
        const seconds = Math.floor(nanoseconds / 1000000000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    showLoading(message) {
        const loadingEl = document.getElementById('fitness-loading');
        if (loadingEl) {
            loadingEl.textContent = message;
            loadingEl.style.display = 'block';
        }
    }

    hideLoading() {
        const loadingEl = document.getElementById('fitness-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    showError(message) {
        const errorEl = document.getElementById('fitness-error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        }
    }

    showSuccess(message) {
        const successEl = document.getElementById('fitness-success');
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.fitnessDashboard = new FitnessDashboard();
    await window.fitnessDashboard.init();
});
