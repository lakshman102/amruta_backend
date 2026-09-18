# Infrastructure and Deployment

The assignment requires infrastructure as code and containerized deployment.
This repository uses Dockerfile and Docker Compose as the implementation-level infrastructure definitions.

## Components

- `Dockerfile`: multi-stage Node.js 22 container build and non-root runtime.
- `docker-compose.yml`: PostgreSQL and API services with persistent PostgreSQL volume and service dependency.
- `.github/workflows/ci.yml`: CI validation for database, application build, tests, dependency audit, and Docker image build.

## Local container startup

```bash
docker compose up --build
```

The application is exposed on port 3000 and PostgreSQL on port 5432 by the compose configuration.

## Production boundary

The assignment does not specify a cloud provider or orchestration platform. Therefore this repository intentionally does not invent AWS/GCP/Azure/Kubernetes resources. The container and Compose definitions provide reproducible infrastructure primitives that can be deployed through the target environment's approved platform.

Production secrets must be supplied through the deployment environment rather than committed to source control.
