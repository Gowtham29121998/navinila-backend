const admin = (req, res, next) => {
  console.log("Checking Admin Access for user:", req.user?.username, "| Role:", req.user?.role);
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export { admin };
