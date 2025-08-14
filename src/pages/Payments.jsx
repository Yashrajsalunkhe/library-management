import { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';

const Payments = () => {
  const { showNotification } = useNotification();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [filters, setFilters] = useState({
    memberId: '',
    dateFrom: '',
    dateTo: '',
    mode: '',
    search: '',
    planId: ''
  });

  const [newPayment, setNewPayment] = useState({
    memberId: '',
    amount: '',
    mode: 'cash',
    note: '',
    receiptNumber: ''
  });

  // Payment modes
  const paymentModes = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'bank_transfer', label: 'Bank Transfer' }
  ];

  // Load initial data
  useEffect(() => {
    loadPayments();
    loadMembers();
    loadMembershipPlans();
  }, []);

  // Load payments when filters change
  useEffect(() => {
    loadPayments();
  }, [filters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const result = await window.api.payment.list(filters);
      if (result.success) {
        setPayments(result.data);
      } else {
        showNotification('Failed to load payments: ' + result.message, 'error');
      }
    } catch (error) {
      showNotification('Failed to load payments: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const result = await window.api.member.list({ status: 'active' });
      if (result.success) {
        setMembers(result.data);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadMembershipPlans = async () => {
    try {
      const result = await window.api.plan.list();
      if (result.success) {
        setMembershipPlans(result.data);
      }
    } catch (error) {
      console.error('Failed to load membership plans:', error);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    
    if (!newPayment.memberId || !newPayment.amount) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    try {
      const result = await window.api.payment.add({
        ...newPayment,
        amount: parseFloat(newPayment.amount)
      });

      if (result.success) {
        showNotification('Payment added successfully', 'success');
        setShowAddPayment(false);
        setNewPayment({
          memberId: '',
          amount: '',
          mode: 'cash',
          note: '',
          receiptNumber: ''
        });
        loadPayments();
      } else {
        showNotification('Failed to add payment: ' + result.message, 'error');
      }
    } catch (error) {
      showNotification('Failed to add payment: ' + error.message, 'error');
    }
  };

  const handleFilterChange = (field, value) => {
    if (field === 'search') {
      // Clear existing timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      // Update the filter immediately for UI responsiveness
      setFilters(prev => ({ ...prev, [field]: value }));
      
      // Set a new timeout for the actual search
      const newTimeout = setTimeout(() => {
        // This will trigger the useEffect to reload payments
        setFilters(prev => ({ ...prev, [field]: value }));
      }, 300); // 300ms delay
      
      setSearchTimeout(newTimeout);
    } else {
      setFilters(prev => ({ ...prev, [field]: value }));
    }
  };

  const clearFilters = () => {
    setFilters({
      memberId: '',
      dateFrom: '',
      dateTo: '',
      mode: '',
      search: '',
      planId: ''
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentModeColor = (mode) => {
    const colors = {
      cash: '#10b981',
      card: '#3b82f6',
      upi: '#8b5cf6',
      bank_transfer: '#f59e0b'
    };
    return colors[mode] || '#6b7280';
  };

  const getTotalAmount = () => {
    return payments.reduce((total, payment) => total + payment.amount, 0);
  };

  const getTodayAmount = () => {
    const today = new Date().toISOString().split('T')[0];
    return payments
      .filter(payment => payment.paid_at.startsWith(today))
      .reduce((total, payment) => total + payment.amount, 0);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title-section">
          <h1> Payments Management</h1>
          <p>Track and manage all payment transactions</p>
        </div>
        <button
          onClick={() => setShowAddPayment(true)}
          className="button button-primary"
        >
          + Add Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(getTotalAmount())}</div>
          <div className="stat-label">Total Amount</div>
          <div className="stat-subtitle">{payments.length} transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(getTodayAmount())}</div>
          <div className="stat-label">Today's Collection</div>
          <div className="stat-subtitle">
            {payments.filter(p => p.paid_at.startsWith(new Date().toISOString().split('T')[0])).length} payments
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {payments.filter(p => p.mode === 'cash').length}
          </div>
          <div className="stat-label">Cash Payments</div>
          <div className="stat-subtitle">
            {formatCurrency(payments.filter(p => p.mode === 'cash').reduce((sum, p) => sum + p.amount, 0))}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {payments.filter(p => p.mode !== 'cash').length}
          </div>
          <div className="stat-label">Digital Payments</div>
          <div className="stat-subtitle">
            {formatCurrency(payments.filter(p => p.mode !== 'cash').reduce((sum, p) => sum + p.amount, 0))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="card-header">
          <h3>Filter Payments</h3>
          <p className="card-subtitle">Filter payments by member, date range, or payment mode</p>
        </div>
        
        {/* Search Bar */}
        <div className="search-section">
          <div className="form-group">
            <label htmlFor="payment-search">
              <span className="search-icon">🔍</span>
              Search by Member Name
            </label>
            <input
              id="payment-search"
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="form-control search-input"
              placeholder="Type member name to search..."
            />
          </div>
        </div>

        {/* Filter Grid */}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="member-filter">Member</label>
            <select
              id="member-filter"
              value={filters.memberId}
              onChange={(e) => handleFilterChange('memberId', e.target.value)}
              className="form-control"
            >
              <option value="">All Members</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="date-from">From Date</label>
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="date-to">To Date</label>
            <input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="mode-filter">Payment Mode</label>
            <select
              id="mode-filter"
              value={filters.mode}
              onChange={(e) => handleFilterChange('mode', e.target.value)}
              className="form-control"
            >
              <option value="">All Modes</option>
              {paymentModes.map(mode => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="plan-filter">Membership Plan</label>
            <select
              id="plan-filter"
              value={filters.planId}
              onChange={(e) => handleFilterChange('planId', e.target.value)}
              className="form-control"
            >
              <option value="">All Plans</option>
              {membershipPlans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ₹{plan.price}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-actions">
          <button onClick={clearFilters} className="button button-secondary">
            Clear All Filters
          </button>
          {(filters.search || filters.memberId || filters.dateFrom || filters.dateTo || filters.mode) && (
            <span className="filter-indicator">
              {Object.values(filters).filter(Boolean).length} filter(s) active
            </span>
          )}
        </div>
      </div>

      {/* Payments Table */}
      <div className="card payments-table-card">
        <div className="card-header">
          <h3>Payment History</h3>
          <div className="card-subtitle">
            Showing {payments.length} payment{payments.length !== 1 ? 's' : ''}
            {filters.memberId || filters.dateFrom || filters.dateTo || filters.mode || filters.search ? ' (filtered)' : ''}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h3>No payments found</h3>
            <p>
              {filters.memberId || filters.dateFrom || filters.dateTo || filters.mode || filters.search
                ? 'No payments match your current filters.'
                : 'No payments have been recorded yet.'}
            </p>
            {(filters.memberId || filters.dateFrom || filters.dateTo || filters.mode || filters.search) && (
              <button onClick={clearFilters} className="button button-secondary mt-3">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <div className="table-wrapper">
              <table className="table payments-table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Plan</th>
                    <th>Date</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id}>
                      <td>
                        <span className="receipt-code">{payment.receipt_number}</span>
                      </td>
                      <td>
                        <div className="member-info">
                          <div className="member-name">
                            {payment.member_name || (
                              <span className="deleted-member">
                                <em>Deleted Member</em>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="payment-amount">{formatCurrency(payment.amount)}</span>
                      </td>
                      <td>
                        <span 
                          className="payment-mode-badge"
                          style={{ backgroundColor: getPaymentModeColor(payment.mode) }}
                        >
                          {paymentModes.find(m => m.value === payment.mode)?.label || payment.mode}
                        </span>
                      </td>
                      <td>
                        <span className="plan-name">{payment.plan_name || '-'}</span>
                      </td>
                      <td>
                        <div className="payment-date">
                          {formatDate(payment.paid_at)}
                        </div>
                      </td>
                      <td>
                        <div className="payment-note" title={payment.note}>
                          {payment.note || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {showAddPayment && (
        <div className="modal-overlay" onClick={() => setShowAddPayment(false)}>
          <div className="modal payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 Add New Payment</h2>
              <button 
                onClick={() => setShowAddPayment(false)}
                className="modal-close"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="payment-form">
              <div className="modal-body">
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="payment-member">Member *</label>
                    <select
                      id="payment-member"
                      value={newPayment.memberId}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, memberId: e.target.value }))}
                      className="form-control"
                      required
                    >
                      <option value="">Select Member</option>
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.email || member.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label htmlFor="payment-amount">Amount *</label>
                      <div className="input-group">
                        <span className="input-prefix">₹</span>
                        <input
                          id="payment-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPayment.amount}
                          onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                          className="form-control"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="payment-mode">Payment Mode</label>
                      <select
                        id="payment-mode"
                        value={newPayment.mode}
                        onChange={(e) => setNewPayment(prev => ({ ...prev, mode: e.target.value }))}
                        className="form-control"
                      >
                        {paymentModes.map(mode => (
                          <option key={mode.value} value={mode.value}>
                            {mode.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="receipt-number">Receipt Number</label>
                    <input
                      id="receipt-number"
                      type="text"
                      value={newPayment.receiptNumber}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, receiptNumber: e.target.value }))}
                      className="form-control"
                      placeholder="Auto-generated if empty"
                    />
                    <small className="form-help">Leave empty to auto-generate</small>
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="payment-note">Note</label>
                    <textarea
                      id="payment-note"
                      value={newPayment.note}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, note: e.target.value }))}
                      className="form-control"
                      rows="3"
                      placeholder="Optional payment note..."
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setShowAddPayment(false)}
                  className="button button-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  💰 Add Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
