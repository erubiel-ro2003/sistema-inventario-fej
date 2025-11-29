import type { Core } from '@strapi/strapi';

export const getUserWithTenant = async (ctx: any, strapi: Core.Strapi) => {
  const user = ctx.state.user;
  if (!user) return null;

  // Verificamos si ya tiene tenant Y si ese tenant tiene documentId
  if (user.tenant && user.tenant.documentId) return user;

  // Si no, recargamos el usuario forzando la población del tenant
  const userFull = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: user.id },
    populate: { 
        tenant: true // Esto debería traer todo el objeto tenant
    }
  });

  if (!userFull || !userFull.tenant) return null;

  // --- PARCHE DE SEGURIDAD ---
  // Si por alguna razón extraña la DB no trajo el documentId del tenant (raro en v5),
  // lo buscamos manualmente por su ID numérico.
  if (!userFull.tenant.documentId) {
      const tenantReal = await strapi.db.query('api::tenant.tenant').findOne({
          where: { id: userFull.tenant.id }
      });
      if (tenantReal) {
          userFull.tenant = tenantReal; // Ahora sí tiene documentId seguro
      }
  }

  ctx.state.user = userFull;
  return userFull;
};