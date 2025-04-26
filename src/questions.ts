// Module: questions.js
// Defines the question flow and subtype mappings for the Get Started panel

// Question sequence, including role, product type & sub-type, then details
export const QUESTIONS = [
  {
    key: 'userRole',
    question: 'Are you a business or an individual?',
    type: 'choice',
    options: ['Business', 'Individual']
  },
  {
    key: 'project Type',
    question: 'What type of product are you looking to build?',
    type: 'choice',
    options: ['Mobile App', 'Web App', 'Website', 'Other']
  },
  {
    key: 'subType',
    question: 'Which category best describes your product?',
    type: 'choice',
    options: [],      // will be populated dynamically based on userRole + project Type
    skipOption: true  // allow skipping this question
  },
  {
    key: 'description',
    // Dynamic prompt: business description for Business, personal goal for Individual
    question: answers => answers.userRole === 'Business'
      ? 'Tell us about your business/idea.'
      : 'What is your personal goal for this product?',
    type: 'textarea',
    example: answers => answers.userRole === 'Business'
      ? 'E.g. We help people track their daily habits and improve productivity.'
      : 'E.g. I want to track my fitness goals and progress.',
    skipOption: false
  },
  {
    key: 'platforms',
    question: 'Which platforms should the app support?',
    type: 'choice',
    options: ['iOS', 'Android', 'Both', 'Web'],
    skipOption: true,
    // Only ask this if the product is a Mobile App
    condition: answers => answers['project Type'] === 'Mobile App'
  },
  {
    key: 'users',
    question: 'Who are your target users?',
    type: 'textarea',
    example: answers => {
      const role = answers.userRole;
      const project = answers['project Type'] || '';
      const subtype = answers.subType || project;
      if (role === 'Business') {
        return `E.g. ${subtype} customers aged 25-40`;
      }
      return `E.g. Individuals interested in ${subtype}`;
    }
  },
  {
    key: 'features',
    question: 'What are the must-have features?',
    type: 'textarea',
    example: answers => {
      const role = answers.userRole;
      const project = answers['project Type'] || '';
      const subtype = answers.subType || project;
      return `E.g. Key features for a ${role} ${project} (${subtype}), such as user authentication, data reporting, and notifications`;
    }
  },
  {
    key: 'constraints',
    question: 'Any deadlines, budgets, or other constraints?',
    type: 'textarea',
    example: answers => {
      const project = answers['project Type'] || '';
      const subtype = answers.subType || project;
      return `E.g. $10k budget, launch by end of Q3, support for ${project} (${subtype})`;
    }
  }
];

// Mapping of sub-type options based on role and project type
export const SUBTYPE_OPTIONS = {
  Business: {
    'Mobile App': ['E-commerce', 'Enterprise', 'Internal Tools', 'Social Networking'],
    'Web App': ['SaaS', 'Dashboard', 'Analytics', 'Workflow Automation'],
    Website: ['Corporate Site', 'Landing Page', 'Blog', 'Marketing Site'],
    Other: ['Plugin', 'Integration', 'API Service', 'Other']
  },
  Individual: {
    'Mobile App': ['Health & Fitness', 'Game', 'Photo/Video', 'Personal Finance'],
    'Web App': ['Portfolio Builder', 'Personal Blog', 'Event Planner', 'Recipe Manager'],
    Website: ['Portfolio', 'Blog', 'Resume Site', 'Hobby Site'],
    Other: ['Custom Tool', 'Script', 'Plugin', 'Other']
  }
};