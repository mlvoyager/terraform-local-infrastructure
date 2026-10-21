# Terraform Local Infrastructure

## About the Project

This project is a small DevOps project built to learn and practice Terraform locally, without using any cloud provider.

The infrastructure runs with Docker and includes a Flask backend, a PostgreSQL database, and an Nginx server.

## Technologies Used

- Terraform
- Docker
- Python / Flask
- PostgreSQL
- Nginx

## What I Learned

- Creating Docker resources with Terraform.
- Connecting containers through a Docker network.
- Connecting a Flask application to PostgreSQL.
- Keeping database data persistent using Docker volumes.

## Run the Project

```bash
terraform init
terraform plan
terraform apply
```

To remove the infrastructure:

```bash
terraform destroy
```

