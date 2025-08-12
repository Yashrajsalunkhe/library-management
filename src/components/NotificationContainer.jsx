import { useNotification } from '../contexts/NotificationContext';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      zIndex: 1050,
      maxWidth: '400px',
      width: '100%'
    }}>
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification, onClose }) => {
  const getNotificationStyle = (type) => {
    const baseStyle = {
      marginBottom: '0.5rem',
      padding: '1rem',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      border: '1px solid',
      position: 'relative',
      cursor: 'pointer'
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: '#f0fff4',
          borderColor: '#c6f6d5',
          color: '#22543d'
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: '#fed7d7',
          borderColor: '#feb2b2',
          color: '#742a2a'
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: '#fffbeb',
          borderColor: '#faf089',
          color: '#744210'
        };
      case 'info':
      default:
        return {
          ...baseStyle,
          backgroundColor: '#ebf8ff',
          borderColor: '#bee3f8',
          color: '#2c5282'
        };
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div
      style={getNotificationStyle(notification.type)}
      onClick={onClose}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
          {getIcon(notification.type)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {notification.title && (
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              {notification.title}
            </div>
          )}
          <div style={{ fontSize: '0.875rem', wordBreak: 'break-word' }}>
            {notification.message}
          </div>
          {notification.timestamp && (
            <div style={{ 
              fontSize: '0.75rem', 
              opacity: 0.8, 
              marginTop: '0.25rem' 
            }}>
              {notification.timestamp.toLocaleTimeString()}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            padding: '0',
            opacity: 0.7,
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default NotificationContainer;
