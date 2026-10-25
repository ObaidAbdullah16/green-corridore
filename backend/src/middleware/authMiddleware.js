/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces role permissions for Citizen and Authority users.
 * 
 * - Citizen: Can report and view hazards. Cannot resolve hazards.
 * - Authority: Can view, report, and resolve road hazards.
 */

const VALID_ROLES = ['citizen', 'authority'];
const AUTHORITY_PASSKEY = process.env.AUTHORITY_PASSKEY || 'admin123';

/**
 * Middleware to extract and validate user role from request headers.
 */
export function extractRole(req, res, next) {
  const roleHeader = req.headers['x-user-role'] || req.headers['role'];
  const userRole = (roleHeader ? String(roleHeader).toLowerCase().trim() : 'citizen');

  if (VALID_ROLES.includes(userRole)) {
    req.userRole = userRole;
  } else {
    req.userRole = 'citizen'; // Default fallback
  }

  next();
}

/**
 * Middleware to require specific role(s) to access an endpoint.
 * @param {string[]} allowedRoles - Array of allowed roles, e.g. ['authority']
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.userRole || (req.headers['x-user-role'] || 'citizen').toLowerCase().trim();

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_ROLE',
        message: `Access Denied: This operation requires '${allowedRoles.join('\' or \'')}' permissions. Your current role is '${role}'. Citizens cannot resolve hazards.`,
        requiredRole: allowedRoles,
        currentRole: role
      });
    }

    next();
  };
}

/**
 * Optional helper to verify authority credentials/passcode
 */
export function verifyAuthorityPasscode(passcode) {
  if (!passcode) return false;
  return passcode.trim() === AUTHORITY_PASSKEY || passcode.trim().toLowerCase() === 'authority';
}
