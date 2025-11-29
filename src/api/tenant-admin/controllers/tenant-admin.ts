import { Context } from "koa";
import { yup, errors } from "@strapi/utils";

const userCreationSchema = yup.object({
  username: yup.string().required(),
  email: yup.string().email().required(),
  password: yup.string().required().min(8),
  roleName: yup.string().required(),
});
const userUpdateSchema = yup.object({
  username:yup.string(),
  email:yup.string(),
  password:yup.string().min(8),
  role:yup.string(),
});

export default {
  async listTenantUsers(ctx: Context) {
    const currentAdminId = ctx.state.user.id;
    const adminUser: any = await strapi.db.query("plugin::users-permissions.user").findOne({
    where: { id: currentAdminId },
    populate: { tenant: true }
  });
    if (!adminUser || !adminUser.tenant) {
      console.log("here bug");
      console.log(adminUser , adminUser.tenant)
      return ctx.forbidden("no perteneces a una organizacion");
    }
    const adminTenantId = adminUser.tenant.id;
    try {
      const users = await strapi.entityService.findMany(
        "plugin::users-permissions.user",
        {
          filters: {
            tenant: {
              id: adminTenantId,
            },
            id:{
              $not:currentAdminId,
            },
          },
          populate: { role: true },
        }
      );

      ctx.send(users);
    } catch (error) {
      return ctx.internalServerError(
        "error al listar usuarios de tu organizacion",
        { error: error.message }
      );
    }
  },
  async createTenantUser(ctx: Context) {
    const adminId = ctx.state.user.id;

    const adminUser: any = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { id: adminId },
        populate: { tenant: true }, 
      });
    if (!adminUser || !adminUser.tenant) {
      return ctx.forbidden("no perteneces a una organizacion");
    }
    const adminTenantId = adminUser.tenant.id;
    let body;
    try {
      body = await userCreationSchema.validate(ctx.request.body, {
        abortEarly: false,
      });
    } catch (error) {
      return ctx.badRequest(error.message, { errors: error.errors });
    }

    const { username, email, password, roleName } = body;
    try {
      const userWithSameEmail = await strapi.db
        .query("plugin::users-permissions.user")
        .findOne({
          where: { email: email.toLowerCase() },
        });

      if (userWithSameEmail) {
        return ctx.badRequest("email ya esta ocupado");
      }

      const role = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({
          where: { name: roleName },
        });

      if (!role) {
        return ctx.badRequest(`el rol que usted selecciono no existe`);
      }

      if (role.name == "admin" || role.name == "Super Admin") {
        return ctx.forbidden("no puedes crear otros administradores");
      }

      let newUser;

      await strapi.db.transaction(async () => {
        const tempUser = await strapi.entityService.create(
          "plugin::users-permissions.user",
          {
            data: {
              username: username,
              email: email.toLowerCase(),
              password: password,
              provider: "local",
              confirmed: true,
              blocked: false,
              role: role.id,
            },
          }
        );
        if (!tempUser) {
          throw new Error("no se pudo crear el usuario");
        }
        newUser = await strapi.entityService.update(
          "plugin::users-permissions.user",
          tempUser.id,
          {
            data: {
              tenant: adminTenantId,
            },
          }
        );
        if (!newUser) {
          throw new Error(
            "no se pudo asociar el tenant al usuario creado recientemente"
          );
        }
      });

      ctx.send({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      });
    } catch (error) {
      strapi.log.error(error);
      return ctx.internalServerError("Error al crear usuario", {
        error: error,
      });
    }
  },

  async listTenantRoles(ctx:Context){
      try {
          const roles = await strapi.entityService.findMany("plugin::users-permissions.role",{
            filters:{
              name:{
                $notIn: ["admin","Super admin", "Public", "Authenticated"],
              },
            },
            sort:{name:'asc'},
          });
          ctx.send(roles);
      } catch (error) {
          strapi.log.error(error); 
          return ctx.internalServerError("Error al listar los roles disponibles",
        { error: error.message });
      }
  },
  async deleteTenantUser(ctx:Context){
      const {id} = ctx.params;
      const currentAdminId = ctx.state.user.id;

      try {
        const adminUser : any = await strapi.db.query('plugin::users-permissions.user').findOne({
          where:{id:currentAdminId},
          populate:{tenant:true},
        }) ;
        if(!adminUser || !adminUser.tenant){
            return ctx.forbidden('no tienes permiso para realizar esta accion');
        }
        const adminTenantId = adminUser.tenant.id;
        const targetUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({
          where:{documentId:id},
          populate:{tenant:true}
        });
        if(!targetUser){
          return ctx.notFound('el usuario no existe');
        }

        if(!targetUser.tenant || targetUser.tenant.id !== adminTenantId){
          return ctx.forbidden('no puedes eliminar usuarios de otra empresa');
        }

        if(targetUser.id === adminUser.id){
          return ctx.badRequest('no puedes eliminar tu propia cuenta de administrador');
        }

        await strapi.db.query('plugin::users-permissions.user').delete({
          where:{documentId:targetUser.documentId},
        });
        ctx.send({message:'usuario eliminado correctamente',documentId:id});
      } catch (error) {
        strapi.log.error(error);
      return ctx.internalServerError("Error al eliminar el usuario", {
        error: error.message,
      });
      }
  },
  async updateTenantUser(ctx:Context){
      const {id} = ctx.params;
      const currentAdminId = ctx.state.user.id;

      let body;
      try {
      body = await userUpdateSchema.validate(ctx.request.body, { abortEarly: false });
    } catch (error) {
      return ctx.badRequest(error.message, { errors: error.errors });
    }
    const {username, email, password, role} = body;
    try{
        const adminUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({
          where:{
            id:currentAdminId,
          },
          populate:{tenant:true},
        });
        if(!adminUser || !adminUser.tenant){
          return ctx.badRequest('no tienes permiso');
        }
        const adminTenantId = adminUser.tenant.id;
        const targetUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({
          where:{documentId:id},
          populate:{tenant:true},
        });
        if (!targetUser) {
        return ctx.notFound('El usuario no existe.');
      }

      if (!targetUser.tenant || targetUser.tenant.id !== adminTenantId) {
        return ctx.forbidden('No puedes editar usuarios de otra organización.');
      }

      if (targetUser.id === adminUser.id) {
        return ctx.badRequest('No puedes editar tu propio usuario desde el panel de gestión.');
      }

      const updateData:any = {};
      if(username){
        updateData.username = username;
      }
      if(email && email.toLowerCase() != targetUser.email){
        const userWithSameEmail = await strapi.db.query('plugin::users-permissions.user').findOne({
          where:{email:email.toLowerCase()},
        });
        if(userWithSameEmail){
          return ctx.badRequest('el email ya esta en uso');
        }
        updateData.email = email.toLowerCase();
      }
      if(password){
        updateData.password = password;
      }
      if(role){
          const r = await strapi.db.query('plugin::users-permissions.role').findOne({
            where:{documentId:role},
          });
          if(!r){
            return ctx.badRequest(`El rol "${role}" no existe.`);
          }
          if(r.name === 'admin' || r.name === 'Super Admin' || r.name === 'Authenticated'){
            return ctx.forbidden('No puedes asignar roles de administrador.');
          }
          updateData.role = r.id; 
      }
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', targetUser.id, {
        data: updateData,
      }); 
      ctx.send({
        message: 'Usuario actualizado correctamente',
        user: {
          id: updatedUser.id,
          documentId: updatedUser.documentId,
          username: updatedUser.username,
          email: updatedUser.email,
        }
      });
    }catch(error){
        strapi.log.error(error);
      return ctx.internalServerError("Error al actualizar el usuario", {
        error: error.message,
      });
    }
  }
};
