const { Connection, Request, TYPES } = require("tedious");

const config = { /* ... (copia la misma configuración de arriba) ... */ };
function getUserInfo(req) { /* ... (copia la misma función helper de arriba) ... */ }

module.exports = async function (context, req) {
    const userEmail = getUserInfo(req);
    if (userEmail === 'usuario.anonimo') {
        context.res = { status: 401, body: "Usuario no autenticado." };
        return;
    }

    try {
        const connection = await new Promise((resolve, reject) => { /* ... (igual que arriba) ... */ });

        const sqlQuery = `SELECT ID, Fecha, ClienteId, ProyectoId, Actividad, Horas FROM dbo.Bitacora WHERE Usuario = @usuario AND Fecha >= DATEADD(wk, DATEDIFF(wk, 0, GETUTCDATE()), 0) ORDER BY Fecha DESC;`;
        
        const results = await new Promise((resolve, reject) => {
            const rows = [];
            const request = new Request(sqlQuery, (err, rowCount) => {
                connection.close();
                if (err) return reject(err);
                resolve(rows);
            });
            request.addParameter('usuario', TYPES.NVarChar, userEmail);
            request.on("row", columns => {
                const row = {};
                columns.forEach(col => row[col.metadata.colName] = col.value);
                rows.push(row);
            });
            connection.execSql(request);
        });

        context.res = { status: 200, body: results };

    } catch (err) {
        console.error(err);
        context.res = { status: 500, body: "Error al leer los registros." };
    }
};