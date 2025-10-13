sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("bitacora.controller.MainView", {

        onInit: function () {
            this.getView().setBusy(true); // Mostrar indicador de carga al iniciar
            

            const oLocalModel = new JSONModel({
                items: []
            });

            oLocalModel.setSizeLimit(1500000);

            this.getView().setModel(oLocalModel, "localModel");
            this.getView().setModel(new JSONModel({ entries: [] }), "logModel");
            this._loadUserData();
            this._loadUserLogs();
            
        },
        _loadUserData: function () {
            const oUserModel = new JSONModel();
            this.getView().setModel(oUserModel, "userModel");

            const sCurrentDate = new Date().toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            fetch("/.auth/me")
                .then(response => response.json())
                .then(data => {
                    const clientPrincipal = data.clientPrincipal;
                    if (clientPrincipal) {
                        oUserModel.setData({
                            name: clientPrincipal.userDetails,
                            role: clientPrincipal.userRoles.join(', '),
                            currentDate: sCurrentDate
                        });
                    } else {
                         // Manejo para desarrollo local o si no hay sesión
                        oUserModel.setData({
                            name: "Usuario Local", role: "Desarrollador", currentDate: sCurrentDate
                        });
                    }
                })
                .catch(error => {
                    console.error("Error al obtener la info del usuario:", error);
                    oUserModel.setData({
                        name: "Usuario Desconocido", role: "N/A", currentDate: sCurrentDate
                    });
                })
                .finally(() => {
                    this.getView().setBusy(false); // Ocultar indicador de carga
                    this._loadUserLogs();
                });
        },
            _loadUserLogs: function () {
            const oView = this.getView();
            const oLogModel = oView.getModel("logModel");
            
            // CAMBIO: Obtenemos el usuario del modelo
            const sUserName = oView.getModel("userModel").getProperty("/name");
            
            if (!sUserName) { return; }

            // CAMBIO: Añadimos el usuario como parámetro en la URL
            const sApiUrl = `https://bitacorangcnd.azurewebsites.net/api/bitacora2?usuario=${encodeURIComponent(sUserName)}`;
            const oLocalModel = this.getView().getModel("localModel");

            oView.setBusy(true);

            fetch(sApiUrl)
                .then(response => response.ok ? response.json() : Promise.reject("Error al cargar registros."))
                .then(data => {
                    
                    oLocalModel.setProperty("/items", data);
                    oLogModel.setData({ entries: data })
                     
                })
                .catch(error => MessageToast.show(error))
                .finally(() => oView.setBusy(false));
        },

               onSave: function () {
            const oView = this.getView();
            const sFecha = oView.byId("dpFecha").getValue();
            const sCliente = oView.byId("clienteInput").getValue(); 
            const sProyecto = oView.byId("proyectoInput").getValue();
            const sActividad = oView.byId("txtActividad").getValue();
            const sComentario= oView.byId("txtComentario").getValue();
            const fHoras = oView.byId("siHoras").getValue();

            if (!sFecha || !sCliente || !sActividad) {
                MessageToast.show("Por favor, complete todos los campos requeridos.");
                return;
            }

            // CAMBIO: Obtenemos el usuario del modelo y lo añadimos al payload
            const sUserName = oView.getModel("userModel").getProperty("/name");

            const oNewEntry = {
                fecha: sFecha,
                clienteId: sCliente,
                proyectoId: sProyecto,
                actividad: sActividad,
                comentario: sComentario,
                horas: fHoras,
                usuario: sUserName // <-- Se añade el usuario al objeto
            };
            
            const sApiUrl = "https://bitacorangcnd.azurewebsites.net/api/bitacora";

            oView.setBusy(true);
            fetch(sApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oNewEntry)
            })
            .then(response => response.ok ? response.json() : response.text().then(text => Promise.reject(text)))
            .then(data => {
                MessageBox.success("Registro guardado exitosamente.", {
                    onClose: () => {
                        this.onCancel();
                        this._loadUserLogs(); // Refrescar la tabla
                    }
                });
            })
            .catch(error => MessageBox.error(`Ocurrió un error: ${error}`))
            .finally(() => oView.setBusy(false));
        },

        onCancel: function () {
            this.getView().byId("dpFecha").setValue("");
            // --- CAMBIO AQUÍ: Limpiar los campos de texto ---
            this.getView().byId("clienteInput").setValue("");
            this.getView().byId("proyectoInput").setValue("");
            this.getView().byId("txtComentario").setValue("");
            // -----------------------------------------------
            this.getView().byId("txtActividad").setValue("");
            this.getView().byId("siHoras").setValue(0.25);
        },

         formatDate: function (date) {
                var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                    pattern: "dd/MM/yyyy",
                    UTC: true
                });
                return oDateFormat.format(date);
            },
    });
});