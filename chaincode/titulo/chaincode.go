package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract define la estructura del contrato inteligente de títulos
type SmartContract struct {
	contractapi.Contract
}

// Titulo representa la estructura de metadatos del título universitario
type Titulo struct {
	ID             string `json:"id"`             // Clave compuesta CUI~Carrera
	CUI            string `json:"cui"`            // Código Único de Identificación
	NombreEgresado string `json:"nombreEgresado"` // Nombre completo del graduado
	Carrera        string `json:"carrera"`        // Nombre de la carrera
	FechaEmision   string `json:"fechaEmision"`   // Fecha oficial de emisión
	CID            string `json:"cid"`            // Puntero de almacenamiento en IPFS
	HashSHA256     string `json:"hashSHA256"`     // Hash SHA-256 del archivo PDF
	Estado         string `json:"estado"`         // Estado: VALIDO o REVOCADO
	FechaRegistro  string `json:"fechaRegistro"`  // Timestamp de registro en la blockchain
}

// InitLedger inicializa el contrato inteligente (opcional)
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("Chaincode de Títulos Universitarios USAC inicializado exitosamente.")
	return nil
}

// EmitirTitulo registra un nuevo título inmutable en la blockchain (RF-06: Previene duplicados)
func (s *SmartContract) EmitirTitulo(
	ctx contractapi.TransactionContextInterface,
	cui string,
	nombreEgresado string,
	carrera string,
	fechaEmision string,
	cid string,
	hashSHA256 string) error {

	// 1. Crear clave compuesta para garantizar unicidad por egresado y carrera (RF-06)
	compositeKey, err := ctx.GetStub().CreateCompositeKey("CUI~Carrera", []string{cui, carrera})
	if err != nil {
		return fmt.Errorf("error al generar la clave compuesta: %v", err)
	}

	// 2. Verificar si el título ya existe en el World State
	existe, err := s.ExisteTitulo(ctx, compositeKey)
	if err != nil {
		return err
	}
	if existe {
		return fmt.Errorf("el título para el CUI %s en la carrera %s ya se encuentra registrado", cui, carrera)
	}

	// 3. Crear el objeto Titulo
	titulo := Titulo{
		ID:             compositeKey,
		CUI:            cui,
		NombreEgresado: nombreEgresado,
		Carrera:        carrera,
		FechaEmision:   fechaEmision,
		CID:            cid,
		HashSHA256:     hashSHA256,
		Estado:         "VALIDO",
		FechaRegistro:  time.Now().Format(time.RFC3339),
	}

	// 4. serializar a JSON
	tituloJSON, err := json.Marshal(titulo)
	if err != nil {
		return fmt.Errorf("error al serializar el título: %v", err)
	}

	// 5. Guardar en el World State
	err = ctx.GetStub().PutState(compositeKey, tituloJSON)
	if err != nil {
		return fmt.Errorf("error al guardar la transacción en el ledger: %v", err)
	}
	return nil
}

// ConsultarTitulo obtiene los metadatos de un título mediante su clave compuesta
func (s *SmartContract) ConsultarTitulo(ctx contractapi.TransactionContextInterface, compositeKey string) (*Titulo, error) {
	tituloJSON, err := ctx.GetStub().GetState(compositeKey)
	if err != nil {
		return nil, fmt.Errorf("error al leer el estado del ledger: %v", err)
	}
	if tituloJSON == nil {
		return nil, fmt.Errorf("el título solicitado no existe en el registro")
	}
	var titulo Titulo
	err = json.Unmarshal(tituloJSON, &titulo)
	if err != nil {
		return nil, err
	}
	return &titulo, nil
}

// VerificarTituloPorCUIYCarrera permite consultar un título ingresando el CUI y la Carrera
func (s *SmartContract) VerificarTituloPorCUIYCarrera(ctx contractapi.TransactionContextInterface, cui string, carrera string) (*Titulo, error) {
	compositeKey, err := ctx.GetStub().CreateCompositeKey("CUI~Carrera", []string{cui, carrera})
	if err != nil {
		return nil, fmt.Errorf("error al generar la clave compuesta de búsqueda: %v", err)
	}
	return s.ConsultarTitulo(ctx, compositeKey)
}

// ExisteTitulo comprueba si una clave ya está asentada en el World State
func (s *SmartContract) ExisteTitulo(ctx contractapi.TransactionContextInterface, compositeKey string) (bool, error) {
	tituloJSON, err := ctx.GetStub().GetState(compositeKey)
	if err != nil {
		return false, fmt.Errorf("error al leer del ledger: %v", err)
	}
	return tituloJSON != nil, nil
}

// ObtenerTodosLosTitulos recupera el listado completo de títulos asentados en el World State
func (s *SmartContract) ObtenerTodosLosTitulos(ctx contractapi.TransactionContextInterface) ([]*Titulo, error) {
	// 1. Obtener un iterador para todas las claves compuestas "CUI\~Carrera"
	resultsIterator, err := ctx.GetStub().GetStateByPartialCompositeKey("CUI~Carrera", []string{})
	if err != nil {
		return nil, fmt.Errorf("error al consultar el iterador de claves en el ledger: %v", err)
	}
	defer resultsIterator.Close()
	var titulos []*Titulo

	//2. Recorrer el iterador y deserializar los JSONs
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("error al leer el siguiente registro del iterador: %v", err)
		}
		var titulo Titulo
		err = json.Unmarshal(response.Value, &titulo)
		if err != nil {
			return nil, fmt.Errorf("error al deserializar los metadatos del título: %v", err)
		}
		titulos = append(titulos, &titulo)
	}

	return titulos, nil
}

// main función principal de entrada para iniciar el chaincode en el contenedor
func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error al crear el chaincode de títulos: %v\\n", err)
		return
	}
	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error al iniciar el chaincode de títulos: %v\\n", err)
	}
}
