const axios = require("axios");
const apiConfig = require('../../utils/apiConfig')


class CrmTokenService {
    constructor() {
        this.crmToken = null;
        this.crmTokenExpiry = null;
    }

    setToken(token, expiresInSeconds = 3600) {
        this.crmToken = token;
        this.crmTokenExpiry = Date.now() + expiresInSeconds * 1000;
    }

    getToken() {
        if (!this.crmToken || Date.now() > this.crmTokenExpiry) {
            return null; // expired or missing
        }
        return this.crmToken;
    }

    clearToken() {
        this.crmToken = null;
        this.crmTokenExpiry = null;
    }
}

module.exports = new CrmTokenService();  // singleton instance
