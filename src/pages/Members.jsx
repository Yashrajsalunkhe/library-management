import { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';

const Members = ({ initialAction = null }) => {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });
  const { success, error } = useNotification();

  useEffect(() => {
    loadMembers();
    loadPlans();
    
    // Handle initial action from menu
    if (initialAction?.action === 'new') {
      setShowAddModal(true);
    }
  }, [initialAction]);

  const loadMembers = async () => {
    try {
      const result = await window.api.member.list(filters);
      if (result.success) {
        setMembers(result.data);
      }
    } catch (err) {
      error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const result = await window.api.plan.list();
      if (result.success) {
        setPlans(result.data);
      }
    } catch (err) {
      error('Failed to load membership plans');
    }
  };

  const handleAddMember = async (memberData) => {
    try {
      const result = await window.api.member.add(memberData);
      if (result.success) {
        success('Member added successfully');
        setShowAddModal(false);
        loadMembers();
        
        // Send welcome message
        const member = { ...memberData, id: result.data.id };
        window.api.notification.sendWelcome(member);
      } else {
        error(result.message || 'Failed to add member');
      }
    } catch (err) {
      error('Failed to add member');
    }
  };

  const handleRenewMember = async (renewalData) => {
    try {
      const result = await window.api.member.renew(renewalData);
      if (result.success) {
        success('Member renewed successfully');
        setShowRenewModal(false);
        setSelectedMember(null);
        loadMembers();
      } else {
        error(result.message || 'Failed to renew member');
      }
    } catch (err) {
      error('Failed to renew member');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (confirm('Are you sure you want to suspend this member?')) {
      try {
        const result = await window.api.member.delete(memberId);
        if (result.success) {
          success('Member suspended successfully');
          loadMembers();
        } else {
          error(result.message || 'Failed to suspend member');
        }
      } catch (err) {
        error('Failed to suspend member');
      }
    }
  };

  const getStatusBadge = (status, endDate) => {
    const isExpired = new Date(endDate) < new Date();
    
    if (status === 'suspended') {
      return <span className="badge badge-danger">Suspended</span>;
    } else if (isExpired) {
      return <span className="badge badge-danger">Expired</span>;
    } else {
      const daysLeft = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 10) {
        return <span className="badge badge-warning">Expiring Soon</span>;
      } else {
        return <span className="badge badge-success">Active</span>;
      }
    }
  };

  const filteredMembers = members.filter(member => {
    const searchMatch = !filters.search || 
      member.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      member.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      member.phone?.includes(filters.search);
    
    const statusMatch = !filters.status || member.status === filters.status;
    
    return searchMatch && statusMatch;
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Loading members...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Members Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="button button-primary"
        >
          <span style={{ marginRight: '0.5rem' }}>➕</span>
          Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="input"
              placeholder="Search by name, email, or phone..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="select"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <button
              onClick={loadMembers}
              className="button button-secondary"
              style={{ width: '100%' }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="card">
        {filteredMembers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Plan</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(member => (
                  <tr key={member.id}>
                    <td>#{member.id}</td>
                    <td>{member.name}</td>
                    <td>
                      <div style={{ fontSize: '0.75rem' }}>
                        <div>{member.email || 'No email'}</div>
                        <div>{member.phone || 'No phone'}</div>
                      </div>
                    </td>
                    <td>
                      {member.plan_name || 'No plan'}
                      <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                        ₹{member.plan_price || 0}
                      </div>
                    </td>
                    <td>{member.end_date}</td>
                    <td>{getStatusBadge(member.status, member.end_date)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowRenewModal(true);
                          }}
                          className="button button-success"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          Renew
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="button button-danger"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                        >
                          Suspend
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 p-4">
            No members found
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <AddMemberModal
          plans={plans}
          onSubmit={handleAddMember}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Renew Member Modal */}
      {showRenewModal && selectedMember && (
        <RenewMemberModal
          member={selectedMember}
          plans={plans}
          onSubmit={handleRenewMember}
          onClose={() => {
            setShowRenewModal(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
};

// Add Member Modal Component
const AddMemberModal = ({ plans, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    planId: '',
    joinDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-calculate end date when plan changes
    if (name === 'planId' && value) {
      const selectedPlan = plans.find(p => p.id === parseInt(value));
      if (selectedPlan) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + selectedPlan.duration_days);
        setFormData(prev => ({ 
          ...prev, 
          endDate: endDate.toISOString().split('T')[0] 
        }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Add New Member</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem' }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  name="name"
                  className="input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  className="input"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Membership Plan *</label>
                <select
                  name="planId"
                  className="select"
                  value={formData.planId}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price} ({plan.duration_days} days)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Join Date</label>
                <input
                  type="date"
                  name="joinDate"
                  className="input"
                  value={formData.joinDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  className="input"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                name="address"
                className="input"
                rows="3"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="button button-secondary">
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Renew Member Modal Component
const RenewMemberModal = ({ member, plans, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    memberId: member.id,
    planId: member.plan_id || '',
    paymentDetails: {
      mode: 'cash',
      note: 'Membership renewal'
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const selectedPlan = plans.find(p => p.id === parseInt(formData.planId));

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Renew Membership - {member.name}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem' }}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="alert alert-info mb-4">
              Current membership expires on: <strong>{member.end_date}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">Select Plan *</label>
              <select
                value={formData.planId}
                onChange={(e) => setFormData(prev => ({ ...prev, planId: e.target.value }))}
                className="select"
                required
              >
                <option value="">Select a plan</option>
                {plans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - ₹{plan.price} ({plan.duration_days} days)
                  </option>
                ))}
              </select>
            </div>

            {selectedPlan && (
              <div className="alert alert-success">
                <strong>Plan Details:</strong><br />
                Amount: ₹{selectedPlan.price}<br />
                Duration: {selectedPlan.duration_days} days<br />
                Description: {selectedPlan.description}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select
                value={formData.paymentDetails.mode}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  paymentDetails: { ...prev.paymentDetails, mode: e.target.value }
                }))}
                className="select"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Note</label>
              <input
                type="text"
                value={formData.paymentDetails.note}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  paymentDetails: { ...prev.paymentDetails, note: e.target.value }
                }))}
                className="input"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="button button-secondary">
              Cancel
            </button>
            <button type="submit" className="button button-success" disabled={!selectedPlan}>
              Renew Membership
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Members;
