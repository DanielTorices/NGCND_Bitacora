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
                });
        },

        onSave: function () {
            const oView = this.getView();
            const sFecha = oView.byId("dpFecha").getValue();
            // --- CAMBIO AQUÍ: Leer el valor de los campos de texto ---
            const sCliente = oView.byId("clienteInput").getValue(); 
            const sProyecto = oView.byId("proyectoInput").getValue();
            // --------------------------------------------------------
            const sActividad = oView.byId("txtActividad").getValue();
            const fHoras = oView.byId("siHoras").getValue();

            if (!sFecha || !sCliente || !sProyecto || !sActividad) {
                MessageToast.show("Por favor, complete todos los campos requeridos.");
                return;
            }

            const oNewEntry = {
                fecha: sFecha,
                // --- CAMBIO AQUÍ: Enviar los valores de texto ---
                clienteId: sCliente,
                proyectoId: sProyecto,
                // ---------------------------------------------
                actividad: sActividad,
                horas: fHoras
            };
            
            const sApiUrl = "https://ngncdbitacora.azurewebsites.net/api/bitacora";

            oView.setBusy(true);

            fetch(sApiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oNewEntry)
            })
            .then(response => {
                if (!response.ok) {
                    // Intenta leer el cuerpo del error para más detalles
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
            // --- CAMBIO AQUÍ: Limpiar los campos de texto ---
            this.getView().byId("clienteInput").setValue("");
            this.getView().byId("proyectoInput").setValue("");
            // -----------------------------------------------
            this.getView().byId("txtActividad").setValue("");
            this.getView().byId("siHoras").setValue(1);
        }
    });
});