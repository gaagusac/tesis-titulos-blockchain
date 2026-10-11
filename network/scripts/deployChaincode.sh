#!/bin/bash

echo "================================================================="
echo " Desplegando Chaincode 'titulo' (Go) en Hyperledger Fabric v2.5"
echo "================================================================="

# Variables de configuración del canal y chaincode
CHANNEL_NAME="canal-titulos"
CC_NAME="titulo"
CC_VERSION="1.0"
CC_SEQUENCE="1"
CC_SRC_PATH="/opt/gopath/src/github.com/chaincode/titulo"
PACKAGE_LABEL="${CC_NAME}_${CC_VERSION}"

# 1. Empaquetar el código del contrato inteligente
echo "[1/5] Empaquetando el chaincode Go..."
docker exec peer0.ingenieria.usac.edu.gt \
    peer lifecycle chaincode package /opt/gopath/src/github.com/chaincode/${CC_NAME}.tar.gz \
     --path ${CC_SRC_PATH} \
     --lang golang \
     --label ${PACKAGE_LABEL}

# 2. Instalar el paquete .tar.gz en el peer0
echo "[2/5] Instalando paquete en peer0.ingenieria.usac.edu.gt..."
docker exec peer0.ingenieria.usac.edu.gt \
    peer lifecycle chaincode install /opt/gopath/src/github.com/chaincode/${CC_NAME}.tar.gz

# 3. Obtener dinámicamente el Package ID asignado por el peer
echo "[3/5] Consultando Package ID instalado..."
PACKAGE_ID=$(docker exec peer0.ingenieria.usac.edu.gt peer lifecycle chaincode queryinstalled | grep "${PACKAGE_LABEL}" | sed -n 's/.*Package ID: \\(.*\\), Label:.*/\1/p')

echo " -> Package ID identificado: ${PACKAGE_ID}"

# 4. Aprobar la definición del chaincode para la organización IngenieriaMSP
echo "[4/5] Aprobando definición de chaincode para IngenieriaMSP..."
docker exec peer0.ingenieria.usac.edu.gt \
    peer lifecycle chaincode approveformyorg \
    -o orderer.usac.edu.gt:7050 \
    --channelID ${CHANNEL_NAME} \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${CC_SEQUENCE}

# 5. Confirmar y asentar (Commit) la definición en el libro mayor
echo "[5/5] Realizando Commit de la definición en el canal '${CHANNEL_NAME}'..."
docker exec peer0.ingenieria.usac.edu.gt \
    peer lifecycle chaincode commit \
    -o orderer.usac.edu.gt:7050 \
    --channelID ${CHANNEL_NAME} \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --sequence ${CC_SEQUENCE}

echo "================================================================="
echo " ¡Chaincode '${CC_NAME}' desplegado y listo para emitir títulos!"
echo "================================================================="

