# 2. setup.sh
#!/bin/bash
echo "🚀 Setting up AmalieScreen Enterprise Platform..."

# Create project structure
mkdir -p backend frontend

# Setup Backend
cd backend
cat > package.json << 'EOF'
{
  "name": "amalie-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js || node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "uuid": "^9.0.0"
  }
}
EOF

npm install

cat > server.js << 'EOF'
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory storage for demo
let entities = [];
let transactions = [];
let auditLogs = [];

const users = [
  {
    id: '1',
    email: 'admin@amalie.com',
    password: 'admin123',
    fullName: 'System Administrator',
    role: 'admin'
  }
];

// Helper function to create audit log
function createAuditLog(action, userId = '1') {
  const log = {
    id: uuidv4(),
    user_id: userId,
    action,
    resource_type: 'entities',
    resource_id: uuidv4(),
    ip_address: '127.0.0.1',
    success: true,
    created_at: new Date().toISOString()
  };
  auditLogs.unshift(log);
  return log;
}

// Mock AI screening function
function performAIScreening(entityData) {
  const riskScore = Math.floor(Math.random() * 100);
  let status = 'clear';
  
  // Higher risk for certain countries
  if (entityData.country && ['Russia', 'Iran', 'North Korea'].includes(entityData.country)) {
    status = 'blocked';
  } else if (riskScore >= 70) {
    status = 'blocked';
  } else if (riskScore >= 40) {
    status = 'warning';
  }

  const entity = {
    id: uuidv4(),
    ...entityData,
    overallRisk: riskScore,
    status,
    aiAnalysis: {
      confidence: Math.floor(70 + Math.random() * 30),
      riskFactors: {
        geographic: Math.floor(Math.random() * 100),
        industry: Math.floor(Math.random() * 100),
        behavior: Math.floor(Math.random() * 100),
        network: Math.floor(Math.random() * 100)
      },
      recommendation: status === 'blocked' ? 
        'HIGH RISK: Immediate escalation required. Do not proceed.' :
        status === 'warning' ?
        'MEDIUM RISK: Enhanced due diligence recommended.' :
        'LOW RISK: Standard monitoring procedures apply.',
      lastUpdated: new Date().toISOString()
    },
    screenedDate: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const screeningResults = [
    {
      source: 'OFAC SDN',
      matchScore: riskScore,
      details: [{ name: entityData.name, reason: 'AI-powered screening result' }],
      riskFactors: { sanctions: riskScore > 50, government: 'US' }
    }
  ];

  if (riskScore > 30) {
    screeningResults.push({
      source: 'EU Sanctions',
      matchScore: Math.floor(riskScore * 0.8),
      details: [{ name: entityData.name, listType: 'EU Consolidated List' }],
      riskFactors: { sanctions: true, government: 'EU' }
    });
  }

  return { entity, screeningResults };
}

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    createAuditLog('USER_LOGIN', user.id);
    res.json({
      token: 'demo-token-' + Date.now(),
      user: { 
        id: user.id, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role 
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Entity Screening
app.post('/api/v1/screening', (req, res) => {
  try {
    const result = performAIScreening(req.body);
    entities.unshift(result.entity);
    createAuditLog('ENTITY_SCREENING');
    
    // Simulate processing delay for realism
    setTimeout(() => {
      res.json(result);
    }, 1000);
  } catch (error) {
    res.status(500).json({ error: 'Screening failed' });
  }
});

// Get Entities
app.get('/api/v1/entities', (req, res) => {
  const { page = 1, limit = 20, status, country } = req.query;
  let filteredEntities = [...entities];
  
  if (status) {
    filteredEntities = filteredEntities.filter(e => e.status === status);
  }
  if (country) {
    filteredEntities = filteredEntities.filter(e => e.country?.toLowerCase().includes(country.toLowerCase()));
  }
  
  const startIndex = (page - 1) * limit;
  const paginatedEntities = filteredEntities.slice(startIndex, startIndex + parseInt(limit));
  
  res.json({
    entities: paginatedEntities,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredEntities.length,
      pages: Math.ceil(filteredEntities.length / limit)
    }
  });
});

// Transaction Monitoring
app.post('/api/v1/transactions/monitor', (req, res) => {
  const transactionData = req.body;
  
  let riskScore = Math.floor(Math.random() * 50);
  const riskFactors = [];
  
  // Risk analysis
  if (transactionData.amount > 10000) {
    riskScore += 30;
    riskFactors.push('Large amount transaction');
  }
  
  if (['BTC', 'XMR', 'ZEC'].includes(transactionData.currency)) {
    riskScore += 40;
    riskFactors.push('Cryptocurrency transaction');
  }
  
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) {
    riskScore += 20;
    riskFactors.push('Off-hours transaction');
  }
  
  riskScore = Math.min(100, riskScore);
  
  const status = riskScore >= 70 ? 'blocked' : riskScore >= 40 ? 'flagged' : 'clear';
  
  const transaction = {
    id: uuidv4(),
    ...transactionData,
    createdAt: new Date().toISOString()
  };
  
  const analysis = {
    riskScore,
    riskFactors,
    status,
    recommendation: riskScore >= 70 ? 'Block transaction' : 
                    riskScore >= 40 ? 'Review required' : 'Approve',
    timestamp: new Date().toISOString()
  };
  
  transactions.unshift({ transaction, analysis });
  createAuditLog('TRANSACTION_MONITORING');
  
  res.json({ transaction, analysis });
});

// Dashboard Analytics
app.get('/api/v1/analytics/dashboard', (req, res) => {
  const summary = {
    total_screenings: entities.length,
    clear_count: entities.filter(e => e.status === 'clear').length,
    warning_count: entities.filter(e => e.status === 'warning').length,
    blocked_count: entities.filter(e => e.status === 'blocked').length,
    avg_risk_score: entities.length > 0 ? 
      Math.round(entities.reduce((sum, e) => sum + e.overallRisk, 0) / entities.length) : 0
  };
  
  const dailyTrends = [
    { date: '2024-11-20', screenings: 45, avg_risk: 32 },
    { date: '2024-11-21', screenings: 67, avg_risk: 28 },
    { date: '2024-11-22', screenings: 89, avg_risk: 45 },
    { date: '2024-11-23', screenings: 56, avg_risk: 38 },
    { date: '2024-11-24', screenings: 78, avg_risk: 42 },
    { date: '2024-11-25', screenings: summary.total_screenings, avg_risk: summary.avg_risk_score }
  ];
  
  const riskDistribution = [
    { risk_level: 'low', count: summary.clear_count },
    { risk_level: 'medium', count: summary.warning_count },
    { risk_level: 'high', count: summary.blocked_count }
  ];
  
  const countryRisks = [
    { country: 'Russia', entity_count: entities.filter(e => e.country === 'Russia').length, avg_risk: 75 },
    { country: 'Iran', entity_count: entities.filter(e => e.country === 'Iran').length, avg_risk: 85 },
    { country: 'USA', entity_count: entities.filter(e => e.country === 'USA').length, avg_risk: 25 },
    { country: 'Germany', entity_count: entities.filter(e => e.country === 'Germany').length, avg_risk: 15 },
    { country: 'China', entity_count: entities.filter(e => e.country === 'China').length, avg_risk: 60 }
  ].filter(c => c.entity_count > 0);
  
  res.json({
    summary,
    dailyTrends,
    riskDistribution,
    countryRisks,
    generatedAt: new Date().toISOString()
  });
});

// Audit Trail
app.get('/api/v1/audit', (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const startIndex = (page - 1) * limit;
  const paginatedLogs = auditLogs.slice(startIndex, startIndex + parseInt(limit));
  
  res.json({
    logs: paginatedLogs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: auditLogs.length,
      pages: Math.ceil(auditLogs.length / limit)
    }
  });
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      screening: 'operational',
      monitoring: 'operational',
      analytics: 'operational'
    }
  });
});

// Create some initial audit logs
createAuditLog('SYSTEM_STARTUP');

app.listen(PORT, () => {
  console.log(`🚀 AmalieScreen Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🎯 Ready for frontend connection!`);
});
EOF

cd ../frontend

# Create React app structure
cat > package.json << 'EOF'
{
  "name": "amalie-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "lucide-react": "^0.263.1",
    "recharts": "^2.7.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": ["react-app"]
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  },
  "proxy": "http://localhost:3001"
}
EOF

mkdir -p public src

cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="AmalieScreen Enterprise Trade Compliance Platform" />
    <title>AmalieScreen Enterprise</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {}
            }
        }
    </script>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
</body>
</html>
EOF

cat > src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
EOF

npm install

cd ..

echo "✅ AmalieScreen Enterprise setup complete!"
echo ""
echo "🚀 To start the platform:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm start"
echo ""
echo "🔐 Login credentials:"
echo "   Email: admin@amalie.com"
echo "   Password: admin123"
echo ""
echo "📱 The frontend will auto-open when ready!"
