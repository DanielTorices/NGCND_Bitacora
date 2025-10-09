sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("bitacora.controller.MainView", {

        onInit: function () {
            this.getView().setModel(new JSONModel(), "userModel");
            this.getView().setModel(new JSONModel({ entries: [] }), "logModel");
            
            this.getView().setBusy(true);
            this._loadUserData();
        },

        _loadUserData: function () {
            const oUserModel = this.getView().getModel("userModel");
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
                    // CAMBIO CLAVE: Cargar los logs DESPUÉS de tener el usuario
                    this._loadUserLogs();
                });
        },
        
        _loadUserLogs: function () {
            const oView = this.getView();
            const oLogModel = oView.getModel("logModel");
            const sUserName = oView.getModel("userModel").getProperty("/name");
            
            if (!sUserName || sUserName === "Usuario Desconocido") { 
                oView.setBusy(false);
                return; 
            }

            const sApiUrl = `/api/bitacora2?usuario=${encodeURIComponent(sUserName)}`;

            oView.setBusy(true); // Se activa de nuevo para esta carga específica
            fetch(sApiUrl)
                .then(response => response.ok ? response.json() : Promise.reject("Error al cargar registros."))
                .then(data => oLogModel.setData({ entries: data }))
                .catch(error => MessageToast.show(error))
                .finally(() => oView.setBusy(false));
        },

        onSave: function () {
            const oView = this.getView();
            const sUserName = oView.getModel("userModel").getProperty("/name");
            
            // ... (resto de tu lógica para obtener datos del formulario) ...
            const sFecha = oView.byId("dpFecha").getValue();
            const sCliente = oView.byId("clienteInput").getValue(); 
            const sProyecto = oView.byId("proyectoInput").getValue();
            const sActividad = oView.byId("txtActividad").getValue();
            const fHoras = oView.byId("siHoras").getValue();

            const oNewEntry = {
                fecha: sFecha,
                clienteId: sCliente,
                proyectoId: sProyecto,
                actividad: sActividad,
                horas: fHoras,
                usuario: sUserName
            };
            
            const sApiUrl = "/api/bitacora";

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
            // -----------------------------------------------
            this.getView().byId("txtActividad").setValue("");
            this.getView().byId("siHoras").setValue(0.25);
        }
    });
});