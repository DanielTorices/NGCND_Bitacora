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

            this._loadUserData();
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
                });
        },

        onSave: function () {
            const oView = this.getView();
            const sFecha = oView.byId("dpFecha").getValue();
            const sClienteKey = oView.byId("cmbCliente").getSelectedKey();
            const sProyectoKey = oView.byId("cmbProyecto").getSelectedKey();
            const sActividad = oView.byId("txtActividad").getValue();
            const fHoras = oView.byId("siHoras").getValue();

            if (!sFecha || !sClienteKey || !sProyectoKey || !sActividad) {
                MessageToast.show("Por favor, complete todos los campos requeridos.");
                return;
            }

            const oNewEntry = {
                fecha: sFecha,
                clienteId: sClienteKey,
                proyectoId: sProyectoKey,
                actividad: sActividad,
                horas: fHoras
            };
            
            // Reemplaza con la URL real de tu API en Azure (ej. https://tu-app.azurewebsites.net/api/bitacora)
            const sApiUrl = "https://ngncdbitacora-f7cch7dxh3f3cthc.centralus-01.azurewebsites.net/api/bitacora";

            oView.setBusy(true); // 🔵 Mostrar indicador de carga

            fetch(sApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oNewEntry)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error del servidor: " + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                MessageBox.success("Registro de bitacora guardado exitosamente.", {
                    onClose: () => {
                        this.onCancel();
                    }
                });
            })
            .catch(error => {
                MessageBox.error("Ocurrió un error al intentar guardar el registro.\n\n" + error.message);
                console.error("Error en el POST:", error);
            })
            .finally(() => {
                oView.setBusy(false); // 🔵 Quitar indicador de carga siempre (éxito o error)
            });
        },

        onCancel: function () {
            this.getView().byId("dpFecha").setValue("");
            this.getView().byId("cmbCliente").setSelectedKey("");
            this.getView().byId("cmbProyecto").setSelectedKey("");
            this.getView().byId("txtActividad").setValue("");
            this.getView().byId("siHoras").setValue(1);
        }
    });
});