/**
 * categoria controller
 */
import { getUserWithTenant } from '../../../utils/security';
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::categoria.categoria',({strapi})=>({
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

    const entity = await strapi.db.query('api::categoria.categoria').findOne({
      where: { documentId:id, tenant: user.tenant.id }
    });

    if (!entity) return ctx.notFound();

    return super.findOne(ctx);
  },

  async create(ctx) {
    const user = await getUserWithTenant(ctx,strapi);
    if (!user || !user.tenant){
      return ctx.unauthorized();
    } 

    ctx.request.body.data = {
      ...(ctx.request.body.data || {}),
      tenant: user.tenant.id
    };

    return super.create(ctx);
  },
  async update(ctx) {
    const user = await getUserWithTenant(ctx,strapi);
    if (!user || !user.tenant) return ctx.unauthorized();

    const { id } = ctx.params;

    const entity = await strapi.db.query('api::categoria.categoria').findOne({
        where: { documentId:id, tenant: user.tenant.id }
    });

    if (!entity) return ctx.unauthorized("No puedes editar categorías de otra organización.");

    return super.update(ctx);
  },

  async delete(ctx) {
    const user = await getUserWithTenant(ctx,strapi);
     if (!user || !user.tenant) return ctx.unauthorized();

     const { id } = ctx.params;

     const entity = await strapi.db.query('api::categoria.categoria').findOne({
        where: { documentId:id, tenant: user.tenant.id }
    });

    if (!entity) return ctx.unauthorized("No puedes eliminar categorías de otra organización.");

    return super.delete(ctx);
  }
}));
