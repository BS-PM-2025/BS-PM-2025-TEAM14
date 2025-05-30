# System Notifications

A comprehensive system notification feature that provides real-time announcements across the academic portal.

## Components

### SystemNotificationBar
A fixed top notification bar that displays active system announcements with scrolling text animation.

**Features:**
- Real-time announcement display
- Automatic rotation between multiple announcements (8-second intervals)
- Smooth left-to-right scrolling animation
- Auto-refresh every 5 minutes
- Loading and error states
- Mobile responsive design
- Admin badge with admin email
- Announcement counter indicator

**Usage:**
```jsx
import { SystemNotificationBar } from './SystemNotifications';

// In your main layout component
<SystemNotificationBar />
```

### AdminAnnouncementPanel
Administrative interface for creating and managing system announcements.

**Features:**
- Create new announcements with title, message, type, and expiration
- AI news generation capability
- Toggle announcement active/inactive status
- Delete announcements
- Role-based access control (admin/secretary only)
- Real-time announcement management
- Announcement type categorization
- Expiration date support

**Usage:**
```jsx
import { AdminAnnouncementPanel } from './SystemNotifications';

// In your admin dashboard
<AdminAnnouncementPanel />
```

## File Structure

```
SystemNotifications/
├── index.js                      # Clean exports
├── SystemNotificationBar.jsx     # Top notification display
├── SystemNotificationBar.css     # Notification bar styling
├── AdminAnnouncementPanel.jsx    # Admin management interface
├── AdminAnnouncementPanel.css    # Admin panel styling
└── README.md                     # This documentation
```

## API Endpoints

The components integrate with these backend endpoints:

- `GET /api/announcements/active` - Fetch active announcements
- `GET /api/announcements` - Fetch all announcements (admin)
- `POST /api/announcements` - Create new announcement
- `PUT /api/announcements/{id}/toggle` - Toggle announcement status
- `DELETE /api/announcements/{id}` - Delete announcement
- `POST /api/announcements/generate-ai-news` - Generate AI news

## Database Schema

```sql
CREATE TABLE system_announcements (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    admin_email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    announcement_type VARCHAR(50) NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_date DATETIME,
    FOREIGN KEY(admin_email) REFERENCES users(email)
);
```

## Styling

The components use modern CSS with:
- CSS Grid and Flexbox layouts
- CSS animations for scrolling text
- Responsive design breakpoints
- CSS custom properties for theming
- Modern shadows and gradients
- Backdrop filters for glassmorphism effects

## Dependencies

- React (hooks: useState, useEffect, useContext)
- UserContext for authentication
- FontAwesome icons
- Backend API integration

## Configuration

### CSS Variables
The notification bar positioning can be adjusted via:
```css
.system-notification-bar {
    top: 80px; /* Adjust based on your nav bar height */
}
```

### Animation Timing
Scroll timing can be modified in CSS:
```css
.scrolling-message {
    animation: scroll-left 15s linear infinite; /* Adjust duration */
}
```

### Refresh Intervals
Auto-refresh timing in SystemNotificationBar.jsx:
```javascript
const refreshInterval = setInterval(fetchAnnouncements, 5 * 60 * 1000); // 5 minutes
const rotationInterval = setInterval(() => {...}, 8000); // 8 seconds
```

## Features

### Real-time Updates
- Announcements refresh automatically every 5 minutes
- Multiple announcements rotate every 8 seconds
- Immediate updates when admin makes changes

### AI Integration
- OpenAI-powered news generation
- Automatic categorization as 'ai_generated'
- Admin can generate relevant academic news

### Responsive Design
- Mobile-optimized notification bar
- Responsive admin panel
- Touch-friendly interface

### Access Control
- Role-based permissions (admin/secretary)
- Secure API endpoints
- User email tracking for announcements

## Troubleshooting

### Notification bar not showing
- Check if there are active announcements in the database
- Verify backend API is running on http://localhost:8000
- Check browser console for network errors

### AI generation not working
- Ensure OPENAI_API_KEY is properly configured in backend/.env
- Check backend logs for OpenAI API errors
- Verify API key has sufficient credits

### Positioning issues
- Adjust `top` value in SystemNotificationBar.css
- Ensure z-index values don't conflict with other components
- Check for CSS conflicts with existing navigation

## Future Enhancements

- Push notification support
- Rich text formatting for announcements
- Scheduled announcements
- Multi-language support
- Sound notifications
- Click-to-dismiss functionality 