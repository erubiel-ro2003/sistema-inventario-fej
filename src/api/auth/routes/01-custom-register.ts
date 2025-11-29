export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/registro-organizacion',
      handler: 'auth.registerOrganization', 
      config: {
        auth: false, 
      },
    },
  ],
};