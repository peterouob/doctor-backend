# Agent Instructions: doctor-backend

This repository contains the backend for a medical ASR (Automatic Speech Recognition) and doctor assistance system. It is primarily written in Go, with some Python scripts for AI model handling and Triton Inference Server integration.

## 🛠 Build, Lint, and Test Commands

### Go Backend
- **Build**: `go build -o doctor main.go`
- **Run**: `go run main.go`
- **Test All**: `go test ./...`
- **Test Single Package**: `go test -v ./pkg/verify`
- **Test Single Function**: `go test -v ./pkg/verify -run TestTokenVerify`
- **Lint/Format**:
  - `go fmt ./...`
  - `go vet ./...`
- **Tidy Dependencies**: `go mod tidy`

### Python Tools & AI Models
- **Activate Venv**: `source tools/venv/bin/activate`
- **Download Models**: `python tools/download_model.py`
- **Run Triton Model**: Managed by Triton Inference Server (see `triton.Dockerfile`).

### Protobuf Generation
If you modify `.proto` files in `protobuf/triton/`:
```bash
protoc --go_out=. --go-grpc_out=. protobuf/triton/*.proto
```

### Triton Configuration
- Triton model configurations are stored in `ai_model_repo/*/config.pbtxt`.
- When adding a new model, ensure the `config.pbtxt` correctly defines the input/output shapes and types matching the Python model.

---

## 📏 Code Style Guidelines

### Go Coding Standards
- **Naming Conventions**:
  - Exported functions, structs, and variables: `PascalCase`.
  - Unexported functions, structs, and variables: `camelCase`.
  - Receiver names: Short (1-3 letters), e.g., `func (c *TritonClient) ...`.
  - Package names: lowercase, single word.
- **Imports**:
  - Group imports into three blocks separated by newlines:
    1. Standard library
    2. Third-party libraries
    3. Internal project packages
- **Error Handling**:
  - Always check for errors: `if err != nil { ... }`.
  - Return errors to callers rather than panicking, except in `main.go` or critical database initialization.
  - Wrap errors with context if possible: `fmt.Errorf("failed to connect: %w", err)`.
- **Concurrency**:
  - Use `context.Context` for cancellation and timeouts in long-running operations.
  - Prefer channels for communication between goroutines (see `services/asr/websocket.go`).
- **GORM Models**:
  - Define models in the `model/` directory.
  - Use GORM tags for database schema mapping.

### Python Coding Standards (AI/Triton)
- **Style**: Follow PEP 8.
- **Triton Models**:
  - Implement `initialize`, `execute`, and `finalize` methods in `TritonPythonModel` classes.
  - Use `triton_python_backend_utils` for interacting with Triton.
  - Use `torch` and `transformers` for inference.
- **Typing**: Use type hints where possible to improve readability for agents.
- **Environment**: Always use the provided virtual environment in `tools/venv`.

---

## 🏗 Project Architecture

- `main.go`: Application entry point, initializes DB and Cache.
- `router/`: Defines HTTP and WebSocket routes using Gin.
- `services/`: Contains business logic for ASR, doctor management, and patient agents.
- `pkg/`: Reusable utility packages (Auth, Kafka, Configs).
- `model/`: GORM database models and shared data structures.
- `database/`: Connection logic for MySQL and Redis.
- `protobuf/`: gRPC service definitions for Triton communication.
- `ai_model_repo/`: Model configurations and Python scripts for Triton.

---

## 🔒 Security Best Practices
- **Secrets**: NEVER hardcode API keys or credentials. Use `pkg/configs` to manage environment variables.
- **JWT**: Authentication is handled via `pkg/middleware/auth.go`. Always apply `AuthByJWT()` to protected routes.
- **CORS**: Middleware is available in `pkg/middleware/auth.go`.

---

## 🤖 Agent Workflow
1. **Search**: Use `grep` or `glob` to find relevant code before making changes.
2. **Context**: Read existing implementations to ensure consistency with current patterns.
3. **Draft**: Propose changes clearly before applying.
4. **Verify**: Run `go fmt` and `go vet` after any modification. Run tests if available.

---

## 📋 Example: Adding a new Service
1. Define the data model in `model/`.
2. Implement the logic in a new directory under `services/`.
3. Register the service in `router/router.go`.
4. Ensure all errors are handled and logged correctly.

---

## 📝 Example: Go Error Handling Pattern
```go
func DoSomething(id string) error {
    result, err := db.Db.Where("id = ?", id).First(&model.Something{}).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return fmt.Errorf("record not found: %w", err)
        }
        return fmt.Errorf("database error: %w", err)
    }
    return nil
}
```

---

## 📦 Example: Go Import Pattern
```go
import (
    "context"
    "fmt"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"

    "github.com/peterouob/doctor-backend/model"
)
```

---

## 🧪 Example: Running a Single Test
```bash
go test -v ./pkg/verify -run TestTokenVerify
```
If you are testing a package with many files, you can specify the file:
```bash
go test -v ./pkg/verify/token_test.go ./pkg/verify/token.go
```

---

*Note: This file is intended for agent consumption to maintain high-quality code and consistency across the repository.*
