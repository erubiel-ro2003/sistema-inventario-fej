/**
 * producto controller
 */

import { factories } from "@strapi/strapi";

import { getUserWithTenant } from "../../../utils/security";

export default factories.createCoreController(
  "api::producto.producto",

  ({ strapi }) => ({
    async find(ctx) {
      const user = await getUserWithTenant(ctx, strapi);

      if (!user || !user.tenant)
        return ctx.unauthorized("No tienes organización asignada");

      ctx.query.filters = {
        ...((ctx.query.filters as any) || {}),

        tenant: user.tenant.id,
      };

      return super.find(ctx);
    },

    async findOne(ctx) {
      const user = await getUserWithTenant(ctx, strapi);

      if (!user || !user.tenant) return ctx.unauthorized();

      const { id } = ctx.params;

      const entity = await strapi.db.query("api::producto.producto").findOne({
        where: { documentId: id, tenant: user.tenant.id },
      });

      if (!entity) return ctx.notFound();

      return super.findOne(ctx);
    },

    async create(ctx) {
      const user = await getUserWithTenant(ctx, strapi);

      if (!user || !user.tenant) return ctx.unauthorized();

      const { data } = ctx.request.body;

      if (data.categoria) {
        const validCategory = await strapi.db

          .query("api::categoria.categoria")

          .findOne({
            where: {
              id: data.categoria,

              tenant: user.tenant.id,
            },
          });

        if (!validCategory) {
          return ctx.badRequest(
            "La categoría seleccionada no es válida o no pertenece a tu organización."
          );
        }
      }

      ctx.request.body.data = {
        ...data,

        tenant: user.tenant.id,
      };

      return super.create(ctx);
    },

    async update(ctx) {
      const user = await getUserWithTenant(ctx, strapi);

      const { id } = ctx.params;

      const { data } = ctx.request.body;

      const productExists = await strapi.db

        .query("api::producto.producto")

        .findOne({
          where: { documentId: id, tenant: user.tenant.id },
        });

      if (!productExists) return ctx.unauthorized();

      if (data.categoria) {
        const validCategory = await strapi.db

          .query("api::categoria.categoria")

          .findOne({
            where: {
              id: data.categoria,

              tenant: user.tenant.id,
            },
          });

        if (!validCategory) {
          return ctx.badRequest(
            "No puedes asignar una categoría de otra empresa."
          );
        }
      }

      return super.update(ctx);
    },

    async delete(ctx) {
      const user = await getUserWithTenant(ctx, strapi);

      if (!user || !user.tenant)
        return ctx.unauthorized("No tienes permisos de organización.");

      const { id } = ctx.params;

      const entity = await strapi.db.query("api::producto.producto").findOne({
        where: {
          documentId: id,

          tenant: user.tenant.id,
        },
      });

      if (!entity) {
        return ctx.unauthorized(
          "No puedes eliminar este producto: no existe o no pertenece a tu organización."
        );
      }

      return super.delete(ctx);
    },
  })
);
/**
 * producto controller
 */
