'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/bootstrap.css';
import toast, { Toaster } from 'react-hot-toast';
import { NextSeo } from 'next-seo';

// "Type of advisor" options on the Consulting Advisor form. Keep in sync with
// neozaar_backend/src/config/advisorTypes.js (the backend validates against the same list).
const ADVISOR_TYPES = [
  'Compliance Advisors',
  'HR & People Advisors',
  'Finance & Accounting Advisors',
  'Security & Cybersecurity Advisors',
  'Operations Advisors',
  'AI Advisors',
  'Transformation Advisors',
  'Cloud Infrastructure Advisors',
];

export default function Page({ type: propType }) {
  const effectiveType = propType || 'isv';
  const [step, setStep] = useState(effectiveType === 'revshare' ? 2 : 1);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setloading] = useState(false);
  const [partnerType, setPartnerType] = useState(effectiveType);

  // Fallback: read type from URL only when no prop was provided
  useEffect(() => {
    if (propType) return;
    const type = searchParams.get('type');
    if (type === 'revshare') {
      setPartnerType('revshare');
      setStep(2);
    } else if (type === 'service') {
      setPartnerType('service');
    }
  }, [searchParams, propType]);
  
  // Custom input states
  const [customLegalEntity, setCustomLegalEntity] = useState("");
  const [customCountryInput, setCustomCountryInput] = useState("");

  const [legalEntityTypes, setlegalEntityTypes] = useState([
    { value: "Private Limited", name: "Private Limited" },
    { value: "Public Limited", name: "Public Limited" },
    { value: "Sole Proprietorship", name: "Sole Proprietorship" },
    { value: "Partnership", name: "Partnership" },
    { value: "LLP", name: "LLP" },
    // { value: "Other", name: "Other" },
  ]);
  const [legalEntityTypesData, setlegalEntityTypesData] = useState(null);

  const [headquaterCountry, setHeadquaterCountry] = useState([
    { value: "India", name: "India" },
    { value: "UAE", name: "UAE" },
    { value: "United States", name: "United States" },
    { value: "United Kingdom", name: "United Kingdom" },
    { value: "Germany", name: "Germany" },
    { value: "France", name: "France" },
    { value: "Other", name: "Other" },
  ]);
  const [headquaterCountryData, setheadquaterCountryData] = useState(null);

  // Form state
  const getRoleId = () => {
    switch (partnerType) {
      case 'isv': return 2;
      case 'service': return 8; // Service Partner → SUPPORT_PARTNER
      case 'revshare': return 7; // Revenue Share → AGENT (affiliate)
      default: return 2;
    }
  };
  const [company_name, setCompanyName] = useState('');
  const [sla_link, setSlaLink] = useState('');
  const [terms_of_use_link, setTermsofuseurl] = useState('');
  const [country_type, setCountryType] = useState('IN');
  const [registered_business_name, setCompanyregisterName] = useState('');
  const [brand_name, setBrandtName] = useState('');
  const [website_url, setCompanyWebsite] = useState('');
  const [linkedin_url, setLinkedin] = useState('');
  const [brand_logo, setBrandLogo] = useState(null);
  const [brandLogoName, setBrandLogoName] = useState('');
  const [headquater_country, setHeadQuater] = useState('');
  const [tax_id, setTaxId] = useState('');
  const [tax_type, setTaxType] = useState('GST');
  const [legal_entity_type, setLegalEntityType] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [support_desk_email, setDeskEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('12345689');
  const [designation, setDesignation] = useState('');
  const [advisor_type, setAdvisorType] = useState('');
  const [existing_marketplace_listing, setExistingMarket] = useState([]);
  const [selectedServiceSubOptions, setSelectedServiceSubOptions] = useState({});
  const [expandedServiceTab, setExpandedServiceTab] = useState(null);
  const [cloud_partnership, setCloudPartnership] = useState([]);
  const [preferred_engagement, setPreferred] = useState('Reseller');
  const [neozaar_tc, setNeozaartc] = useState(false);
  const [data_privacy, setDataPrivacy] = useState(false);
  const [businessCert, setBusinessCert] = useState(null);
  const [businessCertName, setBusinessCertName] = useState('');

  // Platform and marketplace states
  const [platforms, setPlatforms] = useState([
    { id: 'aws', label: 'AWS' },
    { id: 'azure', label: 'Azure' },
    { id: 'gcp', label: 'GCP' },
  ]);
  const [marketplace, setMarketplace] = useState([
    { id: 'aws', label: 'AWS' },
    { id: 'azure', label: 'Azure' },
    { id: 'gcp', label: 'GCP' },
  ]);
  const [showPlatformInput, setShowPlatformInput] = useState(false);
  const [newPlatform, setNewPlatform] = useState('');
  const [showMarketplaceInput, setShowMarketplaceInput] = useState(false);
  const [newMarketplace, setNewMarketplace] = useState('');

  // Validation function for custom country input
  const isCustomCountryValid = () => {
    if (!customCountryInput || customCountryInput.trim().length < 3) {
      return false;
    }
    
    // Check if it contains only allowed characters
    if (!/^[A-Za-z\s\-\']+$/.test(customCountryInput.trim())) {
      return false;
    }
    
    // Check if it contains at least 3 letters (not counting spaces)
    const letterCount = (customCountryInput.match(/[A-Za-z]/g) || []).length;
    if (letterCount < 3) {
      return false;
    }
    
    return true;
  };

  // Validation function for custom legal entity
  const isCustomLegalEntityValid = () => {
    if (!customLegalEntity || customLegalEntity.trim().length < 3) {
      return false;
    }
    return true;
  };

  // Revalidate tax_id when headquater_country changes
  useEffect(() => {
    if (touched.tax_id && tax_id) {
      const error = validateField('tax_id', tax_id);
      setErrors(prev => ({ ...prev, tax_id: error }));
    }
  }, [headquater_country]);

  const validationRules = {
    company_name: {
      required: true,
      pattern: /^(?=.*[A-Za-z])[A-Za-z0-9 ]{3,}$/,
      message: "Company name should only contain letters, numbers, and spaces."
    },

    designation: {
      required: true,
      pattern: /^(?=.*[A-Za-z])[A-Za-z0-9 ]{3,}$/,
      message: "Designation should only contain letters and spaces."
    },

    advisor_type: {
      required: true,
      message: "Please select the type of advisor."
    },

    registered_business_name: {
      required: true,
      pattern: /^(?=.*[A-Za-z])[A-Za-z0-9 ]{3,}$/,
      message: "Registration name should only contain letters, numbers, and spaces."
    },

    sla_link: {
      required: true,
      validate: (value) => {
        if (!value || value.trim() === "") {
          return "SLA Link is required.";
        }
        const urlPattern = /^(https?:\/\/)([\w.-]+)\.([a-z]{2,})([\/\w .-]*)*\/?$/i;
        if (!urlPattern.test(value)) {
          return "Please enter a valid URL (e.g., https://example.com/sla).";
        }
        return null;
      },
    },
    
    terms_of_use_link: {
      required: true,
      validate: (value) => {
        if (!value || value.trim() === "") {
          return "Terms of Use Link is required.";
        }
        const urlPattern = /^(https?:\/\/)([\w.-]+)\.([a-z]{2,})([\/\w .-]*)*\/?$/i;
        if (!urlPattern.test(value)) {
          return "Please enter a valid URL (e.g., https://example.com/terms).";
        }
        return null;
      },
    },

    brand_name: {
      required: true,
      pattern: /^(?=.*[A-Za-z])[A-Za-z0-9 ]{3,}$/,
      message: "Brand name should only contain letters, numbers, and spaces."
    },

    website_url: {
      required: true,
      pattern: /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/\S*)?$/,
      message: "Enter a valid website URL."
    },

    linkedin_url: {
      required: false,
      pattern: /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in|pub|company)\/[a-zA-Z0-9_\-\.]+\/?$/,
      message: "Enter a valid LinkedIn URL."
    },

    headquater_country: {
      required: true,
      validate: (value) => {
        if (!value || value.trim() === "") {
          return "Headquarter country is required.";
        }
        if (value === "Other") {
          return null; // We'll handle "Other" separately
        }
        return null;
      }
    },

    tax_id: {
      required: true,
      validate: (value, allValues = {}) => {
        if (!value) return "Tax ID is required.";
        const country = allValues.headquater_country || "";
        
        if (value.length > 20) return "Tax ID must not exceed 20 characters.";

        if (country === "UAE") {
          return /^[0-9]{15}$/.test(value) ? null : "For UAE, Tax ID must be exactly 15 digits.";
        }
        if (country === "India") {
          return /^[0-9A-Z]{15}$/.test(value) ? null : "For India, Tax ID must be exactly 15 alphanumeric characters.";
        }
        
        return /^[A-Za-z0-9-]*$/.test(value) ? null : "Tax ID can only contain letters, numbers, and hyphens.";
      }
    },

    legal_entity_type: {
      required: true,
      validate: (value) => {
        if (!value || value.trim() === "") {
          return "Legal entity type is required.";
        }
        if (value === "Other") {
          return null; // We'll handle "Other" separately
        }
        return null;
      }
    },

    brand_logo: {
      required: true,
      validate: (file) => {
        if (!file) return "Brand logo is required.";
        const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB
        const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
        
        if (!ALLOWED_TYPES.includes(file.type)) {
          return "Please upload a valid image file (PNG, JPG, JPEG, WEBP, SVG).";
        }
        if (file.size > MAX_FILE_SIZE) {
          return "File size must be less than 1MB.";
        }
        return null;
      }
    },

    name: {
      required: true,
      pattern: /^[A-Za-z]{3}[A-Za-z\s]*$/,
      message: "Personal name should only contain letters and spaces."
    },

    mobile: {
      required: true,
      validate: (value, allValues = {}) => {
        if (!value) return "Please provide a mobile number.";
        const countryPhoneLength = {
          IN: 12, AE: 12, SG: 10, US: 11, UK: 12,
          SA: 12, AU: 11, DE: 12, FR: 11,
        };
        const selectedCountry = allValues.country_type?.toUpperCase() || "IN";
        const minLen = countryPhoneLength[selectedCountry] ?? 8;
        const digits = value.replace(/\D/g, "");
        
        if (digits.length < minLen) {
          return `Please provide a valid phone number for ${selectedCountry}`;
        }
        return null;
      }
    },

  email: {
  required: true,
  validate: (value) => {
    if (!value) return "Email is required.";

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address.";
    }

    const [prefix, domainPart] = value.split("@");

    // ✅ allow letters, numbers, dot
    if (!/^[A-Za-z0-9.]+$/.test(prefix)) {
      return "The part before @ can contain only letters, numbers, and dots.";
    }

    const blockedDomains = [
      "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
      "aol.com", "icloud.com", "protonmail.com", "zoho.com", "yandex.com"
    ];

    if (domainPart && blockedDomains.includes(domainPart.toLowerCase())) {
      return "Please provide an official (non-personal) email address.";
    }

    return null;
  }
},


support_desk_email: {
  required: true,
  validate: (value) => {
    if (!value) return "Email is required.";

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address.";
    }

    const [prefix, domainPart] = value.split("@");

    if (prefix.length < 2) {
      return "The part before @ must be at least 2 characters.";
    }

    if (!/^[A-Za-z0-9.]+$/.test(prefix)) {
      return "The part before @ can contain only letters, numbers, and dots.";
    }

    const blockedDomains = [
      "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
      "aol.com", "icloud.com", "protonmail.com", "zoho.com", "yandex.com"
    ];

    if (domainPart && blockedDomains.includes(domainPart.toLowerCase())) {
      return "Please provide an official (non-personal) email address.";
    }

    return null;
  }
},


    neozaar_tc: {
      required: true,
      message: "Please agree to the Terms Of Use"
    },

    data_privacy: {
      required: true,
      message: "Please agree to the Privacy Policy"
    },
    
    businessCert: {
      required: true,
      validate: (file) => {
        if (!file) return "Business certification document is required.";
        const MAX_FILE_SIZE = 200 * 1024; // 200 KB
        const ALLOWED_TYPES = [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/jpg"
        ];
        
        if (!ALLOWED_TYPES.includes(file.type)) {
          return "Please upload a valid file (PDF, PNG, JPG, JPEG).";
        }
        if (file.size > MAX_FILE_SIZE) {
          return "File size must be less than 200kb.";
        }
        return null;
      }
    },
  };

  // Validate a single field
  const validateField = (name, value) => {
    const rule = validationRules[name];
    if (!rule) return null;

    if (rule.required) {
      if (value === null || value === undefined || value === '') {
        return rule.message || `Please provide ${name.replace(/_/g, ' ')}.`;
      }
      if (typeof value === 'boolean' && !value) {
        return rule.message || `Please provide ${name.replace(/_/g, ' ')}.`;
      }
      if (value === null) {
        return rule.message || `Please provide ${name.replace(/_/g, ' ')}.`;
      }
    }

    if (rule.pattern && value && !rule.pattern.test(value)) {
      return rule.message;
    }

    if (rule.minLength && value && value.length < rule.minLength) {
      return rule.message;
    }

    if (rule.validate) {
      const allValues = {
        company_name, registered_business_name, sla_link, terms_of_use_link,
        brand_name, website_url, linkedin_url, tax_id, headquater_country,
        legal_entity_type, name, designation, mobile, password, email,
        support_desk_email, neozaar_tc, data_privacy, brand_logo, businessCert,
        country_type
      };
      return rule.validate(value, allValues);
    }

    return null;
  };

  // Handle field changes with validation
  const handleFieldChange = (fieldName, value) => {
    switch (fieldName) {
      case 'company_name': setCompanyName(value); break;
      case 'registered_business_name': setCompanyregisterName(value); break;
      case 'sla_link': setSlaLink(value); break;
      case 'terms_of_use_link': setTermsofuseurl(value); break;
      case 'brand_name': setBrandtName(value); break;
      case 'website_url': setCompanyWebsite(value); break;
      case 'linkedin_url': setLinkedin(value); break;
      case 'tax_id': setTaxId(value); break;
      case 'headquater_country': 
        setHeadQuater(value);
        if (value !== "Other") {
          setCustomCountryInput("");
          setErrors(prev => ({ ...prev, headquater_country: null }));
        }
        break;
      case 'legal_entity_type': 
        setLegalEntityType(value);
        if (value !== "Other") {
          setCustomLegalEntity("");
          setErrors(prev => ({ ...prev, legal_entity_type: null }));
        }
        break;
      case 'name': setName(value); break;
      case 'designation': setDesignation(value); break;
      case 'advisor_type': setAdvisorType(value); break;
      case 'mobile': setMobile(value); break;
      case 'password': setPassword(value); break;
      case 'email': setEmail(value); break;
      case 'support_desk_email': setDeskEmail(value); break;
      case 'neozaar_tc': setNeozaartc(value); break;
      case 'data_privacy': setDataPrivacy(value); break;
      default: break;
    }

    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  // Handle field blur events
  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    let value;
    switch (fieldName) {
      case 'company_name': value = company_name; break;
      case 'registered_business_name': value = registered_business_name; break;
      case 'sla_link': value = sla_link; break;
      case 'terms_of_use_link': value = terms_of_use_link; break;
      case 'brand_name': value = brand_name; break;
      case 'website_url': value = website_url; break;
      case 'linkedin_url': value = linkedin_url; break;
      case 'tax_id': value = tax_id; break;
      case 'headquater_country': value = headquater_country; break;
      case 'legal_entity_type': value = legal_entity_type; break;
      case 'name': value = name; break;
      case 'designation': value = designation; break;
        case 'advisor_type': value = advisor_type; break;
      case 'mobile': value = mobile; break;
      case 'password': value = password; break;
      case 'email': value = email; break;
      case 'support_desk_email': value = support_desk_email; break;
      case 'neozaar_tc': value = neozaar_tc; break;
      case 'data_privacy': value = data_privacy; break;
      case 'brand_logo': value = brand_logo; break;
      case 'businessCert': value = businessCert; break;
      default: value = null;
    }

    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  // Validate revshare consent (T&C + privacy for revshare form)
  const validateRevshareConsent = () => {
    const newErrors = {};
    let isValid = true;
    if (!neozaar_tc) { newErrors.neozaar_tc = "Please agree to the Terms Of Use"; isValid = false; }
    if (!data_privacy) { newErrors.data_privacy = "Please agree to the Privacy Policy"; isValid = false; }
    setErrors(prev => ({ ...prev, ...newErrors }));
    return isValid;
  };

  // Validate all fields in current step
  const validateStep = (stepNumber) => {
    const stepFields = {
      1: ['company_name', 'registered_business_name', 'sla_link',
        'brand_name', 'website_url', 'tax_id', 'headquater_country',
        'legal_entity_type', 'brand_logo'],
      2: ['name', 'designation', ...(partnerType === 'revshare' ? ['advisor_type'] : []), 'mobile', 'email', 'support_desk_email'],
      3: partnerType === 'service' 
        ? ['neozaar_tc', 'data_privacy'] 
        : ['neozaar_tc', 'data_privacy', 'terms_of_use_link']
    };

    const fieldsToValidate = stepFields[stepNumber];
    const newErrors = {};
    let isValid = true;

    const newTouched = { ...touched };
    fieldsToValidate.forEach(field => {
      newTouched[field] = true;

      let value;
      switch (field) {
        case 'company_name': value = company_name; break;
        case 'registered_business_name': value = registered_business_name; break;
        case 'sla_link': value = sla_link; break;
        case 'terms_of_use_link': value = terms_of_use_link; break;
        case 'brand_name': value = brand_name; break;
        case 'website_url': value = website_url; break;
        case 'linkedin_url': value = linkedin_url; break;
        case 'tax_id': value = tax_id; break;
        case 'headquater_country': value = headquater_country; break;
        case 'legal_entity_type': value = legal_entity_type; break;
        case 'name': value = name; break;
        case 'designation': value = designation; break;
        case 'advisor_type': value = advisor_type; break;
        case 'mobile': value = mobile; break;
        case 'password': value = password; break;
        case 'email': value = email; break;
        case 'support_desk_email': value = support_desk_email; break;
        case 'neozaar_tc': value = neozaar_tc; break;
        case 'data_privacy': value = data_privacy; break;
        case 'brand_logo': value = brand_logo; break;
        case 'businessCert': value = businessCert; break;
        default: value = null;
      }

      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    // Special validation for "Other" options
    if (stepNumber === 1) {
      if (headquater_country === "Other" && !isCustomCountryValid()) {
        newErrors.headquater_country = "Please enter a valid country name (minimum 3 letters)";
        isValid = false;
      }
      if (legal_entity_type === "Other" && !isCustomLegalEntityValid()) {
        newErrors.legal_entity_type = "Please enter a valid legal entity type (minimum 3 characters)";
        isValid = false;
      }
    }

    setTouched(newTouched);
    setErrors(newErrors);
    if (!isValid) {
      console.error('❌ Validation failed for fields:', Object.keys(newErrors).filter(k => newErrors[k]));
      console.error('❌ Error details:', newErrors);
    }
    return isValid;
  };

  // Form navigation
  const handleNext = async () => {
    if (validateStep(step)) {
      if (partnerType === 'revshare') {
        // RevShare only has step 2 — validate and submit
        return;
      }
      setStep(step + 1);
    } else {
      toast.error("Please fill all required fields correctly");
    }
  };

  const handleBack = () => {
    if (partnerType === 'revshare') return; // No back for revshare
    if (step > 1) setStep(step - 1);
  };

  // File handling
  const handleBrandLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrandLogo(file);
      setBrandLogoName(file.name);
      const error = validateField('brand_logo', file);
      setErrors(prev => ({ ...prev, brand_logo: error }));
    }
  };

  const removeBrandLogo = () => {
    setBrandLogo(null);
    setBrandLogoName('');
    setErrors(prev => ({ ...prev, brand_logo: null }));
  };

  const handleBusinessCertChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBusinessCert(file);
      setBusinessCertName(file.name);
      const error = validateField('businessCert', file);
      setErrors(prev => ({ ...prev, businessCert: error }));
    }
  };

  const removeBusinessCert = () => {
    setBusinessCert(null);
    setBusinessCertName('');
    setErrors(prev => ({ ...prev, businessCert: null }));
  };

  // Platform and marketplace management
  const handleAddPlatform = () => {
    if (newPlatform.trim()) {
      const id = newPlatform.toLowerCase().replace(/\s+/g, '-');
      setPlatforms([...platforms, { id, label: newPlatform }]);
      setNewPlatform('');
      setShowPlatformInput(false);
    }
  };

  const handleAddMarketplace = () => {
    if (newMarketplace.trim()) {
      const id = newMarketplace.toLowerCase().replace(/\s+/g, '-');
      setMarketplace([...marketplace, { id, label: newMarketplace }]);
      setNewMarketplace('');
      setShowMarketplaceInput(false);
    }
  };

  const handlePlatformCheckboxChange = (platformId, isChecked) => {
    if (isChecked) {
      setCloudPartnership([...cloud_partnership, platformId]);
    } else {
      setCloudPartnership(cloud_partnership.filter(id => id !== platformId));
    }
  };

  const handleMarketplaceCheckboxChange = (marketplaceId, isChecked) => {
    if (isChecked) {
      setExistingMarket([...existing_marketplace_listing, marketplaceId]);
    } else {
      setExistingMarket(existing_marketplace_listing.filter(id => id !== marketplaceId));
    }
  };

  // Service categories with sub-options
  const serviceCategories = [
    { id: 'cloud_solutions', label: 'Cloud Solutions', subOptions: [
      'Microsoft Azure Consulting & Migration',
      'AWS Consulting & Migration',
      'Cloud Infrastructure Setup & Management',
      'Cloud Security & Governance',
      'Backup & Disaster Recovery',
      'Cost Optimization'
    ]},
    { id: 'modern_workspace', label: 'Modern Workspace', subOptions: [
      'Microsoft 365 Implementation',
      'Teams Collaboration',
      'SharePoint & OneDrive',
      'Exchange Online',
      'Migration to Microsoft 365',
      'Change Management (Optional)'
    ]},
    { id: 'endpoint_management', label: 'Endpoint Management', subOptions: [
      'Microsoft Intune Implementation & Support',
      'Device Enrollment & Management',
      'Policy & Compliance Management',
      'Application Deployment',
      'Ongoing Support'
    ]},
    { id: 'endpoint_security', label: 'End-Point Security Solution', subOptions: [
      'Microsoft Defender for Business',
      'Endpoint Protection & EDR',
      'Threat & Vulnerability Management',
      'Attack Surface Reduction',
      'Zero Trust Security',
      'Security Awareness Training'
    ]},
    { id: 'infrastructure_services', label: 'Infrastructure Services', subOptions: [
      'Windows Server Management',
      'Active Directory & Entra ID',
      'Network Design & Implementation',
      'Virtualization (VMware/Hyper-V)',
      'Storage & Backup Solutions',
      'IT Infrastructure Monitoring'
    ]},
    { id: 'database_services', label: 'Database Services', subOptions: [
      'Database Installation & Configuration',
      'Performance Tuning & Optimization',
      'Backup & Recovery Management',
      'High Availability & Disaster Recovery',
      'Database Security & Compliance',
      'Ongoing Maintenance & Support'
    ]},
    { id: 'managed_it_services', label: 'Managed IT Services', subOptions: [
      '24/7 Monitoring & Support',
      'Helpdesk & Technical Support',
      'Patch & Update Management',
      'System Administration',
      'ITIL-based Service Delivery'
    ]},
    { id: 'remote_support', label: 'Remote Support', subOptions: [
      'Remote Helpdesk Support',
      'Issue Diagnosis & Resolution',
      'System & Application Support',
      'On-demand Remote Assistance',
      'Fast Response & Resolution'
    ]},
    { id: 'consulting_services', label: 'Consulting Services', subOptions: [
      'IT Strategy & Roadmap',
      'Digital Transformation',
      'Microsoft Licensing Consulting',
      'IT Audit & Assessment',
      'Project Management'
    ]},
  ];

  const handleServiceSubOptionChange = (serviceId, subOption, checked) => {
    setSelectedServiceSubOptions((prev) => {
      const current = prev[serviceId] || [];
      const updated = checked
        ? [...current, subOption]
        : current.filter((item) => item !== subOption);
      return { ...prev, [serviceId]: updated };
    });
  };

  // Handle custom legal entity input
  const legalEntityInput = (e) => {
    const value = e.target.value;
    setCustomLegalEntity(value);
    setlegalEntityTypesData({ name: value, value: value });
    
    // Clear error when user starts typing
    if (value.trim().length >= 3 && errors.legal_entity_type?.includes("minimum 3")) {
      setErrors(prev => ({ ...prev, legal_entity_type: null }));
    }
  };

  // Handle submit for custom legal entity
  const handleSubmitOther = () => {
    if (!isCustomLegalEntityValid()) {
      setErrors(prev => ({
        ...prev,
        legal_entity_type: "Please enter at least 3 characters for the legal entity type"
      }));
      return;
    }
    
    const trimmedValue = customLegalEntity.trim();
    const formattedValue = trimmedValue
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Check if entity already exists
    const exists = legalEntityTypes.some(item => 
      item.value.toLowerCase() === formattedValue.toLowerCase()
    );
    
    if (!exists) {
      const newEntity = { value: formattedValue, name: formattedValue };
      const updatedTypes = [
        ...legalEntityTypes.filter(item => item.value !== "Other"),
        newEntity,
        { value: "Other", name: "Other" }
      ];
      
      setlegalEntityTypes(updatedTypes);
      handleFieldChange('legal_entity_type', formattedValue);
      setCustomLegalEntity("");
      
      // Show success message
      setErrors(prev => ({ 
        ...prev, 
        legal_entity_type: "",
        legal_entity_success: `"${formattedValue}" has been added successfully!`
      }));
      
      setTimeout(() => {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.legal_entity_success;
          return newErrors;
        });
      }, 3000);
    } else {
      handleFieldChange('legal_entity_type', formattedValue);
      setCustomLegalEntity("");
    }
  };

  // Handle custom country input
  const headquaterCountryInput = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z\s\-\']*$/.test(value)) {
      setCustomCountryInput(value);
      setheadquaterCountryData({ name: value, value: value });
      
      // Clear error when user starts typing
      if (value.trim().length >= 3 && errors.headquater_country?.includes("minimum 3")) {
        setErrors(prev => ({ ...prev, headquater_country: null }));
      }
    }
  };

  // Handle submit for custom country
  const handleSubmitOtherHC = () => {
    if (!isCustomCountryValid()) {
      setErrors(prev => ({
        ...prev,
        headquater_country: "Please enter a valid country name (minimum 3 letters, letters and spaces only)"
      }));
      return;
    }
    
    const trimmedValue = customCountryInput.trim();
    const formattedValue = trimmedValue
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Check if country already exists
    const exists = headquaterCountry.some(
      country => country.value.toLowerCase() === formattedValue.toLowerCase()
    );
    
    if (!exists) {
      const newCountry = { value: formattedValue, name: formattedValue };
      const updatedCountries = [
        ...headquaterCountry.filter(item => item.value !== "Other"),
        newCountry,
        { value: "Other", name: "Other" }
      ];
      
      setHeadquaterCountry(updatedCountries);
      handleFieldChange('headquater_country', formattedValue);
      setCustomCountryInput("");
      
      // Show success message
      setErrors(prev => ({
        ...prev,
        headquater_country: "",
        headquater_country_success: `${formattedValue} has been added successfully!`
      }));
      
      setTimeout(() => {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.headquater_country_success;
          return newErrors;
        });
      }, 3000);
    } else {
      handleFieldChange('headquater_country', formattedValue);
      setCustomCountryInput("");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // For revshare, only validate step 2 fields + T&C
    const stepToValidate = partnerType === 'revshare' ? 2 : 3;
    const revshareExtraValid = partnerType === 'revshare' ? validateRevshareConsent() : true;
    
    if (validateStep(stepToValidate) && revshareExtraValid) {
      const toastId = toast.loading('Submitting form...');
      setloading(true);
      
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('mobile', mobile);
      formData.append('password', password);
      formData.append('role_id', getRoleId());
      formData.append('partner_type', partnerType);
      formData.append('company_name', company_name);
      formData.append('registered_business_name', registered_business_name);
      formData.append('brand_name', brand_name);
      formData.append('legal_entity_type', legal_entity_type);
      formData.append('tax_id', tax_id);
      formData.append('headquater_country', headquater_country);
      formData.append('website_url', website_url);
      formData.append('linkedin_url', linkedin_url);
      formData.append('cloud_partnership', JSON.stringify(cloud_partnership));
      formData.append('existing_marketplace_listing', JSON.stringify(existing_marketplace_listing));
      formData.append('service_sub_options', JSON.stringify(selectedServiceSubOptions));
      formData.append('neozaar_tc', neozaar_tc);
      formData.append('preferred_engagement', preferred_engagement);
      formData.append('support_desk_email', support_desk_email);
      formData.append('designation', designation);
      if (partnerType === 'revshare') formData.append('advisor_type', advisor_type);
      formData.append('sla_link', sla_link);
      formData.append('terms_of_use_link', terms_of_use_link);
      formData.append('data_privacy', data_privacy);

      if (brand_logo) formData.append('brand_logo', brand_logo);
      if (businessCert) formData.append('business_certification', businessCert);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}user/register`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (res.ok) {
          toast.dismiss(toastId);
          toast.success('Registration successful!');
          router.push('/auth/success');
        } else {
          toast.dismiss(toastId);
          setloading(false);
          toast.error(data.message || 'Registration failed. Please try again.');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.dismiss(toastId);
        setloading(false);
        toast.error('Something went wrong. Please try again.');
      }
    } else {
     toast.error("Required information is missing. Please complete all mandatory fields. Check console for details.");

    }
  };

  return (
    <>
      <div className="w-full bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs font-bold tracking-widest uppercase text-orange-500">Registration Open</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-1">
                {partnerType === 'isv' && 'ISV / SaaS Registration'}
                {partnerType === 'service' && 'Solution Partner Registration'}
                {partnerType === 'revshare' && 'Consulting Advisor Registration'}
              </h3>
              <p className="text-sm text-gray-500 max-w-lg">
                {partnerType === 'isv' && 'List your SaaS, launch private offers, and unlock cloud-aligned growth and CoSell Opportunities.'}
                {partnerType === 'service' && 'Register your Microsoft, AWS and cloud capabilities on NeoZaar. Get positioned into customer opportunities and build recurring services revenue.'}
                {partnerType === 'revshare' && 'Join as a Consulting Advisor, refer clients, earn commissions, and grow your revenue with our affiliate program.'}
              </p>
            </div>
            {partnerType !== 'revshare' && (
              <div className="flex items-center gap-2 sm:gap-4">
                {[
                  { num: 1, label: 'Company & Brand Info' },
                  { num: 2, label: 'Primary Contact' },
                  { num: 3, label: partnerType === 'service' ? 'Capabilities' : 'Partner & Engage' },
                ].map((s, i, arr) => (
                  <div key={s.num} className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                        step > s.num ? 'bg-green-500 border-green-500' : step === s.num ? 'bg-black border-black' : 'bg-gray-100 border-gray-200'
                      }`}>
                        {step > s.num ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className={`text-xs font-bold ${step >= s.num ? 'text-white' : 'text-gray-500'}`}>{s.num}</span>
                        )}
                      </div>
                      <span className={`text-[10px] mt-1 hidden sm:block whitespace-nowrap ${step === s.num ? 'text-black font-semibold' : 'text-gray-400'}`}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`w-6 h-px mt-[-12px] ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className='w-10/12 md:w-8/12 mx-auto py-10'>
            <form onSubmit={handleSubmit} className='my-7 space-y-4 grid grid-cols-2 gap-2 md:gap-3'>
              {step === 1 && (
                <>
                  <div className='col-span-2'>
                    <label className='text-sm dark:text-black font-medium font-sans'>Company Name  <span className='text-red-500'>*</span></label>
                    <input
                      type='text'
                      value={company_name}
                      onChange={(e) => handleFieldChange('company_name', e.target.value)}
                      onBlur={() => handleBlur('company_name')}
                      className={`outline-0 w-full py-2 px-3 dark:text-black border ${errors.company_name ? 'border-red-300 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                    />
                    {errors.company_name && (<p className="text-red-500 text-sm mt-1">{errors.company_name}</p>)}
                  </div>
                  <div className='col-span-2 md:col-span-1'>
                    <label className='text-sm dark:text-black font-medium font-sans'>Brand Name  <span className='text-red-500'>*</span></label>
                    <input
                      type='text'
                      value={brand_name}
                      onChange={(e) => handleFieldChange('brand_name', e.target.value)}
                      onBlur={() => handleBlur('brand_name')}
                      className={`outline-0 w-full py-2 px-3 dark:text-black border ${errors.brand_name ? 'border-red-300 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                    />
                    {errors.brand_name && (<p className="text-red-500 text-sm mt-1">{errors.brand_name}</p>)}
                  </div>
                  <div className='col-span-2 md:col-span-1'>
                    <label className='text-sm dark:text-black font-medium font-sans'>Group / Holding Company  <span className='text-red-500'>*</span></label>
                    <input
                      type='text'
                      value={registered_business_name}
                      onChange={(e) => handleFieldChange('registered_business_name', e.target.value)}
                      onBlur={() => handleBlur('registered_business_name')}
                      className={`outline-0 w-full py-2 px-3 dark:text-black border ${errors.registered_business_name ? 'border-red-300 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                    />
                    {errors.registered_business_name && (<p className="text-red-500 text-sm mt-1">{errors.registered_business_name}</p>)}
                  </div>
                  
                  <div className='col-span-2 md:col-span-1'>
                    <label className='text-sm dark:text-gray-500 font-medium font-sans'>
                      Headquarter Country<span className='text-red-500'>*</span>
                    </label>
                    
                    <select
                      id="headquaterCountry"
                      value={headquater_country}
                      onChange={(e) => {
                        handleFieldChange('headquater_country', e.target.value);
                        if (e.target.value !== "Other") {
                          setCustomCountryInput("");
                        }
                      }}
                      onBlur={() => handleBlur('headquater_country')}
                      className={`border ${
                        errors.headquater_country && headquater_country !== "Other" 
                          ? 'border-red-300 bg-red-50' 
                          : 'border-zinc-200 bg-zinc-100'
                      } dark:text-black py-2.5 px-3 w-full outline-none focus:border-blue-500 transition-colors`}
                    >
                      <option value="" disabled className='dark:text-black text-gray-400'>
                        Select an option
                      </option>
                      {headquaterCountry.map((item, i) => (
                        <option key={i} value={item.value} className='dark:text-black'>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    {/* Success message */}
                    {errors.headquater_country_success && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{errors.headquater_country_success}</span>
                        </div>
                      </div>
                    )}

                    {/* Show input when Other is selected */}
                    {headquater_country === "Other" && (
                      <div className="mt-3 p-3 border border-gray-300 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2 font-medium">Enter custom country name:</p>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customCountryInput || ""}
                              onChange={headquaterCountryInput}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && isCustomCountryValid()) {
                                  e.preventDefault();
                                  handleSubmitOtherHC();
                                }
                              }}
                              placeholder="e.g., United Kingdom, South Korea"
                              className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500 dark:text-black"
                              autoFocus
                            />
                            <button
                              onClick={handleSubmitOtherHC}
                              disabled={!isCustomCountryValid()}
                              className={`px-4 py-2 rounded font-medium transition-colors ${
                                isCustomCountryValid()
                                  ? 'bg-gray-900 text-white hover:bg-gray-800 cursor-pointer'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Add
                            </button>
                          </div>
                          
                          {/* Validation rules display */}
                          <div className="text-xs text-gray-500 mt-1">
                            <div className="flex items-center gap-1 mb-1">
                              <span className={`inline-block w-2 h-2 rounded-full ${
                                customCountryInput && customCountryInput.trim().length >= 3 
                                  ? 'bg-green-500' 
                                  : 'bg-gray-300'
                              }`}></span>
                              <span>Minimum 3 letters</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`inline-block w-2 h-2 rounded-full ${
                                /^[A-Za-z\s\-\']+$/.test(customCountryInput || "")
                                  ? 'bg-green-500' 
                                  : 'bg-gray-300'
                              }`}></span>
                              <span>Letters, spaces, hyphens, and apostrophes only</span>
                            </div>
                          </div>
                          
                          {/* Real-time character count */}
                          {customCountryInput && (
                            <div className="text-xs mt-2">
                              <span className={`font-medium ${
                                customCountryInput.trim().length >= 3 
                                  ? 'text-green-600' 
                                  : 'text-amber-600'
                              }`}>
                                {customCountryInput.trim().length} character{customCountryInput.trim().length !== 1 ? 's' : ''}
                                {customCountryInput.trim().length < 3 && ` (${3 - customCountryInput.trim().length} more needed)`}
                              </span>
                            </div>
                          )}
                          
                          {/* Error message for custom input */}
                          {errors.headquater_country && headquater_country === "Other" && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                              <div className="flex items-start gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-red-700 text-sm">{errors.headquater_country}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error message for main select (when not "Other") */}
                    {errors.headquater_country && headquater_country !== "Other" && headquater_country !== "" && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <div className="flex items-start gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-red-700 text-sm">{errors.headquater_country}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-sm dark:text-black font-medium font-sans">SLA Link <span className='text-red-500'>*</span></label>
                    <div className="flex">
                      <input
                        type="text"
                        value={sla_link}
                        placeholder="https://example.com/sla"
                        onChange={(e) => handleFieldChange("sla_link", e.target.value)}
                        onBlur={() => handleBlur('sla_link')}
                        className={`outline-0 w-full py-2 px-3 dark:text-black border ${
                          errors.sla_link
                            ? "border-red-300 bg-red-500/10"
                            : "border-zinc-200 bg-zinc-100"
                        }`}
                      />
                    </div>
                    {errors.sla_link && (
                      <p className="text-red-500 text-sm mt-1">{errors.sla_link}</p>
                    )}
                  </div>
                  
                  <div className='col-span-2 md:col-span-1'>
                    <label className='text-sm dark:text-black font-medium font-sans'>Legal Entity Type <span className='text-red-500'>*</span></label>

                    <select
                      value={legal_entity_type}
                      onChange={(e) => handleFieldChange('legal_entity_type', e.target.value)}
                      onBlur={() => handleBlur('legal_entity_type')}
                      className={`outline-0 w-full py-2 px-3 dark:text-black border ${errors.legal_entity_type ? 'border-red-300 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                    >
                      <option value="" disabled>Select an option</option>
                      {
                        legalEntityTypes.map((item, i) => (
                          <option key={i} value={item.value}>{item.name}</option>
                        ))
                      }
                    </select>

                    {/* Success message */}
                    {errors.legal_entity_success && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2 text-green-700 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{errors.legal_entity_success}</span>
                        </div>
                      </div>
                    )}

                    {/* "Other" input section */}
                    {legal_entity_type === "Other" && (
                      <div className="mt-3 p-3 border border-gray-300 rounded bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2">Please specify your legal entity type:</p>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={customLegalEntity || ""}
                              onChange={legalEntityInput}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && customLegalEntity.trim().length >= 3) {
                                  e.preventDefault();
                                  handleSubmitOther();
                                }
                              }}
                              placeholder='Enter legal entity type' 
                              className='flex-1 bg-white outline-none p-2 border border-gray-300 rounded dark:text-black' 
                              autoFocus
                            />
                            <button 
                              onClick={handleSubmitOther} 
                              disabled={!customLegalEntity || customLegalEntity.trim().length < 3}
                              className={`px-4 py-2 rounded transition-colors ${
                                !customLegalEntity || customLegalEntity.trim().length < 3
                                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                  : 'bg-gray-950 text-white hover:bg-gray-800 cursor-pointer'
                              }`}
                            >
                              Add
                            </button>
                          </div>
                          
                          {/* Validation message */}
                          {customLegalEntity && customLegalEntity.trim().length < 3 && (
                            <div className="flex items-center gap-1 text-amber-600 text-sm mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span>Please enter at least 3 characters</span>
                            </div>
                          )}
                          
                          {/* Character counter */}
                          <div className="text-xs text-gray-500 flex justify-between">
                            <span>
                              {customLegalEntity ? `${customLegalEntity.trim().length}/3 characters` : 'Minimum 3 characters'}
                            </span>
                            <span className={customLegalEntity && customLegalEntity.trim().length >= 3 ? 'text-green-600' : 'text-gray-400'}>
                              {customLegalEntity && customLegalEntity.trim().length >= 3 ? '✓ Ready to add' : 'More characters needed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {errors.legal_entity_type && legal_entity_type !== "Other" && legal_entity_type !== "" && (
                      <p className="text-red-500 text-sm mt-1">{errors.legal_entity_type}</p>
                    )}
                  </div>
                  
                  <div className='col-span-2 md:col-span-1'>
                    <label className='text-sm dark:text-black req font-medium font-sans'>Tax Id <span className='text-red-500'>*</span></label>
                    <div className='flex'>
                      <input
                        type='text'
                        value={tax_id}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^[A-Za-z0-9-]*$/.test(value)) {
                            handleFieldChange('tax_id', value);
                          }
                        }}
                        onBlur={() => handleBlur('tax_id')}
                        className={`w-full py-2 px-3 dark:text-black border ${errors.tax_id ? 'border-red-200 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'} outline-0`}
                      />
                    </div>
                    {errors.tax_id && (<p className="text-red-500 text-sm mt-1">{errors.tax_id}</p>)}
                  </div>
                  
                  <div className='col-span-2'>
                    <label className='text-sm dark:text-black font-medium font-sans'>Website URL<span className='text-red-500'>*</span></label>
                    <input
                      type='text'
                      placeholder=''
                      value={website_url}
                      onChange={(e) => handleFieldChange('website_url', e.target.value)}
                      onBlur={() => handleBlur('website_url')}
                      className={`w-full py-2 px-3 outline-0 border dark:text-black ${errors.website_url ? 'border-red-200 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                    />
                    {errors.website_url && (<p className="text-red-500 text-sm mt-1">{errors.website_url}</p>)}
                  </div>
                  
                  <div className='col-span-2'>
                    <label className='text-sm font-medium dark:text-black font-sans'>Linkedin URL</label>
                    <input
                      type='text'
                      placeholder=''
                      value={linkedin_url}
                      onChange={(e) => handleFieldChange('linkedin_url', e.target.value)}
                      onBlur={() => handleBlur('linkedin_url')}
                      className={`w-full py-2 px-3 outline-0 dark:text-black border ${errors.linkedin_url ? 'border-red-200 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                    />
                    {errors.linkedin_url && (<p className="text-red-500 text-sm mt-1">{errors.linkedin_url}</p>)}
                  </div>
                  
                  <div className="col-span-2">
                    <label htmlFor="brand_logo" className="text-sm dark:text-black font-medium font-sans">
                      Upload Brand Logo<span className='text-red-500'>*</span>
                    </label>
                    <label
                      htmlFor="brand_logo"
                      className={`cursor-pointer text-sm dark:text-black font-medium font-sans border ${errors.brand_logo
                        ? 'border-red-300 bg-red-500/10 text-red-400'
                        : 'border-zinc-200 bg-zinc-100 text-zinc-400'
                        } py-2 px-3 w-full text-center border-dashed flex justify-center`}
                    >
                      <div className="flex gap-2 items-center">
                        <i className="ri-upload-2-line"></i>
                        Upload
                      </div>
                    </label>
                    <input
                      type="file"
                      id="brand_logo"
                      className="hidden"
                      onChange={handleBrandLogoChange}
                    />
                    {errors.brand_logo && (
                      <p className="text-red-500 text-sm mt-1">{errors.brand_logo}</p>
                    )}
                    {brand_logo && (
                      <div className="mt-1 flex items-center justify-between px-3 py-2 rounded">
                        <p className="text-sm text-zinc-700 truncate">
                          <i className="ri-checkbox-circle-fill text-green-400"></i> {brandLogoName}
                        </p>
                        <button
                          onClick={removeBrandLogo}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <i className="ri-delete-bin-6-line"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {step === 2 && (
                <>
                  <h5 className="text-black col-span-2">Primary Contact</h5>
                  <div className="col-span-2">
                    <label className="text-sm dark:text-black font-medium font-sans">Contact Person Name<span className='text-red-500'>*</span></label>
                    <input
                      type="text"
                      placeholder=""
                      value={name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      onBlur={() => handleBlur('name')}
                      className={`outline-0 w-full py-2 px-3 dark:text-black border ${errors.name ? 'border-red-200 bg-red-500/10' : "border-zinc-200 bg-zinc-100"}`}
                    />
                    {errors.name && (<p className="text-red-500 text-sm mt-1">{errors.name}</p>)}
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-sm dark:text-black font-medium font-sans">Designation<span className='text-red-500'>*</span></label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => handleFieldChange('designation', e.target.value)}
                      onBlur={() => handleBlur('designation')}
                      className={`outline-0 w-full py-2 px-3 dark:text-black border ${errors.designation ? 'border-red-200 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                    />
                    {errors.designation && (<p className="text-red-500 text-sm mt-1">{errors.designation}</p>)}
                  </div>
                  {partnerType === 'revshare' && (
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm dark:text-black font-medium font-sans">Type of Advisor<span className='text-red-500'>*</span></label>
                      <select
                        value={advisor_type}
                        onChange={(e) => handleFieldChange('advisor_type', e.target.value)}
                        onBlur={() => handleBlur('advisor_type')}
                        className={`outline-0 w-full py-2 px-3 dark:text-black border ${errors.advisor_type ? 'border-red-200 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                      >
                        <option value="" disabled>Select type of advisor</option>
                        {ADVISOR_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      {errors.advisor_type && (<p className="text-red-500 text-sm mt-1">{errors.advisor_type}</p>)}
                    </div>
                  )}
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-sm dark:text-black font-medium font-sans">Email<span className='text-red-500'>*</span></label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={`outline-0 w-full py-2 px-3 border dark:text-black ${errors.email ? 'border-red-200 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                      required
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-sm dark:text-black font-medium font-sans">Support Desk Email<span className='text-red-500'>*</span></label>
                    <input
                      type="email"
                      value={support_desk_email}
                      onChange={(e) => handleFieldChange('support_desk_email', e.target.value)}
                      onBlur={() => handleBlur('support_desk_email')}
                      className={`outline-0 w-full py-2 px-3 border dark:text-black ${errors.support_desk_email ? 'border-red-200 bg-red-500/10' : 'border-zinc-200 bg-zinc-100'}`}
                      required
                    />
                    {errors.support_desk_email && (
                      <p className="text-red-500 text-sm mt-1">{errors.support_desk_email}</p>
                    )}
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-sm dark:text-black font-medium font-sans">Phone Number<span className='text-red-500'>*</span></label>
                    <PhoneInput
                      country={'in'}
                      value={mobile}
                      onChange={(value, data) => {
                        handleFieldChange('mobile', value);
                        setCountryType(data.countryCode.toUpperCase());
                      }}
                      onBlur={() => handleBlur('mobile')}
                      inputClass={`!w-full !px-14 !py-3 !text-sm !rounded-none !outline-none ${errors.mobile ? '!border-red-200 !bg-red-500/10' : '!border-zinc-200 !bg-zinc-100'}`}
                      containerClass="!w-full"
                      buttonClass={`px-10 ${errors.mobile ? '!border-red-200 !bg-red-500/10' : '!border-zinc-200 !bg-zinc-100'}`}
                      inputProps={{
                        name: 'mobile',
                        required: true,
                      }}
                    />
                    {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
                  </div>
                  
                  <div className="col-span-2 relative">
                    <input
                      type="hidden"
                      value={password}
                      placeholder="Enter a strong password"
                      onChange={(e) => {
                        const val = e.target.value;
                        handleFieldChange('password', val);
                        const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
                        
                        if (!val) {
                          setErrors((prev) => ({ ...prev, password: 'Password is required.' }));
                        } else if (val.length < 8) {
                          setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters.' }));
                        } else if (val.length > 16) {
                          setErrors((prev) => ({ ...prev, password: 'Password cannot exceed 16 characters.' }));
                        } else if (!strongPasswordRegex.test(val)) {
                          setErrors((prev) => ({ ...prev, password: 'Password must include uppercase, lowercase, number, and special character.' }));
                        } else {
                          setErrors((prev) => ({ ...prev, password: '' }));
                        }
                      }}
                      onBlur={() => handleBlur('password')}
                      className={`outline-0 w-full py-2 px-3 dark:text-black border ${
                        errors.password
                          ? 'border-red-400 bg-red-50'
                          : 'border-zinc-200 bg-zinc-100'
                      } pr-10 rounded-md transition`}
                    />
                    {errors.password && (
                      <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                    )}
                  </div>

                  {/* T&C for RevShare — shown inline since revshare has no step 3 */}
                  {partnerType === 'revshare' && (
                    <>
                      <div className="col-span-2 mt-4">
                        <div className='flex'>
                          <div className='me-2'>
                            <input
                              type="checkbox"
                              className="peer/terms hidden"
                              checked={!!neozaar_tc}
                              onChange={(e) => setNeozaartc(e.target.checked)}
                              id="treamscondition"
                            />
                            <label
                              htmlFor='treamscondition'
                              className={`block bg-zinc-100 w-5 h-5 border ${errors.neozaar_tc ? 'border-red-200' : 'border-zinc-200'} peer-checked/terms:hidden`}
                            ></label>
                            <label
                              htmlFor='treamscondition' className='hidden justify-center items-center bg-black w-5 h-5 border border-black peer-checked/terms:flex'><i className="ri-check-line text-white"></i></label>
                          </div>
                          <label htmlFor="treamscondition" className="text-sm dark:text-black">
                            I agree to the{" "}
                            <a href="/terms-of-use" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                              Terms of Use
                            </a>{" "}
                            and consent to the collection and use of my data as outlined in the{" "}
                            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                              Privacy Policy
                            </a>.
                          </label>
                        </div>
                        {errors.neozaar_tc && <p className="text-red-500 text-sm mt-1">{errors.neozaar_tc}</p>}
                      </div>
                      
                      <div className="col-span-2">
                        <div className='flex'>
                          <div className='me-2'>
                            <input type="checkbox" className='peer/agree hidden' onChange={(e) => setDataPrivacy(e.target.checked)} checked={!!data_privacy} id="agree" />
                            <label htmlFor='agree' className={`block bg-zinc-100 ${errors.data_privacy ? 'border-red-200' : 'border-zinc-200'} w-5 h-5 border peer-checked/agree:hidden`}></label>
                            <label htmlFor='agree' className='hidden justify-center items-center bg-black w-5 h-5 border border-black peer-checked/agree:flex'><i className="ri-check-line text-white"></i></label>
                          </div>
                          <label htmlFor='agree' className='text-sm dark:text-black'>I have read and agree to the Privacy Policy and consent to the use of my data for the following purposes.</label>
                        </div>
                        <ul className='ms-10 mt-2 text-sm font-sans text-zinc-500 list-disc'>
                          <li>To provide me with the requested service.</li>
                          <li>To send me product updates and marketing communications.</li>
                          <li>To improve my user experience on this website.</li>
                          <li>To share anonymized data with third-party partners for analytics.</li>
                        </ul>
                        {errors.data_privacy && <p className="text-red-500 text-sm mt-1">{errors.data_privacy}</p>}
                      </div>
                    </>
                  )}
                </>
              )}
              
              {step === 3 && (
                <>
                  {/* ☁️ Cloud Partnerships */}
                  <div className="col-span-2">
                    <label className="text-sm font-semibold dark:text-black font-sans mb-1">Cloud Partnerships</label>
                    <div className="flex flex-col gap-4">
                      <div className="flex gap-3 flex-wrap">
                        {platforms.map((platform) => (
                          <div key={platform.id + "cloud"}>
                            <input
                              type="checkbox"
                              id={platform.id + "cloud"}
                              checked={cloud_partnership.includes(platform.id)}
                              onChange={(e) => handlePlatformCheckboxChange(platform.id, e.target.checked)}
                              className="peer hidden"
                            />
                            <label
                              htmlFor={platform.id + "cloud"}
                              className=" h-8 border border-zinc-200 bg-zinc-100 text-xs flex capitalize justify-center items-center rounded-3xl px-2 dark:text-black peer-checked:bg-black peer-checked:text-white"
                            >
                              {platform.label}
                            </label>
                          </div>
                        ))}
                        {!showPlatformInput && (
                          <button
                            type="button"
                            onClick={() => setShowPlatformInput(true)}
                            className="w-8 h-8 rounded-3xl bg-zinc-300 dark:text-black text-lg flex justify-center items-center"
                          >
                            +
                          </button>
                        )}
                      </div>
                      {showPlatformInput && (
                        <div className="flex items-center gap-2 pe-1 border border-zinc-200 w-[270px] rounded-xl">
                          <input
                            type="text"
                            value={newPlatform}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^[a-zA-Z\s]*$/.test(value)) {
                                setNewPlatform(value);
                              }
                            }}
                            maxLength={20}
                            placeholder="Enter cloud name"
                            className="px-3 py-1 outline-0 m-1 dark:text-black rounded-lg text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowPlatformInput(false);
                              setNewPlatform('');
                            }}
                            className="text-zinc-400 hover:text-zinc-500"
                            title="Cancel"
                          >
                            <i className="ri-close-fill text-red-600 dark:text-red-600"></i>
                          </button>
                          <button
                            type="button"
                            onClick={handleAddPlatform}
                            className="text-zinc-400 hover:text-zinc-500"
                            title="Add"
                          >
                            <i className="ri-check-fill text-green-500 dark:text-green-500"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    {partnerType !== 'service' ? (
                      <>
                        <label className="text-sm dark:text-black font-medium font-sans">Terms of use URL <span className='text-red-500'>*</span></label>
                        <div className="flex">
                          <input
                            type="text"
                            value={terms_of_use_link}
                            placeholder="https://example.com/terms_of_use_link"
                            onChange={(e) => handleFieldChange("terms_of_use_link", e.target.value)}
                            onBlur={() => handleBlur('terms_of_use_link')}
                            className={`outline-0 w-full py-2 px-3 dark:text-black border ${
                              errors.terms_of_use_link
                                ? "border-red-300 bg-red-500/10"
                                : "border-zinc-200 bg-zinc-100"
                            }`}
                          />
                        </div>
                        {errors.terms_of_use_link && (
                          <p className="text-red-500 text-sm mt-1">{errors.terms_of_use_link}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <label className="text-sm dark:text-black font-medium font-sans">NDA Agreement</label>
                        <a
                          href="/nda-template.pdf"
                          download
                          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-black text-white text-sm font-semibold rounded hover:bg-zinc-800 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Download NDA
                        </a>
                      </>
                    )}
                  </div>
                  
                  {/* 🛒 Marketplace / Service Category */}
                  <div className="col-span-2">
                    {partnerType !== 'service' ? (
                      <>
                        <label className="text-sm block font-semibold font-sans mb-1 dark:text-black">Existing Marketplace Listing</label>
                        <div className="flex flex-col gap-4">
                          <div className="flex gap-3 flex-wrap">
                            {marketplace.map((item) => (
                              <div key={item.id}>
                                <input
                                  type="checkbox"
                                  id={item.id}
                                  checked={existing_marketplace_listing.includes(item.id)}
                                  onChange={(e) => handleMarketplaceCheckboxChange(item.id, e.target.checked)}
                                  className="peer hidden"
                                />
                                <label
                                  htmlFor={item.id}
                                  className=" h-8 border border-zinc-200 bg-zinc-100 text-xs flex capitalize justify-center items-center rounded-3xl px-2 peer-checked:bg-black peer-checked:text-white dark:text-black"
                                >
                                  {item.label}
                                </label>
                              </div>
                            ))}
                            {!showMarketplaceInput && (
                              <button
                                type="button"
                                onClick={() => setShowMarketplaceInput(true)}
                                className="w-8 h-8 rounded-3xl bg-zinc-300 text-lg flex justify-center items-center dark:text-black"
                              >
                                +
                              </button>
                            )}
                          </div>
                          {showMarketplaceInput && (
                            <div className="flex items-center gap-2 pe-1 border border-zinc-200 w-[270px] rounded-xl">
                              <input
                                type="text"
                                value={newMarketplace}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^[a-zA-Z\s]*$/.test(value)) {
                                    setNewMarketplace(value);
                                  }
                                }}
                                maxLength={20}
                                placeholder="Enter marketplace name"
                                className="px-3 py-1 m-1 text-black outline-0 rounded-lg text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setShowMarketplaceInput(false);
                                  setNewMarketplace('');
                                }}
                                className="text-zinc-400 hover:text-zinc-500"
                                title="Cancel"
                              >
                                <i className="ri-close-fill text-red-600 dark:text-red-600"></i>
                              </button>
                              <button
                                type="button"
                                onClick={handleAddMarketplace}
                                className="text-zinc-400 hover:text-zinc-500"
                                title="Add"
                              >
                                <i className="ri-check-fill text-green-500 dark:text-green-500"></i>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="text-sm block font-semibold font-sans mb-1 dark:text-black">Service Categories <span className='text-red-500'>*</span></label>
                        <p className="text-xs text-zinc-500 mb-3">Select all services you offer</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {serviceCategories.map((svc) => (
                            <div key={svc.id}>
                              <input
                                type="checkbox"
                                id={`svc_${svc.id}`}
                                checked={existing_marketplace_listing.includes(svc.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setExistingMarket([...existing_marketplace_listing, svc.id]);
                                  } else {
                                    setExistingMarket(existing_marketplace_listing.filter(id => id !== svc.id));
                                    // Clear sub-options when unchecked
                                    setSelectedServiceSubOptions((prev) => {
                                      const updated = { ...prev };
                                      delete updated[svc.id];
                                      return updated;
                                    });
                                  }
                                }}
                                className="peer hidden"
                              />
                              <label
                                htmlFor={`svc_${svc.id}`}
                                className="block border border-zinc-200 bg-zinc-100 text-xs font-medium py-2.5 px-3 rounded-lg cursor-pointer text-center dark:text-black peer-checked:bg-black peer-checked:text-white peer-checked:border-black transition-all"
                              >
                                {svc.label}
                              </label>
                            </div>
                          ))}
                        </div>

                        {/* Sub-options shown as accordion tabs for selected categories */}
                        {existing_marketplace_listing.length > 0 && (
                          <div className="mt-4 border border-zinc-200 rounded-lg overflow-hidden">
                            {serviceCategories.filter(svc => existing_marketplace_listing.includes(svc.id)).map((svc) => (
                              <div key={`sub-${svc.id}`} className="border-b border-zinc-200 last:border-b-0">
                                <button
                                  type="button"
                                  onClick={() => setExpandedServiceTab(expandedServiceTab === svc.id ? null : svc.id)}
                                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-all ${expandedServiceTab === svc.id ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                                >
                                  <span className="flex items-center gap-2">
                                    {svc.label}
                                    {(selectedServiceSubOptions[svc.id] || []).length > 0 && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${expandedServiceTab === svc.id ? 'bg-white text-black' : 'bg-black text-white'}`}>
                                        {(selectedServiceSubOptions[svc.id] || []).length}
                                      </span>
                                    )}
                                  </span>
                                  <i className={`ri-arrow-down-s-line transition-transform ${expandedServiceTab === svc.id ? 'rotate-180' : ''}`}></i>
                                </button>
                                {expandedServiceTab === svc.id && (
                                  <div className="px-4 py-3 bg-white">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {svc.subOptions.map((subOption, idx) => (
                                        <label
                                          key={`${svc.id}-sub-${idx}`}
                                          className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer hover:bg-zinc-50 p-1.5 rounded"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={(selectedServiceSubOptions[svc.id] || []).includes(subOption)}
                                            onChange={(e) => handleServiceSubOptionChange(svc.id, subOption, e.target.checked)}
                                            className="w-3.5 h-3.5 accent-black"
                                          />
                                          {subOption}
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className='col-span-2 md:col-span-1'>
                    <label className='text-sm dark:text-black font-medium font-sans'>Preferred Engagement</label>
                    <div className='bg-zinc-100 px-1 border border-zinc-200'>
                      <select
                        id="entityType"
                        value={preferred_engagement}
                        onChange={(e) => setPreferred(e.target.value)}
                        className='bg-zinc-100 outline-0 py-2.5 px-3 w-full dark:text-black'
                      >
                        <option value="Direct">Direct</option>
                        <option value="Reseller">Reseller</option>
                        <option value="Accelerator">Accelerator</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="col-span-2 md:col-span-1">
                    <label htmlFor="businesscert" className="text-sm dark:text-black font-medium font-sans">
                      {partnerType === 'service' ? 'Upload Services Certifications' : 'Business Certification'}
                    </label>
                    <label
                      htmlFor="businesscert"
                      className="cursor-pointer text-sm dark:text-black font-medium font-sans text-zinc-400 border py-2.5 px-3 w-full text-center border-dashed flex justify-center"
                    >
                      <div className="flex items-center">
                        <Image
                          src="/assests/upload.png"
                          alt="upload"
                          width={14}
                          height={14}
                          className="me-1"
                        />
                        Upload
                      </div>
                    </label>
                    <input
                      type="file"
                      id="businesscert"
                      className="hidden"
                      onChange={handleBusinessCertChange}
                    />
                    {errors.businessCert && (
                      <p className="text-red-500 text-sm mt-1">{errors.businessCert}</p>
                    )}
                    {businessCert && (
                      <div className="mt-1 flex items-center justify-between px-3 py-2 rounded">
                        <p className="text-sm text-zinc-700 truncate">
                          <i className="ri-checkbox-circle-fill text-green-400"></i> {businessCertName}
                        </p>
                        <button
                          onClick={removeBusinessCert}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <i className="ri-delete-bin-6-line"></i>
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <div className='flex'>
                      <div className='me-2'>
                        <input
                          type="checkbox"
                          className="peer/terms hidden"
                          checked={!!neozaar_tc}
                          onChange={(e) => setNeozaartc(e.target.checked)}
                          id="treamscondition"
                        />
                        <label
                          htmlFor='treamscondition'
                          className={`block bg-zinc-100 w-5 h-5 border ${errors.neozaar_tc ? 'border-red-200' : 'border-zinc-200'} peer-checked/terms:hidden`}
                        ></label>
                        <label
                          htmlFor='treamscondition' className='hidden justify-center items-center bg-black w-5 h-5 border border-black  peer-checked/terms:flex'><i className="ri-check-line text-white"></i></label>
                      </div>
                      <label htmlFor="termsCondition" className="text-sm dark:text-black">
                        I agree to the{" "}
                        <a href="/terms-of-use" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                          Terms of Use
                        </a>{" "}
                        and consent to the collection and use of my data as outlined in the{" "}
                        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                          Privacy Policy
                        </a>.
                      </label>
                    </div>
                    {errors.neozaar_tc && <p className="text-red-500 text-sm mt-1">{errors.neozaar_tc}</p>}
                  </div>
                  
                  <div className="col-span-2">
                    <div className='flex '>
                      <div className='me-2'>
                        <input type="checkbox" className=' peer/agree hidden' onChange={(e) => setDataPrivacy(e.target.checked)} checked={!!data_privacy} id="agree" />
                        <label htmlFor='agree' className={`block  bg-zinc-100  ${errors.data_privacy ? 'border-red-200' : 'border-zinc-200'} w-5 h-5 border  peer-checked/agree:hidden`}></label>
                        <label htmlFor='agree' className='hidden justify-center items-center bg-black w-5 h-5 border border-black  peer-checked/agree:flex'><i className="ri-check-line text-white"></i></label>
                      </div>
                      <label htmlFor='agree' className='text-sm dark:text-black'>I have read and agree to the Privacy Policy and consent to the use of my data for the following purposes . </label>
                    </div>
                    <ul className=' ms-10 mt-2 text-sm font-sans text-zinc-500 list-disc'>
                      <li>To provide me with the requested service.</li>
                      <li>To send me product updates and marketing communications.</li>
                      <li>To improve my user experience on this website.</li>
                      <li>To share anonymized data with third-party partners for analytics.</li>
                    </ul>
                    {errors.data_privacy && <p className="text-red-500 text-sm mt-1">{errors.data_privacy}</p>}
                  </div>
                </>
              )}

              <div className="flex col-span-2 gap-4 justify-end mt-6">
                {step > 1 && partnerType !== 'revshare' && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-4 py-2 cursor-pointer w-24 h-10 bg-zinc-200 rounded-3xl text-black"
                  >
                    Back
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    partnerType === 'revshare'
                      ? handleSubmit
                      : step === 3
                        ? handleSubmit
                        : handleNext
                  }
                  disabled={loading}
                  className={`w-32 h-10 font-sans font-semibold text-md rounded-3xl text-white
                    ${loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#f79331] via-[#e25c08] to-[#e25c08] cursor-pointer"
                    }`}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span> Submitting...
                    </>
                  ) : (partnerType === 'revshare' || step === 3) ? (
                    "Submit"
                  ) : (
                    <>
                      Next&nbsp;&nbsp;<i className="ri-arrow-right-line"></i>
                    </>
                  )}
                </button>
              </div>
            </form>
      </div>
      <Toaster position="top-right" />
    </>
  );
}