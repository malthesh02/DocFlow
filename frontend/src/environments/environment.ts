export const environment = {
  production: false,
  // Relative '/api' seamlessly resolves through Angular proxy in dev
  // or can be swapped to 'http://localhost:8000/api' for direct cross-origin calls
  apiUrl: '/api'
};
