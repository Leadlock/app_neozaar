/* eslint-disable indent */
const { STATUS_CODES, VARIABLE, MESSAGES } = require('../config/common.constant.js');

// Hardcoded categories
const categoryList = [
  { id: 1, name: 'Cloud Infra' },
  { id: 2, name: 'Data & AI' },
  { id: 3, name: 'Security' },
  { id: 4, name: 'DevOps' },
  { id: 5, name: 'FinOps' },
  { id: 6, name: 'Digital Workplace' },
  { id: 7, name: 'Retail' },
  { id: 8, name: 'GovTech' },
  { id: 9, name: 'HR Tech' },
  { id: 10, name: 'Health Tech' },
  { id: 11, name: 'Others' }
];

// Hardcoded AWS services
const awsServices = [
  "EC2",
  "S3",
  "Lambda",
  "RDS",
  "CloudTrail",
  "GuardDuty"
];

// Hardcoded Azure services
const azureServices = [
  "Virtual Machines",
  "Storage Accounts",
  "Azure Functions",
  "SQL Database",
  "Security Center"
];

const cloudPlatformList = [
  { id: 1, name: 'AWS' },
  { id: 2, name: 'Azure' },
  { id: 3, name: 'GCP' },
  { id: 4, name: 'SaaS' },
  { id: 5, name: 'On-Premise' }
];
/**
 * Get Categories
 */
const getCategories = () => {
  return {
    [VARIABLE.STATUS]: VARIABLE.SUCCESS,
    [VARIABLE.MESSAGE]: 'Category list fetched successfully',
    [VARIABLE.DATA]: categoryList
  };
};

/**
 * Get AWS Services
 */
const getAwsServices = () => {
  return {
    [VARIABLE.STATUS]: VARIABLE.SUCCESS,
    [VARIABLE.MESSAGE]: 'AWS services fetched successfully',
    [VARIABLE.DATA]: awsServices
  };
};

/**
 * Get Azure Services
 */
const getAzureServices = () => {
  return {
    [VARIABLE.STATUS]: VARIABLE.SUCCESS,
    [VARIABLE.MESSAGE]: 'Azure services fetched successfully',
    [VARIABLE.DATA]: azureServices
  };
};

const getCloudPlatforms = () => {
  return {
    [VARIABLE.STATUS]: VARIABLE.SUCCESS,
    [VARIABLE.MESSAGE]: 'Cloud platforms fetched successfully',
    [VARIABLE.DATA]: cloudPlatformList
  };
};

module.exports = {
  getCategories,
  getAwsServices,
  getAzureServices,
    getCloudPlatforms

};
