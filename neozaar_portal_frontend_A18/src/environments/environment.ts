export const environment = {
    production: false,
    envName: 'dev',
    baseHref: '/app/',
    // apiUrl: 'http://72.61.251.15/api/',
    // frontendUrl:'http://72.61.251.15/',
    apiUrl: 'http://localhost:5000/api/',
    // Port 3000 is used by another local Next.js project on this workstation.
    // NeoZaar's local portal runs on 3001 and hands authenticated users back here.
    frontendUrl:'http://localhost:3001/',
    enableLogs: true,
    enableDebugTools: true,
};
