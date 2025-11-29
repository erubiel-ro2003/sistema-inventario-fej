import { Context } from 'koa';
import { yup,errors } from '@strapi/utils';

const registrationSchema = yup.object({
  organizationName: yup.string().required('nombre de organizacion es requerido'),
  tenantCorreo: yup.string().email().required('email de su organizacion es requerido'),
  tenantTelefono: yup.string().nullable(),
  tenantDireccion: yup.string().nullable(),
  username: yup.string().required('el nombre es requerido'),
  adminEmail: yup.string().email().required('el email es requerido'),
  password: yup.string().required('Password is required').min(6, 'la contra deberia de tener al menos 6 chars'),
});

export default {
  async registerOrganization(ctx: Context) {
    try {
      const body = ctx.request.body;
      await registrationSchema.validate(body, { abortEarly: false });

      const { organizationName, tenantCorreo, tenantTelefono, tenantDireccion, username, adminEmail, password,empresa_id } = body;

      const userWithSameEmail = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: adminEmail.toLowerCase() },
      });

      if (userWithSameEmail) {
        return ctx.badRequest("una cuenta con este email ya existe xd");
      }

      const role = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { name: 'admin' },
      });

      if (!role) {
        throw new errors.ApplicationError('rol admin no es creado');
      }

      let newTenant;
      let newUser;

      await strapi.db.transaction(async () => {
        newTenant = await strapi.entityService.create('api::tenant.tenant', {
          data: {
            nombre: organizationName,
            correo: tenantCorreo,
            telefono: tenantTelefono,
            direccion: tenantDireccion,
            estado: 'activo',
            empresa_id:empresa_id,
            publishedAt: new Date(),
          },
        });

        if (!newTenant) {
          throw new errors.ApplicationError('tenant no se pudo crear.');
        }

        const tempUser = await strapi.entityService.create('plugin::users-permissions.user', {
          data: {
            username: username.toLowerCase(),
            email: adminEmail.toLowerCase(),
            password: password,
            provider: 'local',
            confirmed: true,
            blocked: false,
            role: role.id,
          },
        });

        if (!tempUser) {
          throw new errors.ApplicationError('no se pudo crear usuario admin (paso 1).');
        }
        
        newUser = await strapi.entityService.update('plugin::users-permissions.user', tempUser.id, {
          data: {
            tenant: newTenant.id,
          },
          populate: { tenant: true }, 
        });

        if (!newUser) {
          throw new errors.ApplicationError('no se pudo enlazar el tenant al usuario (paso 2).');
        }
      });

       const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: newUser.id }); 
      ctx.send({
        jwt,
        user: newUser, 
      });

    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return ctx.badRequest(error.message, { errors: error.errors });
      }
      if (error instanceof errors.ApplicationError) {
        return ctx.badRequest(error.message);
      }
      strapi.log.error(error);  
      return ctx.internalServerError('Un error ocurrió', { error: error.message });
    }
  },
};