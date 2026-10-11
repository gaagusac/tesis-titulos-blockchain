#!/bin/bash
echo "================================================================="
echo " Iniciando Red Blockchain USAC - Hyperledger Fabric v2.5 + IPFS "
echo "================================================================="

# 1. Detener contenedores previos si existen
echo "[1/3] Limpiando ambiente anterior..."
docker compose -f ../docker-compose.yaml down -v

# 2. Levantar CouchDB, Orderer e IPFS
echo "[2/3] Desplegando Nodos (Orderer, Peer e IPFS)..."
docker compose -f ../docker-compose.yaml up -d orderer.usac.edu.gt ipfs_node peer0.ingenieria.usac.edu.gt

# 3. Verificación final
echo "[3/3] Verificando contenedores activos:"
sleep 10
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "================================================================="
echo " ¡Red ejecutándose exitosamente!"
echo "================================================================="