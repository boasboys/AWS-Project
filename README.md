# WAF Rules Visualization Tool

## Overview
This application is a visualization and management tool for AWS WAF (Web Application Firewall) rules. It provides an interactive interface to visualize, analyze, and debug WAF rules in a tree-based structure, making it easier to understand complex rule relationships and configurations.

## Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- AWS Account with WAF access

## Environment Setup

1. Create a `.env` file in the frontend directory:
```bash
VITE_REACT_APP_API_BASE_URL = 'http://localhost:5000/api'  # Backend API URL
VITE_REACT_APP_OPENAI_API_KEY = '[Your OpenAI API key]'    # Optional: for AI features
```

2. Create a `.env` file in the backend directory:
```bash
PORT=5000                           # Backend server port
AWS_REGION=[Your AWS Region]        # e.g. us-east-1
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/boasboys/AWS-Project.git
cd AWS-Project
```

2. Install all dependencies (frontend and backend):
```bash
npm install
```

## Running the Application

Start both frontend and backend servers with a single command:
```bash
npm run dev
```

This will launch:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

To run servers individually:
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
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
### Frontend
- React.js
- Material-UI (@mui/material)
- React Flow for visualization
- html2canvas for exports
- jsPDF for PDF generation

### Backend
- Express.js
- AWS SDK for WAF integration
- CORS for cross-origin support
- dotenv for environment management

## File Structure
```
/
├── frontend/               # React frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/               # Express backend server
│   ├── src/
│   └── package.json
└── package.json          # Root package.json for project management
```

## Note
- Never commit `.env` files to version control
- Make sure to replace placeholder values in `.env` files with actual credentials
- Ensure your AWS credentials have appropriate permissions for WAF operations