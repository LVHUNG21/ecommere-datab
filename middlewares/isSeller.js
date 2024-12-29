// isSeller middleware
const isSeller = (req, res, next) => {
    const userId = req.user.id;

    const query = 'SELECT userType FROM E_User WHERE user_id = ?';
    connection.query(query, [userId], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0 || results[0].userType !== 'seller') {
            return res.status(403).json({ error: 'You are not authorized' });
        }
        next();
    });
};

module.exports = { isSeller };
