# Mify Postman Testing Guide

This guide will help you test the complete Mify system using Postman to ensure all components work well together.

## 🚀 Quick Start

1. **Import the Collection**: Import `postman/postman_google_collection.json` into Postman
2. **Set up Environment**: Create a new environment with the variables below
3. **Run Tests**: Follow the testing sequence outlined in this guide

## 📋 Environment Variables

Create a new Postman environment with these variables:

```json
{
  "baseURL": "https://www.googleapis.com",
  "clientId": "40359737596-07dvjuh9kkcf7g9bsu7kia4k4idb7pci.apps.googleusercontent.com",
  "clientSecret": "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",
  "redirectUri": "https://medical-insights-for-you.github.io/auth/callback.html",
  "scope": "https://www.googleapis.com/auth/fitness.activity.read",
  "accessToken": "",
  "refreshToken": "",
  "websiteUrl": "https://medical-insights-for-you.github.io",
  "arduinoDataEndpoint": "http://localhost:3000/api/arduino-data"
}
```

## 🔄 Testing Sequence

### Phase 1: OAuth 2.0 Authentication Flow

#### 1.1 Get Authorization Code
```http
GET https://accounts.google.com/o/oauth2/v2/auth
?client_id={{clientId}}
&redirect_uri={{redirectUri}}
&scope={{scope}}
&response_type=code
&access_type=offline
&prompt=consent
```

**Expected Result**: Redirects to callback URL with authorization code

#### 1.2 Exchange Code for Tokens
```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id={{clientId}}
&client_secret={{clientSecret}}
&code={{authorizationCode}}
&grant_type=authorization_code
&redirect_uri={{redirectUri}}
```

**Expected Result**: Returns access_token and refresh_token

### Phase 2: Google Fit API Testing

#### 2.1 Test Data Sources
```http
GET {{baseURL}}/fitness/v1/users/me/dataSources
Authorization: Bearer {{accessToken}}
```

**Expected Result**: List of available data sources (steps, calories, activities)

#### 2.2 Fetch Health Data
```http
POST {{baseURL}}/fitness/v1/users/me/dataset:aggregate
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "aggregateBy": [
    {
      "dataTypeName": "com.google.step_count.delta"
    },
    {
      "dataTypeName": "com.google.calories.expended"
    },
    {
      "dataTypeName": "com.google.activity.segment"
    }
  ],
  "bucketByTime": {
    "durationMillis": 86400000
  },
  "startTimeMillis": {{startTime}},
  "endTimeMillis": {{endTime}}
}
```

**Expected Result**: Aggregated health data (steps, calories, activities)

### Phase 3: Arduino Data Simulation

#### 3.1 Simulate Arduino Health Data
```http
POST {{arduinoDataEndpoint}}
Content-Type: application/json

{
  "heartRate": 75,
  "movement": "Medium",
  "proximity": 15.3,
  "circuit": "Closed",
  "timestamp": {{currentTimestamp}},
  "deviceId": "arduino-001"
}
```

**Expected Result**: Success response with processed data

#### 3.2 Test Data Processing
```http
GET {{arduinoDataEndpoint}}/processed
```

**Expected Result**: List of processed health data with AI insights

### Phase 4: AI Integration Testing

#### 4.1 Test ASI:One Chat Integration
```http
GET {{websiteUrl}}/#ai-chat
```

**Expected Result**: ASI:One chat interface loads successfully

#### 4.2 Test AI Health Analysis
```http
POST {{websiteUrl}}/api/ai-analysis
Content-Type: application/json

{
  "healthData": {
    "heartRate": 75,
    "movement": "Medium",
    "proximity": 15.3,
    "circuit": "Closed"
  },
  "query": "Analyze my current health status"
}
```

**Expected Result**: AI-generated health insights and recommendations

### Phase 5: End-to-End Integration

#### 5.1 Complete Health Data Flow
1. **Get Google Fit Data** → Process with AI → Display on website
2. **Simulate Arduino Data** → Process with AI → Display on website
3. **Combine Both Data Sources** → Generate comprehensive insights

#### 5.2 Test Website Functionality
- [ ] Arduino Health section loads with demo charts
- [ ] Fitness Dashboard connects to Google Fit
- [ ] AI Chat interface responds to queries
- [ ] Demo analytics display correctly
- [ ] All navigation links work properly

## 🧪 Automated Testing Scripts

### Pre-request Scripts

Add this to your Postman collection's pre-request script:

```javascript
// Auto-refresh token if needed
if (pm.environment.get("accessToken")) {
    const tokenExpiry = pm.environment.get("tokenExpiry");
    const now = Date.now();
    
    if (tokenExpiry && now > tokenExpiry) {
        // Token expired, refresh it
        pm.sendRequest({
            url: 'https://oauth2.googleapis.com/token',
            method: 'POST',
            header: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: {
                mode: 'urlencoded',
                urlencoded: [
                    {key: 'client_id', value: pm.environment.get('clientId')},
                    {key: 'client_secret', value: pm.environment.get('clientSecret')},
                    {key: 'refresh_token', value: pm.environment.get('refreshToken')},
                    {key: 'grant_type', value: 'refresh_token'}
                ]
            }
        }, function (err, response) {
            if (response.json().access_token) {
                pm.environment.set('accessToken', response.json().access_token);
                pm.environment.set('tokenExpiry', Date.now() + (response.json().expires_in * 1000));
            }
        });
    }
}
```

### Test Scripts

Add this to your test scripts:

```javascript
// Test response status
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Test response time
pm.test("Response time is less than 2000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

// Test response format
pm.test("Response is JSON", function () {
    pm.response.to.be.json;
});

// Test specific data fields
pm.test("Response contains expected fields", function () {
    const jsonData = pm.response.json();
    
    if (pm.info.requestName === "Get Google Fit Data") {
        pm.expect(jsonData).to.have.property('dataSource');
    }
    
    if (pm.info.requestName === "Fetch Google Fit Data") {
        pm.expect(jsonData).to.have.property('bucket');
    }
});
```

## 🔍 Troubleshooting

### Common Issues

1. **OAuth Token Expired**
   - Solution: Use refresh token to get new access token
   - Check token expiry time in environment variables

2. **CORS Issues**
   - Solution: Ensure redirect URI matches exactly
   - Check that callback.html is accessible

3. **API Rate Limits**
   - Solution: Add delays between requests
   - Use batch requests when possible

4. **Arduino Connection Issues**
   - Solution: Check Web Serial API support in browser
   - Verify Arduino is connected and sending data

### Debug Steps

1. **Check Environment Variables**
   ```javascript
   console.log("Client ID:", pm.environment.get("clientId"));
   console.log("Access Token:", pm.environment.get("accessToken"));
   ```

2. **Log Response Data**
   ```javascript
   console.log("Response:", pm.response.json());
   ```

3. **Test Individual Components**
   - Test OAuth flow separately
   - Test Google Fit API with valid token
   - Test Arduino simulation independently

## 📊 Expected Results

### Successful Integration Indicators

- ✅ OAuth flow completes without errors
- ✅ Google Fit data is retrieved successfully
- ✅ Arduino data is processed and stored
- ✅ AI analysis generates meaningful insights
- ✅ Website displays all data correctly
- ✅ Demo charts render with sample data
- ✅ All navigation and interactions work smoothly

### Performance Benchmarks

- OAuth flow: < 5 seconds
- Google Fit API calls: < 2 seconds
- Arduino data processing: < 1 second
- AI analysis: < 3 seconds
- Website load time: < 3 seconds

## 🚀 Next Steps

After successful testing:

1. **Deploy to Production**: Ensure all environment variables are set correctly
2. **Monitor Performance**: Set up logging and monitoring
3. **User Testing**: Test with real users and real Arduino devices
4. **Optimize**: Based on test results, optimize slow components

## 📞 Support

If you encounter issues during testing:

1. Check the Postman console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your Google Cloud project has the necessary APIs enabled
4. Check that your Arduino is properly connected and sending data

---

**Happy Testing! 🎉**

This comprehensive testing approach ensures that all components of the Mify system work together seamlessly, from OAuth authentication to AI-powered health insights.
