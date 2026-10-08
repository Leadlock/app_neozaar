const pool = require('../config/database');

/**
 * Get all enums or filter by name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getEnums = async (req, res) => {
    try {
        const { name } = req.query;
        let query = 'SELECT * FROM enums WHERE is_active = true';
        const queryParams = [];

        // Add name filter if provided
        if (name) {
            query += ' AND name = $1';
            queryParams.push(name);
        }

        const result = await pool.query(query, queryParams);
        
        // Format the response
        const enums = {};
        result.rows.forEach(row => {
            enums[row.name] = row.values;
        });

        res.json(enums);
    } catch (error) {
        console.error('Error in getEnums:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getEnums
};
