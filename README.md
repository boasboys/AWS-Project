# WAF Rules Visualization Tool

## Overview
This application is a visualization and management tool for AWS WAF (Web Application Firewall) rules. It provides an interactive interface to visualize, analyze, and debug WAF rules in a tree-based structure, making it easier to understand complex rule relationships and configurations.

## Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)
- Modern web browser (Chrome, Firefox, Safari, or Edge)

## Environment Setup
1. Create a `.env` file in the project root directory
2. Add the following environment variables:
```bash
VITE_REACT_APP_API_BASE_URL = '[Your API base URL]'  # Example: http://localhost:5000/api
VITE_REACT_APP_OPENAI_API_KEY = '[Your OpenAI API key]'  # Get from your OpenAI account
```

**Environment Variables Description:**
- `VITE_REACT_APP_API_BASE_URL`: The base URL for your backend API server
- `VITE_REACT_APP_OPENAI_API_KEY`: Your OpenAI API key for AI features. You can get this from your OpenAI account dashboard

**Note:** 
- Never commit the `.env` file to version control to protect sensitive information
- Make sure to replace the placeholder values with your actual credentials
- The `.env` file should be created locally and not shared with others

## Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
```

2. Navigate to the project directory:
```bash
cd final
```

3. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the development server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## Features
- Interactive visualization of WAF rules in a tree structure
- Rule relationship analysis and dependency tracking
- Rule warnings and validation checks
- Rule details inspection with popup views
- Search functionality for quick rule finding
- Export capabilities (PDF and Image)
- Request debugger for testing WAF rules
- Support for AWS WAF ACL loading
- Dark/Light theme support

## Technology Stack
- React.js
- Material-UI (@mui/material)
- React Flow for visualization
- html2canvas for exports
- jsPDF for PDF generation
- Custom rule parsing and transformation logic

## Key Components
- WAF Rule Tree Viewer
- Request Debugger
- Rule Details Popup
- Rule Warnings System
- ACL Loader

## File Structure
- `/src/components/WAFView` - Main WAF visualization components
- `/src/components/tree` - Tree transformation and node rendering
- `/src/components/popup` - Popup components for rule details
- `/src/debugger` - Request debugging functionality
- `/src/components/upload` - File upload and ACL loading