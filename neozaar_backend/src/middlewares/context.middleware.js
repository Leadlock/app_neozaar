// middleware/context.middleware.js
const requestContext = require("../utils/requestContext");

module.exports = (req, res, next) => {
    requestContext.run(
        { userId: req.user?.id, email: req.user?.email , password: req.user?.password},
        next
    );
};
