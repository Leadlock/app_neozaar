const axios = require("axios");
const apiConfig = require('../../utils/apiConfig')
const CrmTokenService = require('./crmToken.service')
const User = require('../../models/User');
const requestContext = require("../../utils/requestContext");

const CRM_BASE_URL = apiConfig.CRMAPI.CRM_BASE_URL;
const CRM_API_KEY = apiConfig.CRMAPI.CRM_API_KEY;
const CRM_API_SECRET = apiConfig.CRMAPI.CRM_API_SECRET;
const EMAIL = apiConfig.CRMAPI.CRM_EMAIL;
const PASSWORD = apiConfig.CRMAPI.CRM_PASSWORD;

class CrmApiService {

    static client = axios.create({
        baseURL: CRM_BASE_URL,
        headers: {
            "X-API-KEY": CRM_API_KEY,
            "X-API-SECRET": CRM_API_SECRET,
            "Content-Type": "application/json",
        },
        timeout: 10000,
    });

    static async login(data) {
        const res = await this.client.post("login", data);
        const token = res.data.token;
        const expires = res.data.expires_in || 3600;
        CrmTokenService.setToken(token, expires);
        return token;
    }

    static async loginToCrm() {
        try {
            const res = await CrmApiService.client.post("user/login", {
                email: EMAIL,
                password: PASSWORD
            });
            const token = res.data.token;
            const expires = res.data.expires_in || 3600;
            CrmTokenService.setToken(token, expires);
            return token;
        } catch (error) {
            // Surface a clean error — caller is responsible for logging
            throw new Error("CRM authentication failed");
        }
    }


    static async request(method, url, data = {}) {
        let token = CrmTokenService.getToken();
        if (!token) {
            token = await CrmApiService.loginToCrm();
        }
        try {
            return await CrmApiService.client({ method, url, data,
                headers: {
                    "Authorization": `Bearer ${token}`,
                }
            });

        } catch (err) {
            if (err.response?.status === 401) {
                const newToken = await CrmApiService.loginToCrm();
                return await CrmApiService.client({ method, url, data,
                    headers: {
                        "Authorization": `Bearer ${newToken}`,
                    }
                });
            }
            throw err;
        }
    }


    static async createIsvUser(data) {
        try {
            const res = await this.client.post("user/create", data);
            const response = res.data || {};
            const result = {
                success: response.status ?? response.success ?? true,
                message: response.message ?? "Success",
                data: response.data ?? response.customer ?? response.result ?? response,
                raw: response 
            };
            console.log("CRM Customer Created:", result);
            return result;

        } catch (err) {
            const errorResponse = err.response?.data || err.message || err;
            const result = {
                success: false,
                message: errorResponse.message || "CRM API Error",
                data: null,
                raw: errorResponse
            };
            console.error("CRM Error:", result);
            return result; // return structured error
        }
    }

    static async createAccount(data) {
        try {
            const res = await this.client.post("account/create", data);
            const response = res.data || {};
            const result = {
                success: response.status ?? response.success ?? true,
                message: response.message ?? "Success",
                data: response.data ?? response.customer ?? response.result ?? response,
                raw: response 
            };
            console.log("CRM Account Created:", result);
            return result;

        } catch (err) {
            const errorResponse = err.response?.data || err.message || err;
            const result = {
                success: false,
                message: errorResponse.message || "CRM API Error",
                data: null,
                raw: errorResponse
            };
            console.error("CRM Error:", result);
            return result; // return structured error
        }
    }

    static async createProduct(data){
        try{
            const res = await CrmApiService.request('POST', "product/create", data);
            const response = res.data || {};
            return {
                success: response.status ?? response.success ?? true,
                message: response.message ?? "Success",
                data: response.data ?? response.customer ?? response.result ?? response,
                raw: response
            };
        } catch (err) {
            const message = err.message || "CRM API Error";
            return {
                success: false,
                message,
                data: null,
                raw: err.response?.data || message
            };
        }
    }

    static async createLead(data){
        try{
             const res = await this.client.post("leads/create", data);
            const response = res.data || {};
            const result = {
                success: response.status ?? response.success ?? true,
                message: response.message ?? "Success",
                data: response.data ?? response.customer ?? response.result ?? response,
                raw: response 
            };
            return result;
        } catch (err) {
            const errorResponse = err.response?.data || err.message || err;
            const result = {
                success: false,
                message: errorResponse.message || "CRM API Error",
                data: null,
                raw: errorResponse
            };
            console.error("CRM Error:", err);
            return result; // return structured error
        }
    }


}

module.exports = CrmApiService;
