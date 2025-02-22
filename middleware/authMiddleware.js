import jwt from 'jsonwebtoken';

const authenticateUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token

    if (!token) {
        return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    try {
        // Verify JWT Token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken; // Attach user data to request
        next();
    } catch (error) {
        res.status(401).json({ error: "Unauthorized - Invalid token" });
    }
};

export default authenticateUser;
