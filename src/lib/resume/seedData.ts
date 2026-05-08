import type { Resume } from './schema';

// Sample profiles per Plan §6 Phase 1: seed Anurag, Shreya, Shivani.
// IDs inside experience/projects are stable so the editable bullets can
// be matched to their locked facts and to AI output.

export const SAMPLE_PROFILES: Resume[] = [
  {
    profileId: 'vijay-backend',
    locked: {
      name: 'Vijay Wankhede',
      contact: {
        email: 'vijaywankhede959595@gmail.com ',
        phone: '+91 88396 57426',
        location: 'Bengaluru, IN',
        linkedin: 'linkedin.com/in/vijay-wankhede-661765306',
        github: 'github.com/wankhede04',
        website: '',
      },
      education: [
        {
          institution: 'Institute of Engineering and Technology',
          degree: 'B.Eng',
          field: 'Computer Science',
          startYear: '2015',
          endYear: '2019',
          gpa: '7.5',
        },
      ],
      experienceFacts: [
        {
          id: 'exp-fetch',
          title: 'Lead Backend Engineer ',
          company: 'Fetch.AI',
          location: 'Remote',
          startDate: 'Apr 2023',
          endDate: 'Present',
        },
        {
          id: 'exp-instabit',
          title: 'Senior Backend Developer',
          company: 'Instabit',
          location: 'Remote',
          startDate: 'Feb 2021',
          endDate: 'Mar 2023',
        },
        {
          id: 'exp-deqode',
          title: 'Software Developer ',
          company: 'Deqode',
          location: 'India',
          startDate: 'Jul 2019',
          endDate: 'Jan 2021',
        }
      ],
    },
    editable: {
      summary:
        'Accomplished Backend and Web3 Engineer with 7+ years of hands-on experience specializing in Node.js, TypeScript, blockchain systems, and scalable backend architecture. Proven track record building production-ready applications, SDKs, developer tooling, and on-chain infrastructure across Ethereum and Layer-2 networks. Known for a security-first mindset, strong ownership, and focus on delivering clean, well-tested, high-impact software. Passionate about building tools that empower developers and pushing innovation in the blockchain ecosystem.',
      skills: [
        { category: 'Expertise', items: ['NodeJS', 'TypeScript/JavaScript', 'NestJS', 'Express'] },
        { category: 'Web3 & Blockchain', items: ['Ethereum', 'Solidity', 'Polygon', 'Arbitrum', 'EVM Chains', 'Layer2', 'Smart Contracts'] },
        { category: 'Developer Tooling & SDKs', items: ['ethers.js', 'Viem', 'wagmi', 'Web3 wallet integrations', 'custom SDK architecture'] },
        { category: 'Backend & Distributed Systems', items: ['Microservices', 'event-driven systems', 'secure backend services'] },
        { category: 'Databases', items: ['PostgreSQL', 'MongoDB', 'Redis'] },
        { category: 'Cloud, Infra & DevOps', items: ['Docker','AWS (EC2, ECS Fargate, S3, IAM)', 'Google Cloud', 'CI/CD'] },
        { category: 'Programming', items: ['Rust', 'Go', 'Python'] },
        { category: 'Frontend', items: ['ReactJS', 'Redux', 'Tailwind CSS'] },
        { category: 'Monitoring & Observability', items: ['Grafana', 'Prometheus', 'Envoy load balancing'] },
        { category: 'Workstyle & Practices', items: ['Agile', 'Test-driven development', 'Architecture documentation', 'Code reviews'] },
      ],
      experience: [
        {
          id: 'exp-fetch',
          bullets: [
            'Contributed as a Node.js and TypeScript expert, building secure and scalable backend services powering blockchain and on-chain application logic.',
            'Designed and developed internal SDKs and modular developer tooling enabling seamless wallet connections, transaction management, event handling, and Web3 interactions.',
            'Integrated and maintained systems using ethers.js, viem, wagmi, and signing workflows compatible with Ethereum and Layer-2 environments including Arbitrum.',
            'Migrated infrastructure to AWS ECS Fargate, increasing performance by 50% and reducing infrastructure cost by 20%, while improving deployment automation.',
            'Shifted high-load APIs to Node.js for performance-critical paths, improving latency by 30% and enabling scalability under growing traffic.',
            'Improved testing culture by implementing TDD pipelines, integration testing frameworks and code quality gates, increasing module reliability by >90% coverage.',
            'Practised open communication, async documentation, and RFC-style technical proposals for architecture and product planning.',
            'Identified opportunities beyond assigned scope, reducing cloud waste, building internal automation tools, and improving overall engineering efficiency.'
          ],
        },
        {
          id: 'exp-instabit',
          bullets: [
            'Led engineering execution for three blockchain products, overseeing requirements, design, implementation, deployment, and developer enablement.',
            'Designed and shipped API frameworks + SDKs with intuitive, developer-friendly abstractions for blockchain contract interactions and transaction processing.',
            'Built infrastructure for relayer logic, blockchain event indexing, off-chain verification, and secure transaction batching.',
            'Improved operational cost efficiency by 40% through API restructuring and infrastructure optimization.',
            'Created custom blockchain architecture applied across client use cases, improving reliability and smart contract interoperability.',
            'Managed and mentored a team of 5 developers, performing architecture reviews, technical planning, and sprint execution.',
            'Set up and managed AWS + GCP production environments, load balancing, monitoring, and automated deployment pipelines.',  
            'Collaborated across teams to deliver secure systems using best practices in authentication, signing flows, and key management.'
          ],
        },
        {
          id: 'exp-deqode',
          bullets: [
            'Led the backend architecture and development of Deqode’s core blockchain and decentralized applications, driving innovation in decentralized finance (DeFi) and Web3.',
            'Architected and implemented scalable backend systems for the Deqode blockchain, including smart contract deployment, transaction processing, and state management.',
            'Developed and maintained the Deqode SDK, a comprehensive toolkit for building decentralized applications on the Deqode blockchain.',
            'Collaborated with the engineering team to design and implement new features and functionality for the Deqode blockchain and decentralized applications.',
            'Worked closely with the product team to understand user needs and requirements, and to design and implement new features and functionality for the Deqode blockchain and decentralized applications.',
          ],
        },
      ],
      projects: [],
    },
  }
];
