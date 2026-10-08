// Email validation
const validateEmail = (email) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
};

// UUID validation
const validateUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

// AWS Account ID validation
const validateAWSAccountId = (accountId) => {
    const awsAccountIdRegex = /^\d{12}$/;
    return awsAccountIdRegex.test(accountId);
};

module.exports = {
    validateEmail,
    validateUUID,
    validateAWSAccountId
};
