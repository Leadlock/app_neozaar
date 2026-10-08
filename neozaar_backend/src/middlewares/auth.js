const jwt = require('jsonwebtoken');


const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    // const token = req.session.token;
    if (!token) {
        return res.status(401).json({ status: 'fail', code: 401, message: 'Access denied. No token provided.' });
    }
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        // Distinguish an expired session from a genuinely malformed/forged
        // token. Both are auth failures (401), but the client can react
        // differently — an expired token should send the user to re-login,
        // whereas a bad-signature token is a hard failure. Returning 401 (not
        // 400) also lets the frontend's shared 401 handling kick in.
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ status: 'fail', code: 401, message: 'Token expired' });
        }
        return res.status(401).json({ status: 'fail', code: 401, message: 'Invalid token' });
    }
};

module.exports = verifyToken;
