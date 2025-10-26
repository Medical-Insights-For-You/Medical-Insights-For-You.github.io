# MIFY - Google Fitness API Postman Collection

This repository contains a Postman collection for accessing Google Fitness API data using the MIFY collection.

## Features
- Get step count data
- Get calories expended
- Get activity segments
- OAuth 2.0 authentication setup
- Test data sources

## Setup Instructions

### Prerequisites
- Postman installed
- Google Cloud Console account
- Google Fitness API enabled

### 1. Import Collection
1. Open Postman
2. Click **Import**
3. Select `postman/postman_google_collection.json`

### 2. Configure OAuth 2.0
The collection already has OAuth 2.0 preconfigured. To get a new access token:
1. Go to the **Authorization** tab of any request
2. Click **Get New Access Token**
3. The OAuth settings are already configured with:
   - Client ID: `1059140530421-kbdp5vbd6ef9nrqlrskdnholmr5fu935.apps.googleusercontent.com`
   - Auth URL: `https://accounts.google.com/o/oauth2/v2/auth`
   - Access Token URL: `https://oauth2.googleapis.com/token`
   - Redirect URI: `https://oauth.pstmn.io/v1/callback`
   - Scope: `https://www.googleapis.com/auth/fitness.activity.read`

### 3. Configure Variables
1. Go to the Collection variables tab
2. Set `baseURL` to `https://www.googleapis.com` (or leave blank to use full URLs)

### 4. Make Requests
1. Select a request from the collection
2. Click Send

## Available Requests

### Test Data
- **Method**: GET
- **Endpoint**: `https://www.googleapis.com/fitness/v1/users/me/dataSources`
- **Description**: Test endpoint to verify data sources are accessible

### Get Google Fit Data
- **Method**: GET
- **Endpoint**: `{{baseURL}}/fitness/v1/users/me/dataSources`
- **Description**: Retrieve available data sources using collection variables
- **Returns**: List of available data sources

### Fetch Google Fit Data
- **Method**: POST
- **Endpoint**: `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`
- **Description**: Fetch aggregated fitness data (steps, calories, activity segments)
- **Request Body**: 
  - Aggregates: `com.google.step_count.delta`, `com.google.calories.expended`, `com.google.activity.segment`
  - Bucket duration: 86400000 ms (1 day)
  - Start/End time in milliseconds
- **Returns**: Steps, calories, and activity segments for the specified time range

## Data Types Supported
- `com.google.step_count.delta` - Step count
- `com.google.calories.expended` - Calories burned
- `com.google.activity.segment` - Activity types

## Authentication
The collection uses Bearer token authentication with OAuth 2.0. Tokens are automatically included in the Authorization header.

## Notes
- Tokens expire after 1 hour - use the "Get New Access Token" button to refresh
- Update timestamps in the request body to fetch current data
- Empty `point` arrays mean no data for that period
- Collection variables allow easy switching between environments