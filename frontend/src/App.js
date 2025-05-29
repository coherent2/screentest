import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { 
  Search, Bell, User, Shield, AlertTriangle, CheckCircle, XCircle,
  BarChart3, FileText, Eye, Database, Activity, Globe, Link,
  TrendingUp, TrendingDown, Users, AlertCircle, Filter, Download,
  RefreshCw, Settings, HelpCircle, ChevronRight, MapPin, Clock,
  Briefcase, Building2, Calendar, DollarSign, Package, Send,
  LineChart, PieChart, ArrowUpRight, ArrowDownRight, X, Plus,
  Upload, Key, LogOut, Mail, Lock
} from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, AreaChart, Area } from 'recharts';

// Authentication Context
const AuthContext = createContext();

// API Client
const API_BASE_URL = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('amalie_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('amalie_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('amalie_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    this.setToken(data.token);
    return data;
  }

  async screenEntity(entityData) {
    return this.request('/v1/screening', {
      method: 'POST',
      body: entityData,
    });
  }

  async getEntities(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/v1/entities?${queryString}`);
  }

  async monitorTransaction(transactionData) {
    return this.request('/v1/transactions/monitor', {
      method: 'POST',
      body: transactionData,
    });
  }

  async getDashboardAnalytics(timeframe = '30d') {
    return this.request(`/v1/analytics/dashboard?timeframe=${timeframe}`);
  }

  async getAuditLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/v1/audit?${queryString}`);
  }
}

const apiClient = new ApiClient();

// Authentication Provider
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('amalie_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch (error) {
        apiClient.clearToken();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await apiClient.login(email, password);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    apiClient.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

// Components
const StatusBadge = ({ status }) => {
  const styles = {
    clear: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    blocked: 'bg-red-100 text-red-800',
    pending: 'bg-blue-100 text-blue-800',
    flagged: 'bg-red-100 text-red-800'
  };

  const icons = {
    clear: <CheckCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    blocked: <XCircle className="w-4 h-4" />,
    pending: <Clock className="w-4 h-4" />,
    flagged: <AlertTriangle className="w-4 h-4" />
  };

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const RiskScoreGauge = ({ score }) => {
  const getColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 36 36" className="w-full h-full">
        <path
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="2"
        />
        <path
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={getColor(score)}
          strokeWidth="2"
          strokeDasharray={`${score}, 100`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold">{score}</div>
          <div className="text-xs text-gray-500">Risk</div>
        </div>
      </div>
    </div>
  );
};

const LoadingSpinner = ({ text = 'Loading...' }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 w-8 h-8 mx-auto"></div>
      <p className="text-gray-600 mt-4">{text}</p>
    </div>
  </div>
);

// Login Component
function LoginForm() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
    } catch (error) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">AmalieScreen</h1>
          </div>
          <p className="text-gray-600">Enterprise Trade Compliance Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Demo: admin@amalie.com / admin123
        </div>
      </div>
    </div>
  );
}

// Main Dashboard
function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await apiClient.getDashboardAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (!analytics) return <div>Failed to load dashboard</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Risk & Compliance Dashboard</h2>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500">Total Screenings</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.total_screenings}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-gray-500">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500">High Risk Entities</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.blocked_count}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-red-600 font-medium">-5%</span>
            <span className="text-gray-500">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500">Warning Entities</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.warning_count}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4 text-green-500" />
            <span className="text-green-600 font-medium">-8%</span>
            <span className="text-gray-500">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500">Clear Entities</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.summary.clear_count}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-green-600 font-medium">+15%</span>
            <span className="text-gray-500">from last month</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Screening Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={analytics.dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="screenings" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="avg_risk" stroke="#ef4444" strokeWidth={2} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={analytics.riskDistribution.map(item => ({
                    name: item.risk_level,
                    value: item.count,
                    color: item.risk_level === 'high' ? '#ef4444' : item.risk_level === 'medium' ? '#f59e0b' : '#10b981'
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {analytics.riskDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.risk_level === 'high' ? '#ef4444' : entry.risk_level === 'medium' ? '#f59e0b' : '#10b981'} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Entity Screening Component
function EntityScreening() {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    country: '',
    identifier: '',
    notes: ''
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.screenEntity(formData);
      setResults([result, ...results]);
      setFormData({ name: '', type: '', country: '', identifier: '', notes: '' });
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Entity Screening</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Screening History
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error.message}</span>
          </div>
        </div>
      )}

      {/* Screening Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">New Entity Screening</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity Name *</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter entity name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity Type *</label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="">Select type</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
                <option value="vessel">Vessel</option>
                <option value="aircraft">Aircraft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                placeholder="Enter country"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Identifier</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.identifier}
                onChange={(e) => setFormData({...formData, identifier: e.target.value})}
                placeholder="ID, Passport, Registration"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes"
            ></textarea>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Screening...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Screen Entity
                </>
              )}
            </button>
            <button
              type="button"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => setFormData({ name: '', type: '', country: '', identifier: '', notes: '' })}
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Screening Results</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Entity Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Risk Score</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">AI Confidence</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((result) => (
                  <tr key={result.entity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{result.entity.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <RiskScoreGauge score={result.entity.overallRisk} />
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={result.entity.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-900">{result.entity.aiAnalysis.confidence}%</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(result.entity.screenedDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Transaction Monitoring Component
function TransactionMonitoring() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    fromEntity: '',
    toEntity: '',
    amount: '',
    currency: 'USD',
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await apiClient.monitorTransaction(newTransaction);
      setTransactions([result, ...transactions]);
      setNewTransaction({
        fromEntity: '',
        toEntity: '',
        amount: '',
        currency: 'USD',
        description: ''
      });
    } catch (error) {
      console.error('Transaction monitoring error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Transaction Monitoring</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Configure Rules
        </button>
      </div>

      {/* Transaction Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Monitor New Transaction</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Entity</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={newTransaction.fromEntity}
              onChange={(e) => setNewTransaction({...newTransaction, fromEntity: e.target.value})}
              placeholder="Sender entity name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Entity</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={newTransaction.toEntity}
              onChange={(e) => setNewTransaction({...newTransaction, toEntity: e.target.value})}
              placeholder="Recipient entity name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={newTransaction.currency}
              onChange={(e) => setNewTransaction({...newTransaction, currency: e.target.value})}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
              placeholder="Transaction description"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Monitoring...' : 'Monitor Transaction'}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">From</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">To</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Risk Score</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{tx.transaction.fromEntity}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{tx.transaction.toEntity}</td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {parseFloat(tx.transaction.amount).toLocaleString()} {tx.transaction.currency}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 max-w-20">
                          <div
                            className={`h-2 rounded-full ${
                              tx.analysis.riskScore >= 70 ? 'bg-red-500' :
                              tx.analysis.riskScore >= 40 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${tx.analysis.riskScore}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{tx.analysis.riskScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.analysis.status} />
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Application Component
function AmalieScreenEnterprise() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'screening', label: 'Entity Screening', icon: <Search className="w-5 h-5" /> },
    { id: 'monitoring', label: 'Transaction Monitoring', icon: <Activity className="w-5 h-5" /> },
    { id: 'cases', label: 'Case Management', icon: <Briefcase className="w-5 h-5" /> },
    { id: 'audit', label: 'Audit Trail', icon: <FileText className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-blue-300" />
            <h1 className="text-2xl font-bold">AmalieScreen</h1>
          </div>
          
          <nav>
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all ${
                  activeTab === item.id
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search entities, transactions..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-lg"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{user?.fullName || 'User'}</div>
                    <div className="text-xs text-gray-500">{user?.role || 'User'}</div>
                  </div>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 inline mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'screening' && <EntityScreening />}
          {activeTab === 'monitoring' && <TransactionMonitoring />}
          {activeTab === 'cases' && (
            <div className="text-center p-8">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Case Management</h3>
              <p className="text-gray-600">Coming soon - Comprehensive case management system</p>
            </div>
          )}
          {activeTab === 'audit' && (
            <div className="text-center p-8">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Audit Trail</h3>
              <p className="text-gray-600">Coming soon - Complete audit logging system</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Root App Component
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Initializing AmalieScreen..." />;
  }

  if (!user) {
    return <LoginForm />;
  }

  return <AmalieScreenEnterprise />;
}

// Export wrapped in AuthProvider
export default function AmalieScreenApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
