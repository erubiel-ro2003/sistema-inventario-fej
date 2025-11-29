// src/api/tenant-admin/routes/tenant-admin.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/tenant-admin/users',
      handler: 'tenant-admin.createTenantUser', 
    },
    {
      method: 'GET',
      path: '/tenant-admin/users',
      handler: 'tenant-admin.listTenantUsers', 
    },
    {
      method: 'PUT',
      path: '/tenant-admin/users/:id',
      handler: 'tenant-admin.updateTenantUser',
    },
    {
      method: 'DELETE',
      path: '/tenant-admin/users/:id',
      handler: 'tenant-admin.deleteTenantUser',
    },
    {
      method: 'GET',
      path:'/tenant-admin/roles',
      handler:'tenant-admin.listTenantRoles',
    },
  ],
};