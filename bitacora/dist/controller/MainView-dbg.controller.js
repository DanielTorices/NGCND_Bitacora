sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("bitacora.controller.MainView", {

        onInit: function () {
            this.getView().setBusy(true);

            // INICIALIZAR MODELO PARA LA TABLA
            this.getView().setModel(new JSONModel({ entries: [] }), "logModel");

            this._loadUserData();
            this._loadUserLogs(); // LLAMAR A LA CARGA DE REGISTROS
        },

        /**
         * Carga la información del usuario autenticado.
         */
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
                });
        },
        
        /**
         * NUEVA FUNCIÓN: Carga los registros de la semana para el usuario loggeado.
         */
        _loadUserLogs: function () {
            const oLogModel = this.getView().getModel("logModel");
            const sApiUrl = "https://bitacorangcnd.azurewebsites.net/api/bitacora/semana";

            this.getView().setBusy(true);

            fetch(sApiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error("No se pudieron cargar los registros de la bitácora.");
                    }
                    return response.json();
                })
                .then(data => {
                    oLogModel.setData({ entries: data });
                })
                .catch(error => {
                    console.error("Error al cargar los registros:", error);
                    MessageToast.show(error.message);
                })
                .finally(() => {
                    this.getView().setBusy(false);
                });
        },

        onSave: function () {
            const oView = this.getView();
            const sFecha = oView.byId("dpFecha").getValue();
            // --- IDs CORREGIDOS ---
            const sCliente = oView.byId("clienteInput").getValue(); 
            const sProyecto = oView.byId("proyectoInput").getValue();
            // --------------------
            const sActividad = oView.byId("txtActividad").getValue();
            const fHoras = oView.byId("siHoras").getValue();

            if (!sFecha || !sCliente || !sProyecto || !sActividad) {
                MessageToast.show("Por favor, complete todos los campos requeridos.");
                return;
            }

            const oNewEntry = {
                fecha: sFecha,
                clienteId: sCliente,
                proyectoId: sProyecto,
                actividad: sActividad,
                horas: fHoras
            };
            
            const sApiUrl = "https://bitacorangcnd.azurewebsites.net/api/bitacora";

            oView.setBusy(true);

            fetch(sApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oNewEntry)
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => { 
                        throw new Error(`Error del servidor: ${response.status} ${response.statusText} - ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                MessageBox.success("Registro de bitácora guardado exitosamente.", {
                    onClose: () => {
                        this.onCancel();
                        this._loadUserLogs(); // <-- ACTUALIZAR LA TABLA
                    }
                });
            })
            .catch(error => {
                MessageBox.error("Ocurrió un error al intentar guardar el registro.\n\n" + error.message);
                console.error("Error en el POST:", error);
            })
            .finally(() => {
                oView.setBusy(false);
            });
        },

        onCancel: function () {
            this.getView().byId("dpFecha").setValue("");
            this.getView().byId("clienteInput").setValue("");
            this.getView().byId("proyectoInput").setValue("");
            this.getView().byId("txtActividad").setValue("");
            this.getView().byId("siHoras").setValue(1);
        }
    });
});