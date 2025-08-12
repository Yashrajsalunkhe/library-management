import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const Reports = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState(initialTab?.tab || 'overview');
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [reportData, setReportData] = useState({
    overview: null,
    attendance: [],
    payments: [],
    members: []
  });
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'attendance', label: 'Attendance', icon: '📅' },
    { id: 'payments', label: 'Payments', icon: '💰' },
    { id: 'members', label: 'Members', icon: '👥' }
  ];

  useEffect(() => {
    loadReportData();
  }, [activeTab, dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'overview':
          await loadOverviewData();
          break;
        case 'attendance':
          await loadAttendanceReport();
          break;
        case 'payments':
          await loadPaymentsReport();
          break;
        case 'members':
          await loadMembersReport();
          break;
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewData = async () => {
    try {
      const stats = await window.api.dashboard.stats();
      if (stats.success) {
        setReportData(prev => ({ ...prev, overview: stats.data }));
      }
    } catch (error) {
      console.error('Failed to load overview data:', error);
    }
  };

  const loadAttendanceReport = async () => {
    try {
      const result = await window.api.report.attendance({
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });
      if (result.success) {
        setReportData(prev => ({ ...prev, attendance: result.data }));
      }
    } catch (error) {
      console.error('Failed to load attendance report:', error);
    }
  };

  const loadPaymentsReport = async () => {
    try {
      const result = await window.api.report.payments({
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });
      if (result.success) {
        setReportData(prev => ({ ...prev, payments: result.data }));
      }
    } catch (error) {
      console.error('Failed to load payments report:', error);
    }
  };

  const loadMembersReport = async () => {
    try {
      const result = await window.api.member.list();
      if (result.success) {
        setReportData(prev => ({ ...prev, members: result.data }));
      }
    } catch (error) {
      console.error('Failed to load members report:', error);
    }
  };

  const setQuickDateRange = (months) => {
    const endDate = new Date();
    const startDate = subMonths(endDate, months);
    setDateRange({
      from: format(startOfMonth(startDate), 'yyyy-MM-dd'),
      to: format(endOfMonth(endDate), 'yyyy-MM-dd')
    });
  };

  const exportReport = async (type, format = 'csv') => {
    setExportLoading(true);
    try {
      const dataToExport = reportData[type];
      if (!dataToExport || dataToExport.length === 0) {
        alert(`No ${type} data available to export. Please select a date range with data.`);
        return;
      }

      const result = await window.api.report.export({
        type,
        format,
        dateRange,
        data: dataToExport
      });
      
      if (result.success) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully as ${format.toUpperCase()}!\n\nFile saved to: exports folder\n\nThe file explorer will open automatically.`);
      } else {
        alert(`Failed to export ${type} report: ${result.message}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}\n\nPlease try again or contact support.`);
    } finally {
      setExportLoading(false);
    }
  };

  const renderOverview = () => {
    if (!reportData.overview) return <div className="loading">Loading overview...</div>;

    const { totalMembers, todayAttendance, monthlyRevenue, recentPayments } = reportData.overview;

    return (
      <div className="overview-cards">
        <div className="overview-card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <h3>Total Members</h3>
            <div className="card-value">{totalMembers}</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <h3>Today's Attendance</h3>
            <div className="card-value">{todayAttendance}</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Monthly Revenue</h3>
            <div className="card-value">₹{monthlyRevenue?.toLocaleString() || 0}</div>
          </div>
        </div>
        <div className="overview-card">
          <div className="card-icon">🆕</div>
          <div className="card-content">
            <h3>Recent Payments</h3>
            <div className="card-value">{recentPayments}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderAttendanceReport = () => {
    if (loading) return <div className="loading">Loading attendance report...</div>;

    return (
      <div className="report-content">
        <div className="report-header">
          <h3>Attendance Report ({dateRange.from} to {dateRange.to})</h3>
          <div className="report-actions">
            <button 
              onClick={() => exportReport('attendance', 'csv')} 
              className="button button-secondary"
              disabled={exportLoading}
            >
              {exportLoading ? '⏳ Exporting...' : '📄 Export CSV'}
            </button>
            <button 
              onClick={() => exportReport('attendance', 'xlsx')} 
              className="button button-primary"
              disabled={exportLoading}
            >
              {exportLoading ? '⏳ Exporting...' : '📊 Export Excel'}
            </button>
          </div>
        </div>
        
        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData.attendance.map((record, index) => (
                <tr key={index}>
                  <td>{record.date ? format(new Date(record.date), 'dd/MM/yyyy') : '-'}</td>
                  <td>{record.member_name}</td>
                  <td>{record.check_in || '-'}</td>
                  <td>{record.check_out || '-'}</td>
                  <td>{record.duration || '-'}</td>
                  <td>
                    <span className={`status ${record.status?.toLowerCase() || 'pending'}`}>
                      {record.status || 'In Progress'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {reportData.attendance.length === 0 && (
            <div className="no-data">No attendance data found for selected date range</div>
          )}
        </div>
      </div>
    );
  };

  const renderPaymentsReport = () => {
    if (loading) return <div className="loading">Loading payments report...</div>;

    const totalAmount = reportData.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    return (
      <div className="report-content">
        <div className="report-header">
          <h3>Payments Report ({dateRange.from} to {dateRange.to})</h3>
          <div className="report-summary">
            <span className="summary-item">Total: ₹{totalAmount.toLocaleString()}</span>
            <span className="summary-item">Count: {reportData.payments.length}</span>
          </div>
          <div className="report-actions">
            <button 
              onClick={() => exportReport('payments', 'csv')} 
              className="button button-secondary"
              disabled={exportLoading}
            >
              {exportLoading ? '⏳ Exporting...' : '📄 Export CSV'}
            </button>
            <button 
              onClick={() => exportReport('payments', 'xlsx')} 
              className="button button-primary"
              disabled={exportLoading}
            >
              {exportLoading ? '⏳ Exporting...' : '📊 Export Excel'}
            </button>
          </div>
        </div>
        
        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {reportData.payments.map((payment, index) => (
                <tr key={index}>
                  <td>{payment.payment_date ? format(new Date(payment.payment_date), 'dd/MM/yyyy') : '-'}</td>
                  <td>{payment.member_name}</td>
                  <td>{payment.plan_name}</td>
                  <td>₹{payment.amount?.toLocaleString()}</td>
                  <td>{payment.payment_method}</td>
                  <td>
                    <span className={`status ${payment.status?.toLowerCase()}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>{payment.reference_number || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {reportData.payments.length === 0 && (
            <div className="no-data">No payment data found for selected date range</div>
          )}
        </div>
      </div>
    );
  };

  const renderMembersReport = () => {
    if (loading) return <div className="loading">Loading members report...</div>;

    const activeMembers = reportData.members.filter(m => m.status === 'active').length;
    const inactiveMembers = reportData.members.filter(m => m.status === 'inactive').length;

    return (
      <div className="report-content">
        <div className="report-header">
          <h3>Members Report</h3>
          <div className="report-summary">
            <span className="summary-item">Active: {activeMembers}</span>
            <span className="summary-item">Inactive: {inactiveMembers}</span>
            <span className="summary-item">Total: {reportData.members.length}</span>
          </div>
          <div className="report-actions">
            <button 
              onClick={() => exportReport('members', 'csv')} 
              className="button button-secondary"
              disabled={exportLoading}
            >
              {exportLoading ? '⏳ Exporting...' : '📄 Export CSV'}
            </button>
            <button 
              onClick={() => exportReport('members', 'xlsx')} 
              className="button button-primary"
              disabled={exportLoading}
            >
              {exportLoading ? '⏳ Exporting...' : '📊 Export Excel'}
            </button>
          </div>
        </div>
        
        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Plan</th>
                <th>Join Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData.members.map((member, index) => (
                <tr key={index}>
                  <td>{member.id}</td>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.phone}</td>
                  <td>{member.plan}</td>
                  <td>{member.created_at ? format(new Date(member.created_at), 'dd/MM/yyyy') : '-'}</td>
                  <td>
                    <span className={`status ${member.status?.toLowerCase()}`}>
                      {member.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {reportData.members.length === 0 && (
            <div className="no-data">No members found</div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'attendance':
        return renderAttendanceReport();
      case 'payments':
        return renderPaymentsReport();
      case 'members':
        return renderMembersReport();
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>📊 Reports & Analytics</h1>
        <p>Generate comprehensive reports and export data</p>
      </div>

      <div className="reports-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'overview' && (
        <div className="date-controls">
          <div className="date-range">
            <label>
              From:
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </label>
            <label>
              To:
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </label>
          </div>
          
          <div className="quick-filters">
            <button onClick={() => setQuickDateRange(1)} className="quick-filter">Last Month</button>
            <button onClick={() => setQuickDateRange(3)} className="quick-filter">Last 3 Months</button>
            <button onClick={() => setQuickDateRange(6)} className="quick-filter">Last 6 Months</button>
            <button onClick={() => setQuickDateRange(12)} className="quick-filter">Last Year</button>
          </div>
        </div>
      )}

      <div className="reports-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Reports;
