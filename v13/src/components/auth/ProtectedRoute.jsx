import React from 'react';
import { AccessDeniedView } from '../../views/common/AccessDeniedView.jsx';

export function ProtectedRoute({ user, allowedRoles = [], onReturnToPanel, children }) {
  if (!user) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return <AccessDeniedView user={user} onReturnToPanel={onReturnToPanel} />;
  }

  return children;
}

export default ProtectedRoute;
