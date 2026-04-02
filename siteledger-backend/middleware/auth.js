const jwt = require("jsonwebtoken");

// Middleware — protects all routes that need login
function requireAuth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No token provided" });

  const token = header.split(" ")[1]; // "Bearer <token>"
  if (!token) return res.status(401).json({ error: "Malformed token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role, name }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Middleware — only admins and accountants can access
function requireAdmin(req, res, next) {
  if (!["Administrator", "Accountant", "Site Manager"].includes(req.user.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
