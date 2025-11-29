/**
 * compra controller
 */
import { getUserWithTenant } from '../../../utils/security';
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::compra.compra',({strapi})=>({
        async find(ctx) {
    const user = await getUserWithTenant(ctx, strapi);
    if (!user || !user.tenant) return ctx.unauthorized("No tienes organización asignada");
    ctx.query.filters = {
      ...(ctx.query.filters as any || {}),
      tenant: user.tenant.id 
    };

    return super.find(ctx);
  },
  async findOne(ctx) {
    const user = await getUserWithTenant(ctx, strapi);
    if (!user || !user.tenant) return ctx.unauthorized();

    const { id } = ctx.params;

    const entity = await strapi.db.query('api::compra.compra').findOne({
      where: { documentId:id, tenant: user.tenant.id } 
    });

    if (!entity) return ctx.notFound();

    return super.findOne(ctx);
  },
  async create(ctx) {
    const user = await getUserWithTenant(ctx, strapi);
    if (!user || !user.tenant) return ctx.unauthorized();

    const { data } = ctx.request.body;

    if (data.productos && Array.isArray(data.productos) && data.productos.length > 0) {
       
       const countValid = await strapi.db.query('api::producto.producto').count({
          where: {
             id: { $in: data.productos }, 
             tenant: user.tenant.id       
          }
       });

       if (countValid !== data.productos.length) {
          return ctx.badRequest("Uno o más productos no pertenecen a tu organización.");
       }
    }

    ctx.request.body.data = {
      ...data,
      tenant: user.tenant.id,
      users_permissions_user: user.id 
    };

    return super.create(ctx);
  },
  async update(ctx) {
    const user = await getUserWithTenant(ctx, strapi);
    if (!user || !user.tenant) return ctx.unauthorized();

    const { id } = ctx.params;
    const { data } = ctx.request.body;

    const existingEntity = await strapi.db.query('api::compra.compra').findOne({
        where: { documentId:id, tenant: user.tenant.id }
    });

    if (!existingEntity) return ctx.unauthorized("No puedes editar compras de otra organización.");

    if (data.productos && Array.isArray(data.productos) && data.productos.length > 0) {
        const countValid = await strapi.db.query('api::producto.producto').count({
           where: {
              id: { $in: data.productos }, 
              tenant: user.tenant.id        
           }
        });
 
        if (countValid !== data.productos.length) {
           return ctx.badRequest("Estás intentando asignar productos de otra organización.");
        }
    }

    return super.update(ctx);
  },
  async delete(ctx) {
    const user = await getUserWithTenant(ctx, strapi);
     if (!user || !user.tenant) return ctx.unauthorized();

     const { id } = ctx.params;

     const entity = await strapi.db.query('api::compra.compra').findOne({
        where: { documentId:id, tenant: user.tenant.id }
    });

    if (!entity) return ctx.unauthorized("No puedes eliminar compras de otra organización.");

    return super.delete(ctx);
  }
}));
