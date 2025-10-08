const { Connection, Request, TYPES } = require("tedious");

const config = {
  server: process.env.DB_SERVER,
  authentication: {
    type: "default",
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  },
  options: {
    encrypt: true,
    database: process.env.DB_DATABASE,
  },
};

// Helper para obtener el email del usuario de forma segura
function getUserInfo(req) {
    const header = req.headers['x-ms-client-principal'];
    if (!header) return 'usuario.anonimo';
    const encoded = Buffer.from(header, 'base64');
    const decoded = encoded.toString('ascii');
    return JSON.parse(decoded).userDetails;
}

module.exports = async function (context, req) {
    const entry = req.body;

    // Validación
    if (!entry || !entry.fecha || !entry.clienteId || !entry.proyectoId || !entry.actividad || !entry.horas) {
        context.res = { status: 400, body: "Faltan campos requeridos." };
        return;
    }

    try {
        const connection = await new Promise((resolve, reject) => {
            const conn = new Connection(config);
            conn.on('connect', err => err ? reject(err) : resolve(conn));
        });

        const userDateString = entry.fecha;
        const serverTime = new Date();
        const finalDateTime = new Date(userDateString.substring(0, 10) + "T" + serverTime.toTimeString().substring(0, 8));

        const sql = `INSERT INTO Bitacora (Fecha, ClienteId, ProyectoId, Actividad, Horas, Usuario) VALUES (@fecha, @clienteId, @proyectoId, @actividad, @horas, @usuario);`;
        
        await new Promise((resolve, reject) => {
            const request = new Request(sql, err => {
                connection.close();
                if (err) return reject(err);
                resolve();
            });

            request.addParameter('fecha', TYPES.DateTime, finalDateTime);
            request.addParameter('clienteId', TYPES.NVarChar, entry.clienteId);
            request.addParameter('proyectoId', TYPES.NVarChar, entry.proyectoId);
            request.addParameter('actividad', TYPES.NVarChar, entry.actividad);
            request.addParameter('horas', TYPES.Decimal, entry.horas);
            request.addParameter('usuario', TYPES.NVarChar, getUserInfo(req));
            
            connection.execSql(request);
        });

        context.res = { status: 201, body: { message: "Registro guardado exitosamente." } };

    } catch (err) {
        console.error(err);
        context.res = { status: 500, body: "Error en el servidor al guardar el registro." };
    }
};