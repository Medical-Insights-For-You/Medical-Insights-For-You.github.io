# Mify Fitness Dashboard Integration

This document describes the Google Fitness API integration that has been added to the Mify frontend, based on the existing Postman collection.

## Overview

The fitness dashboard allows users to connect their Google Fit account and view personalized health insights including:
- Daily step counts
- Calories burned
- Activity summaries
- AI-powered health recommendations

## Files Added/Modified

### New Files
- `js/fitness-api.js` - Main API integration and dashboard logic
- `auth/callback.html` - OAuth callback handler
- `test-fitness.html` - Testing interface for the integration
- `FITNESS_INTEGRATION.md` - This documentation

### Modified Files
- `index.html` - Added fitness dashboard section and navigation
- `css/styles.css` - Added fitness dashboard styling
- `js/main.js` - No changes needed (existing functionality preserved)

## Features

### 1. OAuth 2.0 Authentication
- Secure Google OAuth 2.0 flow
- Automatic token management
- Token refresh handling
- Secure credential storage

### 2. Data Visualization
- Interactive step count charts
- Calories burned visualization
- Activity type summaries
- Statistical overview cards

### 3. AI Insights
- Activity trend analysis
- Health score calculation
- Personalized recommendations
- Progress tracking

### 4. Responsive Design
- Mobile-friendly interface
- Adaptive layouts
- Touch-friendly controls
- Consistent with existing design system

## API Configuration

The integration uses the same Google Cloud credentials from the Postman collection:

```javascript
const config = {
    clientId: '1059140530421-kbdp5vbd6ef9nrqlrskdnholmr5fu935.apps.googleusercontent.com',
    clientSecret: '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',
    scope: 'https://www.googleapis.com/auth/fitness.activity.read',
    baseURL: 'https://www.googleapis.com/fitness/v1'
};
```

## Usage

### 1. Access the Dashboard
Navigate to the "Fitness Dashboard" section from the main navigation or visit `#fitness-dashboard`.

### 2. Connect Google Fit
Click "Connect Google Fit" to initiate the OAuth flow. You'll be redirected to Google's authentication page.

### 3. View Your Data
Once authenticated, the dashboard will display:
- Overview statistics
- Daily step charts
- Calorie burn graphs
- Activity summaries
- AI-generated insights

### 4. Manage Data
- Change date ranges (7, 14, or 30 days)
- Refresh data manually
- Disconnect account when done

## API Endpoints Used

Based on the Postman collection, the integration uses:

1. **Data Sources**: `GET /fitness/v1/users/me/dataSources`
   - Verifies connectivity and available data sources

2. **Aggregated Data**: `POST /fitness/v1/users/me/dataset:aggregate`
   - Fetches steps, calories, and activity data
   - Supports configurable time ranges

## Data Types Supported

- `com.google.step_count.delta` - Daily step counts
- `com.google.calories.expended` - Calories burned
- `com.google.activity.segment` - Activity types and durations

## Security Considerations

1. **Client-Side Storage**: Tokens are stored in localStorage (consider server-side storage for production)
2. **HTTPS Required**: OAuth flow requires HTTPS in production
3. **Token Expiry**: Automatic handling of expired tokens
4. **Scope Limitation**: Only requests fitness activity read permissions

## Testing

Use the `test-fitness.html` file to test the integration:

1. Open `test-fitness.html` in your browser
2. Run individual test functions
3. Verify API configuration
4. Test authentication flow
5. Validate data fetching

## Browser Compatibility

- Modern browsers with ES6+ support
- LocalStorage support required
- Fetch API support required
- CSS Grid and Flexbox support recommended

## Future Enhancements

1. **Server-Side Integration**: Move OAuth flow to backend
2. **Data Persistence**: Store user data in database
3. **Advanced Analytics**: More sophisticated health insights
4. **Export Features**: PDF reports and data export
5. **Goal Setting**: User-defined fitness goals
6. **Social Features**: Share progress with healthcare providers

## Troubleshooting

### Common Issues

1. **Authentication Fails**
   - Check Google Cloud Console configuration
   - Verify redirect URI matches exactly
   - Ensure HTTPS in production

2. **No Data Displayed**
   - Verify Google Fit has data for the selected time range
   - Check browser console for API errors
   - Ensure proper OAuth scopes

3. **Charts Not Rendering**
   - Check CSS is loading properly
   - Verify JavaScript errors in console
   - Test with mock data first

### Debug Mode

Enable debug logging by opening browser console and running:
```javascript
localStorage.setItem('debug', 'true');
```

## Integration with Existing Postman Collection

This frontend integration directly uses the same:
- OAuth 2.0 configuration
- API endpoints
- Request/response formats
- Data parsing logic

The Postman collection can be used to:
- Test API endpoints independently
- Debug authentication issues
- Validate data formats
- Develop new features

## Support

For issues or questions:
1. Check the test interface first
2. Review browser console for errors
3. Verify Google Cloud Console settings
4. Test with Postman collection
5. Check this documentation

## License

This integration follows the same license as the main Mify project.
