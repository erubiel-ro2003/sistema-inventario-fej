/**
 * devolucion controller
 */
import { getUserWithTenant } from '../../../utils/security';
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::devolucion.devolucion',({strapi})=>({

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

    const entity = await strapi.db.query('api::devolucion.devolucion').findOne({
      where: { documentId:id, tenant: user.tenant.id } 
    });

    if (!entity) return ctx.notFound();

    return super.findOne(ctx);
  },

  async create(ctx) {

    const user = await getUserWithTenant(ctx, strapi);
  
    if (!user || !user.tenant) return ctx.unauthorized();

    const { data } = ctx.request.body;

    if (data.producto) {
       const validProduct = await strapi.db.query('api::producto.producto').findOne({
          where: {
             id: data.producto, 
             tenant: user.tenant.id 
          }
       });
       if (!validProduct) return ctx.badRequest("El producto no existe o no pertenece a tu organización");
    }
    ctx.request.body.data = {
      ...data,
      tenant: user.tenant.id
    };

    return super.create(ctx);
  },

  async update(ctx) {

    const user = await getUserWithTenant(ctx, strapi);
    
    if (!user || !user.tenant) return ctx.unauthorized();

    const { id } = ctx.params;
    const { data } = ctx.request.body;

    const existingEntity = await strapi.db.query('api::devolucion.devolucion').findOne({
        where: { documentId:id, tenant: user.tenant.id }
    });

    if (!existingEntity) return ctx.unauthorized("No puedes editar devoluciones de otra organización.");

    if (data.producto) {
        const validProduct = await strapi.db.query('api::producto.producto').findOne({
            where: {
                id: data.producto,
                tenant: user.tenant.id
            }
        });
        if (!validProduct) return ctx.badRequest("No puedes asignar un producto de otra organización a esta devolución.");
    }

    return super.update(ctx);
  },
  async delete(ctx) {
    const user = await getUserWithTenant(ctx, strapi);
    
     if (!user || !user.tenant) return ctx.unauthorized();

     const { id } = ctx.params;

     const entity = await strapi.db.query('api::devolucion.devolucion').findOne({
        where: { documentId:id, tenant: user.tenant.id }
    });

    if (!entity) return ctx.unauthorized("No puedes eliminar devoluciones de otra organización.");

    return super.delete(ctx);
  }
}));
