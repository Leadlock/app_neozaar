/**
 * AWS Marketplace product category taxonomy (leaf categories, grouped).
 * Source: the Categories filter facet on aws.amazon.com/marketplace (captured 2026-09-01).
 * A listing may select 1–3 of these. AWS validates the exact string during
 * change-set apply, so these must match verbatim.
 */
export interface AwsCategoryGroup {
  group: string;
  items: string[];
}

export const AWS_MARKETPLACE_CATEGORIES: AwsCategoryGroup[] = [
  {
    group: 'AI & Business Functions',
    items: [
      'AI Agents & Tools',
      'AI Security',
      'Content Creation',
      'Customer Experience Personalization',
      'Customer Support',
      'Data Analysis',
      'Finance & Accounting',
      'IT Support',
      'Legal & Compliance',
      'Observability',
      'Procurement & Supply Chain',
      'Quality Assurance',
      'Research',
      'Sales & Marketing',
      'Scheduling & Coordination',
      'Software Development',
    ],
  },
  {
    group: 'Business Applications',
    items: [
      'Blockchain',
      'Collaboration & Productivity',
      'Contact Center',
      'Content Management',
      'CRM',
      'eCommerce',
      'eLearning',
      'Human Resources',
      'IT Business Management',
      'Project Management',
    ],
  },
  {
    group: 'Cloud Operations',
    items: ['Cloud Financial Management', 'Cloud Governance'],
  },
  {
    group: 'Data Products',
    items: [
      'Automotive Data',
      'Environmental Data',
      'Financial Services Data',
      'Gaming Data',
      'Healthcare & Life Sciences Data',
      'Manufacturing Data',
      'Media & Entertainment Data',
      'Public Sector Data',
      'Resources Data',
      'Retail, Location & Marketing Data',
      'Telecommunications Data',
    ],
  },
  {
    group: 'DevOps',
    items: [
      'Agile Lifecycle Management',
      'Application Development',
      'Application Servers',
      'Application Stacks',
      'Continuous Integration and Continuous Delivery',
      'Infrastructure as Code',
      'Issue & Bug Tracking',
      'Log Analysis',
      'Monitoring',
      'Source Control',
      'Testing',
    ],
  },
  {
    group: 'Industries',
    items: [
      'Automotive',
      'Education & Research',
      'Energy',
      'Financial Services',
      'Healthcare & Life Sciences',
      'Industrial',
      'Media & Entertainment',
    ],
  },
  {
    group: 'Infrastructure Software',
    items: [
      'Backup & Recovery',
      'Data Analytics',
      'High Performance Computing',
      'Migration',
      'Network Infrastructure',
      'Operating Systems',
      'Security',
      'Storage',
    ],
  },
  {
    group: 'IoT',
    items: [
      'Analytics',
      'Applications',
      'Device Connectivity',
      'Device Management',
      'Device Security',
      'Industrial IoT',
      'Smart Home & City',
    ],
  },
  {
    group: 'Machine Learning',
    items: [
      'Audio',
      'Computer Vision',
      'Data Labeling Services',
      'Generative AI',
      'Human Review Services',
      'Image',
      'Intelligent Automation',
      'ML Solutions',
      'Natural Language Processing',
      'Speech Recognition',
      'Structured',
      'Text',
      'Video',
    ],
  },
  {
    group: 'Professional Services',
    items: ['Assessments', 'Implementation', 'Managed Services', 'Premium Support', 'Training'],
  },
];

export const MAX_AWS_CATEGORIES = 3;
