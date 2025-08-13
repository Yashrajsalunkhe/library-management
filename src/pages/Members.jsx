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
    const member = members.find(m => m.id === memberId);
    const action = member.status === 'suspended' ? 'activate' : 'suspend';
    const confirmMessage = action === 'suspend' 
      ? 'Are you sure you want to suspend this member?' 
      : 'Are you sure you want to activate this member?';
    
    if (confirm(confirmMessage)) {
      try {
        const result = await window.api.member.delete(memberId);
        if (result.success) {
          success(`Member ${action}d successfully`);
          loadMembers();
        } else {
          error(result.message || `Failed to ${action} member`);
        }
      } catch (err) {
        error(`Failed to ${action} member`);
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

  const activeMembers = members.filter(member => 
    member.status !== 'suspended' && 
    (!filters.search || 
      member.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      member.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      member.phone?.includes(filters.search))
  );

  const suspendedMembers = members.filter(member => 
    member.status === 'suspended' && 
    (!filters.search || 
      member.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      member.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
      member.phone?.includes(filters.search))
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Loading members...
      </div>
    );
  }

  const renderMembersTable = (membersList, title, showActions = true) => (
    <div className="card mb-6">
      <div className="card-header">
        <h3 className="card-title">{title} ({membersList.length})</h3>
      </div>
      {membersList.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Birth Date</th>
                <th>City</th>
                <th>Seat No</th>
                <th>Plan</th>
                <th>Join Date</th>
                <th>End Date</th>
                <th>Status</th>
                {showActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {membersList.map(member => (
                <tr key={member.id}>
                  <td>#{member.id}</td>
                  <td>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      {member.qr_code && (
                        <div className="text-sm text-gray-500">QR: {member.qr_code}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      <div>{member.email || 'No email'}</div>
                      <div>{member.phone || 'No phone'}</div>
                    </div>
                  </td>
                  <td>
                    {member.birth_date ? new Date(member.birth_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>{member.city || 'N/A'}</td>
                  <td>
                    <span className="badge badge-info">#{member.seat_no || 'N/A'}</span>
                  </td>
                  <td>
                    <div>
                      <div>{member.plan_name || 'No plan'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#718096' }}>
                        ₹{member.plan_price || 0}
                      </div>
                    </div>
                  </td>
                  <td>{new Date(member.join_date).toLocaleDateString()}</td>
                  <td>{new Date(member.end_date).toLocaleDateString()}</td>
                  <td>{getStatusBadge(member.status, member.end_date)}</td>
                  {showActions && (
                    <td>
                      <div className="flex gap-2">
                        {member.status !== 'suspended' && (
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setShowRenewModal(true);
                            }}
                            className="button button-success button-sm"
                          >
                            Renew
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="button button-danger button-sm"
                        >
                          {member.status === 'suspended' ? 'Activate' : 'Suspend'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 p-4">
          No {title.toLowerCase()} found
        </div>
      )}
    </div>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>👥 Members Management</h1>
          <p>Manage library members and their memberships</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="button button-primary"
        >
          <span style={{ marginRight: '0.5rem' }}>➕</span>
          Add Member
        </button>
      </div>

      {/* Search Filter */}
      <div className="card mb-4">
        <div className="search-section">
          <label>
            <span className="search-icon">🔍</span>
            Search Members
          </label>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or phone..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
      </div>

      {/* Active Members Section */}
      {renderMembersTable(activeMembers, 'Active Members', true)}

      {/* Suspended Members Section */}
      {suspendedMembers.length > 0 && (
        <>
          <div className="alert alert-warning mb-4">
            <strong>⚠️ Suspended Members</strong> - These members have been suspended and cannot access library services.
          </div>
          {renderMembersTable(suspendedMembers, 'Suspended Members', true)}
        </>
      )}

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
    birthDate: '',
    city: '',
    address: '',
    seatNo: '',
    planId: '',
    joinDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });
  const [nextSeatNumber, setNextSeatNumber] = useState('');

  useEffect(() => {
    loadNextSeatNumber();
  }, []);

  const loadNextSeatNumber = async () => {
    try {
      const result = await window.api.member.getNextSeatNumber();
      if (result.success) {
        setNextSeatNumber(result.data);
        setFormData(prev => ({ ...prev, seatNo: result.data }));
      }
    } catch (error) {
      console.error('Failed to get next seat number:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-calculate end date when plan changes
    if (name === 'planId' && value) {
      const selectedPlan = plans.find(p => p.id === parseInt(value));
      if (selectedPlan) {
        const joinDate = new Date(formData.joinDate);
        const endDate = new Date(joinDate);
        endDate.setDate(endDate.getDate() + selectedPlan.duration_days);
        setFormData(prev => ({ 
          ...prev, 
          endDate: endDate.toISOString().split('T')[0] 
        }));
      }
    }

    // Auto-calculate end date when join date changes
    if (name === 'joinDate' && value && formData.planId) {
      const selectedPlan = plans.find(p => p.id === parseInt(formData.planId));
      if (selectedPlan) {
        const joinDate = new Date(value);
        const endDate = new Date(joinDate);
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
      <div className="modal member-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">👤 Add New Member</h3>
          <button onClick={onClose} className="modal-close" aria-label="Close modal">×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-section">
              <h4>Personal Information</h4>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
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
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Mobile No *</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Birth Date</label>
                  <input
                    type="date"
                    name="birthDate"
                    className="form-control"
                    value={formData.birthDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="form-control"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Seat No</label>
                  <input
                    type="text"
                    name="seatNo"
                    className="form-control"
                    value={formData.seatNo}
                    onChange={handleChange}
                    placeholder={`Next available: ${nextSeatNumber}`}
                  />
                  <small className="form-help">Leave empty to auto-assign next available seat</small>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Membership Details</h4>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label required">Membership Plan *</label>
                  <select
                    name="planId"
                    className="form-control"
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
                  <label className="form-label required">Join Date *</label>
                  <input
                    type="date"
                    name="joinDate"
                    className="form-control"
                    value={formData.joinDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">End Date *</label>
                  <input
                    type="date"
                    name="endDate"
                    className="form-control"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  name="address"
                  className="form-control"
                  rows="3"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter full address..."
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="button button-secondary">
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              👤 Add Member
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
