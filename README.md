# Smart Real Estate Search

A website that helps users find real estate properties in Ontario using smart filtering criteria instead of traditional filters.

## Features

The website searches for properties in Ontario that satisfy at least one of the following criteria:
1. Have been on the market for at least 2 months
2. Have at least 1 "terminated" status listing in the past year
3. Current market price is lower than what they bought for
4. Current market price is at least 100% higher than what they bought for
5. They ask for quick deal (close date within 30 days)
6. Their last listing had a deal fell through
7. Estate sells

## Setup

1. Install dependencies:
```bash
npm run install:all
```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in the root directory
   - Add your Repliers API key:
   ```
   REPLIERS_API_KEY=your_api_key_here
   PORT=3001
   ```

3. Run the development server:
```bash
npm run dev
```

This will start:
- Frontend server on http://localhost:3000
- Backend server on http://localhost:3001

## Project Structure

- `frontend/` - React frontend application
- `backend/` - Express.js backend API server
- `.env` - Environment variables (create from .env.example)

## Getting a Repliers API Key

To get a Repliers API key:
1. Visit [Repliers Developer Portal](https://repliers.com/developer-agencies/)
2. Register for an account
3. Get your API key from the dashboard
4. Add it to your `.env` file

## Usage

1. Open http://localhost:3000 in your browser
2. Click the "查看捡漏房" button
3. View the list of properties that match the criteria
4. Click on property links to view them on Realtor.ca

