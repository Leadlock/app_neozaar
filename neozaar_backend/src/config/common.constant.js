/* eslint-disable indent */
// Common status codes
const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

const VARIABLE = {
  STATUS: 'status',
  MESSAGE: 'message',
  SUCCESS: 'success',
  CODE: 'code',
  FAIL: 'fail',
  DATA: 'data',
  ERROR: 'error',
  FRONTEND_URL: 'http://localhost:5000',
  APP_LOGIN_URL: 'https://www.neozaar.com/auth/login/',
  LOGO: 'https://www.neozaar.com/image/Logo.png'
};

// Common response messages
const MESSAGES = {
  SUCCESS: 'Success',
  ERROR: 'Error',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  VALIDATION_ERROR: 'Validation error'

};

const PAGINATION = {
   DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  build({ total, page, limit, delta = 2 }) {
    const totalPages = Math.ceil(total / limit);
    const current = Math.max(1, Math.min(page, totalPages));
    const range = [];
    const rangeWithDots = [];
    let last;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= current - delta && i <= current + delta)
      ) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (last) {
        if (i - last === 2) {
          rangeWithDots.push(last + 1);
        } else if (i - last > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      last = i;
    }

    return {
      total,
      page: current,
      limit,
      total_pages: totalPages,
      has_prev: current > 1,
      has_next: current < totalPages,
      prev_page: current > 1 ? current - 1 : null,
      next_page: current < totalPages ? current + 1 : null,
      pages: rangeWithDots
    };
  }
};


// Time constants in milliseconds
const TIME = {
  ONE_MINUTE: 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000
};

const AZURE_MAIL = {
  MS_TENANT_ID: process.env.MS_TENANT_ID || '3867b244-8eee-40d4-93b7-0dcf002c1c22',
  MS_CLIENT_ID: process.env.MS_CLIENT_ID || 'c8c10583-f5ba-4062-86ef-00d05bbd6fe9',
  MS_CLIENT_SECRET: process.env.MS_CLIENT_SECRET || '',
  FROM_EMAIL: process.env.FROM_EMAIL || 'no_reply@neozaar.com',
};

const MAIL_CONFIG = {
  MAILER: 'smtp',
  HOST: process.env.MAIL_HOST || 'smtp.office365.com',
  PORT: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 587, //465,
  SECURE: false, // true for 465, false for other ports
  AUTH: {
    USER: process.env.MAIL_USER || 'admin@neozaar.com',
    PASS: process.env.MAIL_PASS || '',
  },
  tls: {
    ciphers: "SSLv3", // optional
    rejectUnauthorized: false, // optional if you're on local dev
  },
};

const FILEUPLOAD = {
  MAX_FILE: 5,
  FILE_UPLOAD_SIZE: 5,
};
const roleType = {
  superadmin: 'SUPER_ADMIN',
  admin: 'ADMIN',
  isv: 'ISV',
  support_partner: 'SUPPORT_PARTNER',
  marketing: 'MARKETING'

};


module.exports = {
  STATUS_CODES,
  MESSAGES,
  PAGINATION,
  TIME,
  VARIABLE,
  MAIL_CONFIG,
  FILEUPLOAD,
  roleType,
  AZURE_MAIL
};

