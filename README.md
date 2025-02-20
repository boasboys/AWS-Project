
# AWS WAF ACL Visualization Tool

## Overview
This project is a **React-based visualization tool** for AWS WAF ACLs. It retrieves Web ACL data from an **Express backend** and presents it in an interactive **flowchart** using `reactflow` and `dagre` for auto-layout.

## Features
- Fetches **Web ACLs and rule groups** from AWS WAF.
- Supports **custom and managed rule groups**.
- Visualizes ACLs, rules, and rule groups using **React Flow**.
- Uses `dagre` for **automatic graph layout**.
- Interactive UI with **collapsible nodes**.

## Tech Stack
### **Frontend**
- React
- React Flow (for visualization)
- Material UI (for UI components)
- Dagre (for auto-layout graphs)

### **Backend**
- Node.js
- Express
- AWS SDK for WAF V2
- CORS & dotenv

## Installation & Setup
### **1. Clone the repository**
```sh
git clone <repo_url>
cd <project_directory>
```

### **2. Install dependencies**
```sh
npm install
```

### **3. Set up environment variables**
Create a `.env` file in the root directory with the required AWS credentials:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### **4. Start the backend**
```sh
npm run server
```

### **5. Start the frontend**
```sh
npm start
```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/waf-acls` | Fetches Web ACLs and rule group details |

## Usage
1. Open the web app in your browser.
2. View AWS WAF ACL rules in an interactive tree/flowchart.
3. Click on nodes to expand rule details.

## Contribution
Feel free to open an issue or submit a pull request if you have any improvements or bug fixes!

## License
This project is licensed under the MIT License.

=======
# AWS WAF Rules Visualization Tool

## Overview
This tool provides a visual representation of AWS WAF (Web Application Firewall) ACL (Access Control List) rules, helping security engineers and developers better understand and manage their WAF configurations. It fetches ACL data from AWS and displays the rules flow based on their priorities, making it easier to analyze and troubleshoot complex WAF setups.

## Key Features
- **Visual Rule Flow**: Displays WAF rules in a hierarchical flow diagram based on priority
- **Version Comparison**: Compare different versions of ACL configurations to track changes
- **Real-time AWS Integration**: Directly fetches current WAF configurations from your AWS account
- **Interactive Interface**: Easy-to-use interface for navigating complex rule sets
- **Rule Priority Visualization**: Clear representation of rule execution order
- **Configuration Analysis**: Helps identify potential conflicts or redundancies in rule sets

## Technical Details
The application connects to AWS using the AWS SDK to fetch WAF ACL configurations. It processes this data to create an interactive visualization showing:
- Rule priorities and relationships
- Rule actions (Allow, Block, Count)
- Rule conditions and criteria
- Rule version history

## Use Cases
- Security audit and compliance reviews
- WAF configuration troubleshooting
- Change management and tracking
- Training and documentation
- Rule optimization and refinement

## Requirements
- AWS Account with appropriate IAM permissions
- Access to AWS WAF configurations
- Modern web browser for visualization

## Getting Started
[Installation and setup instructions will be added]

## Contributing
We welcome contributions to enhance the visualization capabilities and add new features.

## License
[License information will be added]

## Support
[Support information will be added]
>>>>>>> a29714a (add README)
